/**
 * Download the iNaturalist-sourced photos and host them in the project's own
 * `insect-images` bucket, exactly as scripts/host-specimen-images.mjs does for
 * the original 24 specimens.
 *
 * Why not just point the rows at the iNaturalist CDN?
 * - Hotlinking a third-party CDN puts the museum's uptime in someone else's
 *   hands, which is precisely the failure that made the original Wikimedia
 *   setup fall over with 429s.
 * - species-photos.json records licence and attribution per photo, and that
 *   metadata needs to travel with the image into storage.
 *
 * The script is idempotent: files already present in .cache/specimens-extended
 * are reused, so a re-run after a partial failure costs no extra downloads.
 *
 *   node scripts/host-extended-photos.mjs            # download only (cached)
 *   node scripts/host-extended-photos.mjs --upload   # + publish to the bucket
 *   node scripts/host-extended-photos.mjs --write    # emit species-extended.sql
 *
 * --upload needs a key that may write to storage:
 *   SUPABASE_SERVICE_ROLE_KEY in .env  (Supabase dashboard -> Settings -> API)
 *
 * Database references are set by supabase/migrations/00015_populate_all_orders.sql,
 * not by this script. Upload the files first, then run 00015, so the museum never
 * renders a reference to an object that is not in the bucket yet.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const BUCKET = 'insect-images'
const CACHE_DIR = path.resolve('.cache/specimens-extended')
const MAX_ATTEMPTS = 4
const DOWNLOAD_DELAY_MS = 400

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 'Ctenolepisma longicaudatum' -> 'ctenolepisma-longicaudatum' */
function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Detect the real image type from the magic bytes.
 *
 * iNaturalist serves a mix of JPEG and PNG, and one of the 20 cached files
 * (mantis-religiosa.jpg) is actually a PNG. Uploading it as image/jpeg would
 * leave a mislabelled object in storage, so the type always comes from the
 * bytes and never from the file extension.
 */
function sniffType(bytes) {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  if (bytes.length > 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif'
  }
  return null
}

async function download(url) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'EntomoLens/1.0 (specimen image migration)' },
        signal: AbortSignal.timeout(45000),
      })
      if (res.ok) {
        const type = res.headers.get('content-type') ?? ''
        const bytes = Buffer.from(await res.arrayBuffer())
        // Reject an HTML error page served with a 200, which would otherwise be
        // uploaded to storage and render as a broken image forever.
        if (bytes.length > 2048 && /^image\//.test(type)) {
          return { bytes, type }
        }
        throw new Error(`not an image (${type}, ${bytes.length}B)`)
      }
      const retryable = res.status === 429 || res.status >= 500
      if (!retryable || attempt === MAX_ATTEMPTS) throw new Error(`HTTP ${res.status}`)
      const retryAfter = Number(res.headers.get('retry-after'))
      await sleep(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 1500 * attempt,
      )
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error
      await sleep(1500 * attempt)
    }
  }
  throw new Error('unreachable')
}

const manifest = JSON.parse(await fs.readFile('src/data/species-photos.json', 'utf8'))
const photos = manifest.photos ?? []
if (photos.length === 0) {
  console.error('No photos in src/data/species-photos.json. Run: node scripts/source-species-photos.mjs --write')
  process.exit(1)
}

await fs.mkdir(CACHE_DIR, { recursive: true })

const shouldUpload = process.argv.includes('--upload')
const env = Object.fromEntries(
  (await fs.readFile('.env', 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [
      line.slice(0, line.indexOf('=')).trim(),
      line.slice(line.indexOf('=') + 1).trim(),
    ]),
)

const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (shouldUpload && !serviceKey) {
  console.error(
    '--upload needs SUPABASE_SERVICE_ROLE_KEY in .env\n' +
      '  Supabase dashboard -> Project Settings -> API -> service_role key',
  )
  process.exit(1)
}
const admin = shouldUpload ? createClient(env.VITE_SUPABASE_URL, serviceKey) : null

console.log(`${photos.length} photos. mode: ${shouldUpload ? 'download + upload' : 'download only'}\n`)

const fetched = []
const uploaded = []
let failed = 0

for (const [index, entry] of photos.entries()) {
  const file = `${slug(entry.matched)}.jpg`
  const target = path.join(CACHE_DIR, file)
  let bytes
  try {
    bytes = await fs.readFile(target)
  } catch {
    try {
      const result = await download(entry.url)
      bytes = result.bytes
      await fs.writeFile(target, bytes)
    } catch (error) {
      failed++
      console.log(
        `  [${index + 1}/${photos.length}] ${entry.order.padEnd(20)} FAILED: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      )
      continue
    }
  }

  const contentType = sniffType(bytes)
  if (!contentType) {
    failed++
    console.log(`  [${index + 1}/${photos.length}] ${entry.matched} — not a recognised image`)
    continue
  }

  const label = `${entry.order.padEnd(20)} ${entry.matched.padEnd(28)} ${String(Math.round(bytes.length / 1024)).padStart(4)} KB  ${entry.license}`

  if (admin) {
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(file, bytes, { contentType, upsert: true })
    if (uploadError) {
      failed++
      console.log(`  [${index + 1}/${photos.length}] ${entry.matched} — UPLOAD FAILED: ${uploadError.message}`)
      continue
    }
    uploaded.push(file)
    console.log(`  [${index + 1}/${photos.length}] ${label} -> ${BUCKET}/${file} (${contentType})`)
  } else {
    console.log(`  [${index + 1}/${photos.length}] ${label}`)
  }

  fetched.push({ ...entry, file, bytes: bytes.length, contentType })
  if (index < photos.length - 1) await sleep(DOWNLOAD_DELAY_MS)
}

console.log(`\ndownloaded: ${fetched.length}/${photos.length}  failed: ${failed}`)
console.log(`cache: ${CACHE_DIR}`)

if (admin) {
  console.log(`uploaded: ${uploaded.length}/${photos.length} to ${BUCKET}`)
  console.log('Next: run supabase/migrations/00015_populate_all_orders.sql to create the rows.')
}

if (process.argv.includes('--write')) {
  const out = 'supabase/attribution/species-extended.txt'
  await fs.mkdir('supabase/attribution', { recursive: true })
  const lines = [
    'Generated by scripts/host-extended-photos.mjs --write',
    `${fetched.length} photos from iNaturalist, licences: ${manifest.licences.join(', ')}`,
    '',
    'ATTRIBUTION MANIFEST ONLY. This is NOT a migration and must never be run as SQL.',
    'It lives outside supabase/migrations/ and is not named .sql so no tooling picks it up.',
    'It records the photographer, licence and observation URL for every photo, which is',
    'what the three CC-BY images require.',
    '',
    'To publish:',
    '  node scripts/host-extended-photos.mjs --upload',
    '',
  ]
  for (const f of fetched) {
    lines.push(
      `${f.order}: ${f.matched} | ${f.license} | ${f.attribution} | ${f.observationUrl}`,
      `file: .cache/specimens-extended/${f.file} (${f.contentType})`,
      '',
    )
  }
  await fs.writeFile(out, lines.join('\n'), 'utf8')
  console.log(`\nwrote ${out} (${fetched.length} entries)`)
}
if (failed > 0) process.exit(1)
