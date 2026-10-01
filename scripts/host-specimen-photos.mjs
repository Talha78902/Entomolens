/**
 * Download and publish the 24 re-sourced species photos.
 *
 * Same shape as scripts/host-crop-photos.mjs: download to .cache/specimens-new,
 * sniff magic bytes rather than trusting the extension, and upload to the public
 * `insect-images` bucket. It stops short of updating insects.images — that is
 * scripts/apply-specimen-photos.mjs, which needs the service role key.
 *
 * Objects are written under a `-inat` suffix so a failed run can never leave the
 * live museum pointing at a half-replaced file.
 *
 *   node scripts/host-specimen-photos.mjs            # download only
 *   node scripts/host-specimen-photos.mjs --upload   # download + upload
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const BUCKET = 'insect-images'
const CACHE_DIR = path.resolve('.cache/specimens-new')
const MAX_ATTEMPTS = 5

const env = Object.fromEntries(
  (await fs.readFile('.env', 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
)

const manifest = JSON.parse(await fs.readFile('src/data/specimen-photos.json', 'utf8'))
const shouldUpload = process.argv.includes('--upload')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await fs.mkdir(CACHE_DIR, { recursive: true })

let supabase = null
if (shouldUpload) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('--upload needs SUPABASE_SERVICE_ROLE_KEY in .env. The anon key cannot write to storage.')
  }
  supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Identify the format from the file's own bytes.
 *
 * iNat serves .jpeg, .jpg and .png for the same logical photo depending on the
 * original upload, so the URL's extension is not evidence of anything. Trusting it
 * is how a saved HTML error page ends up published as a .jpg that renders blank.
 */
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' }
  if (
    buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { ext: 'png', type: 'image/png' }
  }
  return null
}

async function download(url, dest) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'))
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * attempt
        console.log(`      ${res.status}, waiting ${Math.round(wait / 1000)}s`)
        await sleep(wait)
        continue
      }
      if (!res.ok) return { error: `HTTP ${res.status}` }
      const buf = Buffer.from(await res.arrayBuffer())
      const kind = sniff(buf)
      if (!kind) return { error: `not an image (${buf.length}B, first bytes ${buf.subarray(0, 4).toString('hex')})` }
      if (buf.length < 10000) return { error: `too small: ${buf.length}B` }
      await fs.writeFile(dest, buf)
      return { bytes: buf.length, type: kind.type, ext: kind.ext }
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) return { error: error.message }
      await sleep(2000 * attempt)
    }
  }
  return { error: 'exhausted retries' }
}

let ok = 0
let failed = 0

for (const [index, spec] of manifest.specimens.entries()) {
  // Derive the object key once, and derive it from `spec` only. A previous
  // version appended the run length to the key and then removed it with a slice,
  // which quietly ate two characters and published "-ina.jpg". Both this script and
  // scripts/apply-specimen-photos.mjs must compute the same string, so the rule
  // lives here and is mirrored literally there.
  const stem = `${String(spec.id).slice(-4)}-${spec.scientific_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-inat`
  const label = spec.common_name.padEnd(30)

  // One download attempt per format. iNat serves the same logical photo as
  // .jpeg, .jpg or .png depending on the original upload, and the manifest URL is
  // whichever it happened to be, so sniffing the bytes decides the real format
  // rather than the URL guessing it.
  const cacheName = `${stem}.jpg`
  let probe = await download(spec.url, path.join(CACHE_DIR, cacheName))
  if (probe.error && /not an image/.test(probe.error)) {
    const asPng = await download(spec.url.replace(/\.jpe?g$/i, '.png'), path.join(CACHE_DIR, cacheName))
    if (asPng.error) {
      console.log(`  [${index + 1}/${manifest.specimens.length}] ${label} SKIP — ${asPng.error}`)
      failed += 1
      continue
    }
    probe = asPng
  } else if (probe.error) {
    console.log(`  [${index + 1}/${manifest.specimens.length}] ${label} SKIP — ${probe.error}`)
    failed += 1
    continue
  }

  // The cache file is always .jpg regardless of the real format; the object key
  // carries the sniffed extension so the bucket stores what the bytes actually are.
  const objectKey = `${stem}.${probe.ext}`
  const file = path.join(CACHE_DIR, cacheName)

  if (shouldUpload) {
    const body = await fs.readFile(file)
    const kind = sniff(body)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectKey, body, { contentType: kind.type, upsert: true, cacheControl: '31536000' })
    if (error) {
      console.log(`  [${index + 1}/${manifest.specimens.length}] ${label} UPLOAD FAILED — ${error.message}`)
      failed += 1
      continue
    }
  }

  ok += 1
  console.log(
    `  [${index + 1}/${manifest.specimens.length}] ${label} ${probe.bytes}B ${probe.type}` +
      `${spec.license === 'cc-by' ? '  cc-by (credit required)' : ''}${shouldUpload ? `  -> ${objectKey}` : ''}`,
  )
  await sleep(700)
}

console.log(`\nready: ${ok}   skipped: ${failed}   cache: ${CACHE_DIR}`)
if (!shouldUpload) console.log('re-run with --upload to publish (needs SUPABASE_SERVICE_ROLE_KEY)')
