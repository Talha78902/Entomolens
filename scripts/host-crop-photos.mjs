/**
 * Download the sourced crop photos into .cache/specimens-crops and publish them
 * to the public `insect-images` bucket.
 *
 *   node scripts/host-crop-photos.mjs           # download only
 *   node scripts/host-crop-photos.mjs --upload  # also publish (needs service role key)
 *
 * The image type is sniffed from the file's magic bytes, never the extension or
 * the URL, because iNaturalist serves a mix of JPEG and PNG under the same
 * filename convention. Uploading a PNG as image/jpeg leaves a mislabelled object
 * that browsers and CDNs then mis-handle.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const BUCKET = process.env.VITE_SUPABASE_STORAGE_BUCKET || 'insect-images'
const CACHE_DIR = path.resolve('.cache/specimens-crops')
const UA = { 'User-Agent': 'EntomoLens/1.0 (crop photo publishing)' }

const env = Object.fromEntries(
  (await fs.readFile('.env', 'utf8'))
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const URL_BASE = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const upload = process.argv.includes('--upload')

const manifest = JSON.parse(await fs.readFile('src/data/crop-photos.json', 'utf8'))

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sniff(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length > 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png'
  }
  return null
}

await fs.mkdir(CACHE_DIR, { recursive: true })

const entries = []
let failed = 0

for (const [index, crop] of manifest.crops.entries()) {
  const file = `${slug(crop.name)}.jpg`
  const target = path.join(CACHE_DIR, file)

  let bytes = null
  try {
    bytes = await fs.readFile(target)
  } catch {
    // Not cached yet; fall through to download.
  }

  if (!bytes) {
    // iNat's S3 is flaky from here and returns timeouts intermittently, so a
    // single attempt loses an otherwise valid crop. Retry a few times before
    // giving up on one photo.
    const attempts = 4
    for (let attempt = 1; attempt <= attempts && !bytes; attempt += 1) {
      try {
        const res = await fetch(crop.url, { headers: UA, signal: AbortSignal.timeout(60000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < 2000) throw new Error(`suspiciously small (${buf.length}B)`)
        await fs.writeFile(target, buf)
        bytes = buf
      } catch (error) {
        const why = error instanceof Error ? error.message : 'unknown'
        if (attempt === attempts) {
          console.log(`  [${index + 1}/${manifest.crops.length}] ${crop.name.padEnd(11)} download failed after ${attempts} attempts: ${why}`)
          failed += 1
        } else {
          await new Promise((r) => setTimeout(r, 2500 * attempt))
        }
      }
    }
    if (!bytes) continue
  }

  const contentType = sniff(bytes)
  if (!contentType) {
    console.log(`  [${index + 1}/${manifest.crops.length}] ${crop.name.padEnd(11)} not an image (${bytes.length}B)`)
    failed += 1
    continue
  }

  process.stdout.write(`  [${index + 1}/${manifest.crops.length}] ${crop.name.padEnd(11)} ${file.padEnd(18)} ${String(bytes.length).padStart(7)}B ${contentType}\n`)

  if (upload) {
    if (!KEY) {
      console.log('      skipped: SUPABASE_SERVICE_ROLE_KEY not set')
      continue
    }
    const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${file}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: bytes,
    })
    if (!res.ok) {
      console.log(`      upload failed ${res.status} ${await res.text()}`)
      failed += 1
      continue
    }
    console.log(`      published ${BUCKET}/${file}`)
  }

  entries.push({ ...crop, file, contentType })
}

console.log(`\nready: ${entries.length}/${manifest.crops.length}   failed: ${failed}`)
console.log(`cache: ${CACHE_DIR}`)

if (upload) {
  if (!KEY) {
    console.log('\nSUPABASE_SERVICE_ROLE_KEY was not set, so nothing was published.')
  } else {
    console.log('\nRemove SUPABASE_SERVICE_ROLE_KEY from .env and rotate it when you are done.')
  }
}
