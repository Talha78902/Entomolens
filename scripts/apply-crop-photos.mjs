/**
 * Applies the crop photo and attribution updates from
 * supabase/migrations/00016_crop_photos.sql through PostgREST, so the changes do
 * not require pasting SQL into the Supabase editor.
 *
 * Mirrors the SQL statement for statement: sets image_url on all 12 crops and
 * appends the two CC-BY credits to description, guarding on the credit already
 * being present so a re-run cannot duplicate it.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env, because crops is behind RLS and the
 * anon key can read but not write. Remove the key afterwards.
 *
 *   node scripts/apply-crop-photos.mjs          # dry run, prints the plan
 *   node scripts/apply-crop-photos.mjs --apply  # write
 */
import fs from 'node:fs'

const apply = process.argv.includes('--apply')

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
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY

/** Read straight from the migration so the two cannot drift. */
function parseSource() {
  const sql = fs.readFileSync('supabase/migrations/00016_crop_photos.sql', 'utf8')
  const values = sql.match(/with source \(crop_name, image_ref, credit\) as \(\s*values([\s\S]*?)\)\s*\nupdate/i)
  if (!values) throw new Error('could not find the source values block in 00016')

  const rows = []
  for (const [, name, ref, credit] of values[1].matchAll(
    /\(\s*'([^']+)',\s*'([^']+)',\s*(null|'(?:[^']|'')*')\s*\)/g,
  )) {
    rows.push({
      crop_name: name,
      image_ref: ref,
      credit: credit === 'null' ? null : credit.slice(1, -1).replace(/''/g, "'"),
    })
  }
  return rows
}

const SOURCE = parseSource()
console.log(`parsed ${SOURCE.length} crops from 00016_crop_photos.sql`)

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

const { data: crops, error } = await fetch(`${URL_BASE}/rest/v1/crops?select=id,name,description,image_url&order=name`, {
  headers,
}).then(async (r) => {
  const j = await r.json()
  if (!r.ok) throw new Error(`GET crops -> ${r.status} ${JSON.stringify(j)}`)
  return { data: j, error: null }
})
void error

const byName = new Map(crops.map((c) => [c.name.toLowerCase(), c]))
let plannedImages = 0
let plannedCredits = 0
let badRef = 0

console.log('\nplan:')
for (const src of SOURCE) {
  const crop = byName.get(src.crop_name.toLowerCase())
  if (!crop) {
    console.log(`  MISS  ${src.crop_name.padEnd(11)} not in the crops table`)
    continue
  }
  const url = `${URL_BASE}/storage/v1/object/public/${src.image_ref}`
  const head = await fetch(url, { method: 'HEAD' })
  if (!head.ok) {
    console.log(`  MISS  ${src.crop_name.padEnd(11)} ${head.status} ${src.image_ref} is not published`)
    badRef += 1
    continue
  }

  const willSetImage = crop.image_url !== src.image_ref
  const hasCredit = src.credit && crop.description && crop.description.includes(src.credit)
  const willAddCredit = Boolean(src.credit) && !hasCredit

  if (willSetImage) plannedImages += 1
  if (willAddCredit) plannedCredits += 1

  console.log(
    `  ${crop.name.padEnd(11)} image ${willSetImage ? 'set' : 'unchanged'}  ` +
    `credit ${src.credit ? (willAddCredit ? 'ADD' : 'present') : 'n/a (cc0)'}`,
  )
}

console.log(`\nimages to set: ${plannedImages}   credits to add: ${plannedCredits}   unpublished: ${badRef}`)

if (badRef > 0) {
  console.log('\nSome objects are not published yet. Run: node scripts/host-crop-photos.mjs --upload')
  process.exit(1)
}

if (!apply) {
  console.log('\ndry run. Re-run with --apply to write.')
  process.exit(0)
}

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\nRefusing to write with the anon key: crops is behind RLS.')
  console.log('Set SUPABASE_SERVICE_ROLE_KEY in .env, then re-run with --apply.')
  process.exit(1)
}

let wroteImages = 0
let wroteCredits = 0

for (const src of SOURCE) {
  const crop = byName.get(src.crop_name.toLowerCase())
  if (!crop) continue

  if (crop.image_url !== src.image_ref) {
    const res = await fetch(`${URL_BASE}/rest/v1/crops?id=eq.${crop.id}&select=id`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ image_url: src.image_ref }),
    })
    const body = await res.json().catch(() => null)
    if (res.ok && Array.isArray(body) && body.length === 1) wroteImages += 1
    else console.error(`  image update failed for ${crop.name} (${res.status})`)
  }

  if (src.credit && !(crop.description && crop.description.includes(src.credit))) {
    const description = `${crop.description ?? ''} ${src.credit}`.trim()
    const res = await fetch(`${URL_BASE}/rest/v1/crops?id=eq.${crop.id}&select=id`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ description }),
    })
    const body = await res.json().catch(() => null)
    if (res.ok && Array.isArray(body) && body.length === 1) wroteCredits += 1
    else console.error(`  credit update failed for ${crop.name} (${res.status})`)
  }
}

console.log(`\napplied: ${wroteImages} image_url, ${wroteCredits} credits`)

// Read back with the anon key, the way the pages will.
const anon = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` }
const after = await fetch(`${URL_BASE}/rest/v1/crops?select=name,image_url,description&order=name`, {
  headers: anon,
}).then((r) => r.json())

const withImage = after.filter((c) => c.image_url).length
const withCredit = after.filter((c) => c.description && /CC BY/.test(c.description)).length
console.log(`\nverify: ${withImage}/${after.length} crops have image_url, ${withCredit} carry a CC BY credit`)

const missing = after.filter((c) => !c.image_url).map((c) => c.name)
if (missing.length) console.error(`missing: ${missing.join(', ')}`)
if (withImage !== after.length || withCredit !== 2) process.exitCode = 1

console.log(`\nRemove SUPABASE_SERVICE_ROLE_KEY from .env and rotate it when you are done.`)
