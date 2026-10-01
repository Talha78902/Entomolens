/**
 * Point insects.images at the re-sourced iNaturalist photos and append the
 * required CC-BY credits.
 *
 * Reads src/data/specimen-photos.json rather than hard-coding rows, and matches on
 * the insects.id carried in the manifest, so the update cannot land on the wrong
 * species. Objects are already in the bucket under an `-inat` key; this only
 * repoints the reference.
 *
 * Credits go into insects.description. There is no attribution column on insects,
 * and description is what InsectDetailPage already renders, so the credit is
 * visible without a schema change. The append is guarded on the credit being
 * absent, so re-running cannot duplicate it or double up on text already there.
 *
 * Species whose sourcing failed keep their existing image: the manifest has no
 * entry for them, so they are never touched.
 *
 *   node scripts/apply-specimen-photos.mjs           # dry run
 *   node scripts/apply-specimen-photos.mjs --apply   # write
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

const manifest = JSON.parse(fs.readFileSync('src/data/specimen-photos.json', 'utf8'))
const apply = process.argv.includes('--apply')

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is required: insects sits behind RLS and cannot be written with the anon key.',
  )
}

const BASE = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Build the attribution line.
 *
 * Only the photographer, licence and observation URL, matching the format the
 * existing species credits already use on the page.
 */
function creditFor(spec) {
  const raw = (spec.attribution ?? '').trim()
  if (!raw) return `(${spec.license} via iNaturalist observation ${spec.observationUrl})`
  // Strip iNat's "(c) Name, some rights reserved (CC BY)" wrapper down to "Name".
  // iNat writes "(c) Paul Cook, some rights reserved (CC BY)". Only the leading
  // "(c)" and the trailing rights clause come off; the middle "some rights
  // reserved" is part of the photographer's display name and must survive, or the
  // credit names the wrong person. Anchored at both ends so it cannot eat a name.
  const name = raw
    .replace(/^\(c\)\s*/, '')
    .replace(/,?\s*(all|some)\s+rights\s+reserved\s*\(CC\s+BY\)?\s*\)?\s*$/i, '')
    .replace(/,?\s*\(CC\s+BY\)?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return `(${name}, ${spec.license} via iNaturalist observation ${spec.observationUrl})`
}

const { specimens } = manifest

console.log(`manifest: ${specimens.length} specimens\n`)
console.log('plan:')
for (const spec of specimens) {
  const credit = spec.license === 'cc-by' ? creditFor(spec) : null
  console.log(`  ${spec.common_name.padEnd(30)} image set  ${credit ? `credit ADD: ${credit}` : 'credit n/a (cc0)'}`)
}
console.log('')

if (!apply) {
  console.log('dry run. Re-run with --apply to write.')
  process.exit(0)
}

let images = 0
let credits = 0

for (const spec of specimens) {
  const ref = `insect-images/${String(spec.id).slice(-4)}-${spec.scientific_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-inat.jpg`

  // Confirm the object is actually there and is an image before pointing at it.
  const head = await fetch(`${BASE}/storage/v1/object/public/${ref}`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(30000),
  })
  const type = head.headers.get('content-type') ?? ''
  if (!head.ok || !type.startsWith('image/')) {
    console.log(`  SKIP ${spec.common_name.padEnd(30)} ${ref} -> HTTP ${head.status} ${type}`)
    continue
  }

  const patch = { images: [ref] }
  const credit = spec.license === 'cc-by' ? creditFor(spec) : null

  if (credit) {
    const current = await fetch(`${BASE}/rest/v1/insects?select=description&id=eq.${spec.id}`, {
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(30000),
    })
    const row = (await current.json())?.[0]
    const description = row?.description ?? ''
    if (!description.includes(credit)) {
      patch.description = description ? `${description.trimEnd()} ${credit}` : credit
    }
  }

  const res = await fetch(`${BASE}/rest/v1/insects?id=eq.${spec.id}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(patch),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    console.log(`  FAIL ${spec.common_name.padEnd(30)} HTTP ${res.status} ${await res.text()}`)
    continue
  }

  images += 1
  if (patch.description) credits += 1
  console.log(
    `  ok   ${spec.common_name.padEnd(30)} -> ${ref}${credit ? '  + credit' : ''}` +
      `${spec.exact === false ? '  (genus-level photo)' : ''}`,
  )
  await sleep(250)
}

// Read-back with the anon key, proving the write landed and RLS still serves it.
const check = await (
  await fetch(
    `${BASE}/rest/v1/insects?select=id,common_name,images,description&id=in.(${
      specimens.map((s) => s.id).join(',')
    })`,
    {
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(30000),
    },
  )
).json()

const swapped = check.filter((r) => String(r.images?.[0] ?? '').includes('-inat')).length
const withCredit = check.filter((r) => (r.description ?? '').includes('iNaturalist observation')).length

console.log(`\napplied: ${images} image_url, ${credits} credits`)
console.log(`verify: ${swapped}/${specimens.length} point at the new objects, ${withCredit} carry a credit`)
