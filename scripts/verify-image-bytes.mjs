// Downloads every referenced image and confirms the bytes are a real JPEG or PNG,
// not an HTML error page or a placeholder. Verifies magic bytes and pixel
// dimensions locally, so a 200 response with a wrong body cannot pass.
// Uses only the anon key.
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

const get = async (p) => {
  const res = await fetch(`${URL_BASE}/rest/v1/${p}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  const t = await res.text()
  if (!res.ok) throw new Error(`GET ${p} -> ${res.status} ${t}`)
  return JSON.parse(t)
}

function jpegSize(b) {
  let i = 2
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i += 1; continue }
    const marker = b[i + 1]
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
    }
    i += 2 + b.readUInt16BE(i + 2)
  }
  return null
}

function pngSize(b) {
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

function sniff(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { type: 'image/jpeg', size: jpegSize(b) }
  }
  if (b.length > 24 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: 'image/png', size: pngSize(b) }
  }
  if (b.length > 12 && b.subarray(0, 5).toString('latin1').toLowerCase() === '<html') {
    return { type: 'HTML ERROR PAGE', size: null }
  }
  return { type: `UNKNOWN (${b.subarray(0, 4).toString('hex')})`, size: null }
}

const insects = await get('insects?select=scientific_name,images')
const refs = [...new Set(insects.flatMap((i) => i.images || []))]

const seen = new Map()
for (const i of insects) for (const r of i.images || []) if (!seen.has(r)) seen.set(r, i.scientific_name)

console.log(`checking ${refs.length} unique images across ${insects.length} species\n`)

const rows = []
for (const ref of refs) {
  const url = ref.startsWith('http') ? ref : `${ROOT}/${ref}`
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  const { type, size } = sniff(buf)
  rows.push({ ref: ref.split('/').pop(), species: seen.get(ref), status: res.status, type, bytes: buf.length, ...size })
}

// 300px is the floor for a usable museum thumbnail. Anything below that is
// reported separately rather than failed, because it is a resolution problem to
// re-source, not a broken or placeholder object.
const MIN_WIDTH = 300
const SOFT_WIDTH = 500
const isReal = (r) =>
  r.status === 200 && /image\/(jpeg|png)/.test(r.type) && r.bytes > 10000 && r.w >= MIN_WIDTH

for (const r of rows.sort((a, b) => a.ref.localeCompare(b.ref))) {
  const tag = isReal(r) ? (r.w < SOFT_WIDTH ? 'low ' : 'ok  ') : 'FAIL'
  console.log(
    `${tag} ${String(r.ref).padEnd(30)} ${String(r.type).padEnd(11)} ` +
    `${String(r.bytes).padStart(7)}B  ${r.w}x${r.h}  ${r.species}`,
  )
}

const bad = rows.filter((r) => !isReal(r))
const lowRes = rows.filter((r) => isReal(r) && r.w < SOFT_WIDTH)
const jpeg = rows.filter((r) => r.type === 'image/jpeg').length
const png = rows.filter((r) => r.type === 'image/png').length
const minW = Math.min(...rows.map((r) => r.w))

console.log(`\nreal images: ${rows.length - bad.length}/${rows.length}  (jpeg ${jpeg}, png ${png})`)
console.log(`smallest:    ${minW}px wide`)
if (lowRes.length) {
  console.log(`low-res:     ${lowRes.length} below ${SOFT_WIDTH}px (usable, but small):`)
  for (const r of lowRes) console.log(`  ${r.w}x${r.h} ${r.ref}`)
}
if (bad.length) {
  console.log(`\nunusable (placeholder, error page, or too small):`)
  for (const r of bad) console.log(`  ${r.ref} ${r.status} ${r.type} ${r.w}x${r.h}`)
  process.exitCode = 1
}