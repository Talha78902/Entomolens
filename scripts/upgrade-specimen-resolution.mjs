// Re-downloads the six 330px Wikimedia thumbnails at a usable size.
//
// 00012 seeded 18 images at 500px but 6 at 330px, which is too small for the
// museum grid. Wikimedia serves any thumbnail width from the same original, so
// this rewrites only the width segment and leaves the rest of the URL alone.
//
//   node scripts/upgrade-specimen-resolution.mjs           # download to .cache/specimens
//   node scripts/upgrade-specimen-resolution.mjs --upload  # also publish to the bucket
//
// --upload needs SUPABASE_SERVICE_ROLE_KEY in .env. Remove it afterwards.
import fs from 'node:fs'
import path from 'node:path'

const TARGET_WIDTH = 800
const BUCKET = 'insect-images'
const CACHE_DIR = path.resolve('.cache/specimens')
const MIGRATION = 'supabase/migrations/00012_security_hardening.sql'

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
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const upload = process.argv.includes('--upload')

const original = fs.readFileSync(MIGRATION, 'utf8')
const stale = [...original.matchAll(/\('([0-9a-f-]{36})',\s*'(https:\/\/upload\.wikimedia\.org\/[^']*?)\/(\d+)px-([^/']+)'/g)]
  .filter((m) => Number(m[3]) < TARGET_WIDTH)

if (stale.length === 0) {
  console.log('no thumbnails below the target width')
  process.exit(0)
}
console.log(`${stale.length} thumbnails below ${TARGET_WIDTH}px\n`)

function sniff(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length > 24 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  return null
}

const rewritten = []
for (const [, id, url, width, file] of stale) {
  const want = url.replace(/\/\d+px-/, `/${TARGET_WIDTH}px-`)
  process.stdout.write(`  ${id.slice(-6)} ${width}px -> ${TARGET_WIDTH}px  ${decodeURIComponent(file)}\n`)

  const res = await fetch(want, { headers: { 'User-Agent': 'EntomoLens/1.0 (image migration)' } })
  if (!res.ok) {
    console.log(`    fetch failed ${res.status}`)
    continue
  }
  const bytes = Buffer.from(await res.arrayBuffer())
  const type = sniff(bytes)
  if (!type) {
    console.log(`    not an image (${bytes.length}B)`)
    continue
  }

  const target = path.join(CACHE_DIR, path.basename(file))
  fs.writeFileSync(target, bytes)
  console.log(`    cached ${bytes.length}B ${type}`)
  rewritten.push({ from: url, to: want })

  if (upload) {
    if (!KEY) {
      console.log('    skipped upload: SUPABASE_SERVICE_ROLE_KEY not set')
      continue
    }
    const up = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path.basename(file)}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': type,
        'x-upsert': 'true',
      },
      body: bytes,
    })
    if (up.ok) console.log(`    published ${BUCKET}/${path.basename(file)}`)
    else console.log(`    upload failed ${up.status} ${await up.text()}`)
  }
}

// Only rewrite the migration when a wider file was actually fetched, so a
// transient Wikimedia failure cannot leave the repo pointing at URLs that were
// never downloaded.
if (rewritten.length) {
  let next = original
  for (const { from, to } of rewritten) next = next.replace(from, to)
  fs.writeFileSync(MIGRATION, next)
  console.log(`\nrewrote ${rewritten.length} URL(s) in ${MIGRATION} to ${TARGET_WIDTH}px`)
} else {
  console.log(`\n${MIGRATION} left unchanged: nothing was re-downloaded`)
}

if (upload) console.log('\nRemember to remove SUPABASE_SERVICE_ROLE_KEY from .env and rotate it.')