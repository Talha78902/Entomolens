/**
 * One-time maintenance script: move curated specimen images off Wikimedia.
 *
 * Why
 * ---
 * `insects.images` points at upload.wikimedia.org. The museum grid requests
 * ~24 of them at once and Wikimedia rate-limits by IP, so a normal page load
 * gets a burst of 429s. Each failure trips the card's onError handler and the
 * grid falls back to "Image coming soon" even though every URL is valid.
 *
 * This copies each image into the project's own public `insect-images` bucket
 * and repoints insects.images at "insect-images/<slug>", which useImageUrl
 * already resolves to a first-party public URL with no third-party limit.
 *
 * Usage
 * -----
 *   node scripts/host-specimen-images.mjs              # download only (cached)
 *   node scripts/host-specimen-images.mjs --upload     # download + upload + repoint
 *
 * --upload needs a key that may write to storage:
 *   SUPABASE_SERVICE_ROLE_KEY in .env  (Supabase dashboard -> Settings -> API)
 *
 * Downloads are cached in .cache/specimens, so re-running after a failure
 * does not re-fetch images it already has. This script is idempotent.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const BUCKET = 'insect-images'
const CACHE_DIR = path.resolve('.cache/specimens')
const DOWNLOAD_DELAY_MS = 1200
const MAX_ATTEMPTS = 6

const env = Object.fromEntries(
  (await fs.readFile('.env', 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [
      line.slice(0, line.indexOf('=')).trim(),
      line.slice(line.indexOf('=') + 1).trim(),
    ]),
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Filesystem-safe key derived from the scientific name, falling back to the id. */
function slugFor(row) {
  const base = (row.scientific_name || row.common_name || row.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'specimen'}-${row.id.slice(-4)}`
}

/**
 * Fetch one image, backing off on 429.
 *
 * Wikimedia answers a too-fast burst with 429 and an optional Retry-After;
 * honouring it is the difference between recovering in seconds and needing a
 * second full pass.
 */
async function download(url, attempts = MAX_ATTEMPTS) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'EntomoLens/1.0 (specimen image migration)' },
      })
      if (response.ok) return Buffer.from(await response.arrayBuffer())

      const retryable = response.status === 429 || response.status >= 500
      if (!retryable || attempt === attempts) {
        throw new Error(`HTTP ${response.status}`)
      }
      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2000 * attempt
      process.stdout.write(`    ${response.status}, waiting ${Math.round(waitMs / 1000)}s\n`)
      await sleep(waitMs)
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('HTTP ')) throw error
      if (attempt === attempts) throw error
      await sleep(2000 * attempt)
    }
  }
  throw new Error('unreachable')
}

const { data: rows, error: listError } = await supabase
  .from('insects')
  .select('id, common_name, scientific_name, images')
  .order('common_name')

if (listError) {
  console.error('Could not read insects:', listError.message)
  process.exit(1)
}
if (!rows?.length) {
  console.error('No insects found. Is the schema seeded?')
  process.exit(1)
}

await fs.mkdir(CACHE_DIR, { recursive: true })

const shouldUpload = process.argv.includes('--upload')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const admin = serviceKey ? createClient(env.VITE_SUPABASE_URL, serviceKey) : null

if (shouldUpload && !admin) {
  console.error(
    '--upload needs SUPABASE_SERVICE_ROLE_KEY in .env\n' +
      '  Supabase dashboard -> Project Settings -> API -> service_role key',
  )
  process.exit(1)
}

console.log(`${rows.length} species. mode: ${shouldUpload ? 'download + upload' : 'download only'}\n`)

const uploaded = []
const skipped = []
let failed = 0

for (const [index, row] of rows.entries()) {
  const source = Array.isArray(row.images) ? row.images[0] : null
  const key = `${slugFor(row)}.jpg`

  if (!source) {
    console.log(`  [${index + 1}/${rows.length}] ${row.common_name} — no source image, skipped`)
    skipped.push(row.common_name)
    continue
  }

  const file = path.join(CACHE_DIR, key)
  let buffer
  try {
    buffer = await fs.readFile(file)
  } catch {
    try {
      buffer = await download(source)
      await fs.writeFile(file, buffer)
    } catch (error) {
      failed++
      console.log(
        `  [${index + 1}/${rows.length}] ${row.common_name} — DOWNLOAD FAILED: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      )
      continue
    }
  }

  if (!admin) {
    console.log(`  [${index + 1}/${rows.length}] ${row.common_name} -> ${key} (${Math.round(buffer.length / 1024)} KB)`)
  } else {
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType: 'image/jpeg', upsert: true })
    if (uploadError) {
      failed++
      console.log(`  [${index + 1}/${rows.length}] ${row.common_name} — UPLOAD FAILED: ${uploadError.message}`)
      continue
    }
    const { error: updateError } = await admin
      .from('insects')
      .update({ images: [`${BUCKET}/${key}`] })
      .eq('id', row.id)
    if (updateError) {
      failed++
      console.log(`  [${index + 1}/${rows.length}] ${row.common_name} — REPOINT FAILED: ${updateError.message}`)
      continue
    }
    uploaded.push(row.common_name)
    console.log(`  [${index + 1}/${rows.length}] ${row.common_name} -> ${BUCKET}/${key}`)
  }

  // Stay under Wikimedia's per-IP burst limit even on a cold cache.
  if (index < rows.length - 1) await sleep(DOWNLOAD_DELAY_MS)
}

console.log(`\ndone. uploaded: ${uploaded.length}  skipped: ${skipped.length}  failed: ${failed}`)
if (!admin) console.log('Cache written to .cache/specimens. Re-run with --upload to publish.')
if (failed > 0) process.exit(1)
