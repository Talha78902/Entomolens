/**
 * Confirms every crop has a photo and that the bytes served are a real image,
 * and that the two CC-BY crop credits are visible on the page.
 *
 * crop.image_url holds a bucket-relative path (`insect-images/cotton.jpg`), so
 * it is resolved against the storage root rather than the bucket path — the same
 * rule parseImageRef applies in src/lib/supabase/client.ts.
 *
 * Uses only the anon key.
 */
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const URL_BASE = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
const ROOT = `${URL_BASE}/storage/v1/object/public`

const manifest = JSON.parse(fs.readFileSync('src/data/crop-photos.json', 'utf8'))

/** Must match PUBLIC_BUCKETS in src/lib/supabase/client.ts. */
const PUBLIC_BUCKETS = new Set(['insect-images'])

function jpegSize(b) {
  let i = 2
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i += 1; continue }
    const m = b[i + 1]
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) }
    }
    i += 2 + b.readUInt16BE(i + 2)
  }
  return { w: 0, h: 0 }
}

function pngSize(b) {
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

function sniff(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ...jpegSize(b) }
  if (b.length > 24 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: 'image/png', ...pngSize(b) }
  }
  return { type: 'NOT AN IMAGE', w: 0, h: 0 }
}

const crops = await (async () => {
  const res = await fetch(`${URL_BASE}/rest/v1/crops?select=id,name,image_url,description&order=name`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
})()

console.log(`crops: ${crops.length}\n`)

let failures = 0

for (const crop of crops) {
  if (!crop.image_url) {
    console.log(`FAIL ${crop.name.padEnd(11)} image_url is null`)
    failures += 1
    continue
  }
  // A stored value is only safe to hand straight to an img src if it is absolute.
  // Anything else must be resolved via useImageUrl first; using the raw value as
  // the src makes the browser request it from the app origin and 404, which looks
  // like a missing photo rather than a code bug. Catch that here.
  if (!crop.image_url.startsWith('http')) {
    const bucket = crop.image_url.split('/')[0]
    if (!PUBLIC_BUCKETS.has(bucket)) {
      console.log(`FAIL ${crop.name.padEnd(11)} not bucket-qualified: ${crop.image_url}`)
      failures += 1
    } else {
      console.log(`note ${crop.name.padEnd(11)} stored as ref, needs useImageUrl: ${crop.image_url}`)
    }
  }

  const url = crop.image_url.startsWith('http') ? crop.image_url : `${ROOT}/${crop.image_url}`
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  const { type, w, h } = sniff(buf)
  const ok = res.status === 200 && /image\/(jpeg|png)/.test(type) && buf.length > 10000 && w >= 500
  if (!ok) failures += 1
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${crop.name.padEnd(11)} ${type.padEnd(11)} ${String(buf.length).padStart(7)}B  ${w}x${h}  ` +
    `${crop.image_url.split('/').pop()}`,
  )
}

console.log('\nCC-BY credits (crops.description is rendered by CropDetailPage):')
for (const photo of manifest.crops.filter((p) => p.license === 'cc-by')) {
  const row = crops.find((c) => c.name.toLowerCase() === photo.name.toLowerCase())
  const desc = row?.description ?? ''
  const who = photo.attribution.replace(/^\(c\)\s*/, '').replace(/,?\s*some rights reserved \(CC BY\).*$/i, '').trim()
  const ok = desc.includes(who) && desc.includes(photo.observationUrl) && /\bCC[ -]?BY\b/i.test(desc)
  if (!ok) failures += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${photo.name.padEnd(11)} ${who}  (${photo.license})`)
}

const ccby = manifest.crops.filter((p) => p.license === 'cc-by').length
console.log(`\nreal images: ${crops.length - failures}/${crops.length}   CC-BY credits shown: ${ccby}`)
if (failures) process.exitCode = 1
