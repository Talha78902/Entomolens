/**
 * Applies the life-cycle illustration paths from
 * supabase/migrations/00017_lifecycle_illustrations.sql through PostgREST, so the
 * update does not require pasting SQL into the Supabase editor.
 *
 * Mirrors the crop photo workflow: reads the statements straight from the
 * migration so the two cannot drift, prints a dry-run plan, and only writes with
 * --apply. Every statement sets an absolute value, so a re-run is a no-op rather
 * than an append.
 *
 * The images themselves need no upload. They are first-party SVGs in
 * public/lifecycle-stages, served as static assets by Vite and Vercel, so this
 * only records the path on each row.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env, because life_cycles is behind RLS and
 * the anon key can read but not write. Remove the key afterwards.
 *
 *   node scripts/apply-lifecycle-illustrations.mjs          # dry run
 *   node scripts/apply-lifecycle-illustrations.mjs --apply  # write
 */
import fs from 'node:fs'

const apply = process.argv.includes('--apply')

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const URL_BASE = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY

if (!URL_BASE || !KEY) throw new Error('VITE_SUPABASE_URL and a key are required in .env')

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

/**
 * Undo SQL literal escaping.
 *
 * The patterns below capture *between* the quotes, so the quotes are already
 * excluded and must not be sliced off again. An earlier version called
 * slice(1, -1) here and quietly turned `/lifecycle-stages/x.svg` into
 * `lifecycle-stages/x.sv`, which then failed the asset check for all 36 rows.
 */
const unquote = (s) => s.replace(/''/g, "'")

/** Read the statements straight from the migration so the two cannot drift. */
function parseSource() {
  const sql = fs.readFileSync('supabase/migrations/00017_lifecycle_illustrations.sql', 'utf8')
  const statements = [...sql.matchAll(/update public\.life_cycles lc\s+set image_url = '([^']+)'\s+from public\.insects i\s+where i\.id = lc\.insect_id\s+and i\.scientific_name = '([^']+)'\s+and lc\.stage_name = '([^']+)';/g)]

  return statements.map((m) => ({
    image_url: unquote(m[1]),
    scientific_name: unquote(m[2]),
    stage_name: unquote(m[3]),
  }))
}

const SOURCE = parseSource()
console.log(`parsed ${SOURCE.length} statements from 00017_lifecycle_illustrations.sql`)
if (SOURCE.length !== 36) throw new Error(`expected 36 statements, parsed ${SOURCE.length}`)

// Every referenced asset must exist on disk before anything is written, otherwise
// the page would show a broken image for rows we have already committed.
const missingAssets = SOURCE.filter(
  (s) => !fs.existsSync('public' + s.image_url),
)
if (missingAssets.length) {
  console.error(`${missingAssets.length} referenced asset(s) missing from public/:`)
  for (const m of missingAssets) console.error(`  ${m.image_url}`)
  process.exit(1)
}

const { data: rows, error } = await fetch(
  `${URL_BASE}/rest/v1/life_cycles?select=id,stage_name,stage_order,image_url,insects(id,common_name,scientific_name)&order=stage_order`,
  { headers },
).then(async (r) => {
  const j = await r.json()
  if (!r.ok) throw new Error(`GET life_cycles -> ${r.status} ${JSON.stringify(j)}`)
  return { data: j, error: null }
})
void error

console.log(`life_cycles rows: ${rows.length}`)
if (rows.length !== 36) throw new Error(`expected 36 rows, found ${rows.length}`)

const key = (r) => `${r.insects?.scientific_name}::${r.stage_name}`

let matched = 0
let changed = 0
const unmatched = []
const updates = []

for (const s of SOURCE) {
  const row = rows.find((r) => key(r) === `${s.scientific_name}::${s.stage_name}`)
  if (!row) {
    unmatched.push(`${s.scientific_name} / ${s.stage_name}`)
    continue
  }
  matched += 1
  if (row.image_url !== s.image_url) {
    changed += 1
    updates.push({ id: row.id, expected: s.image_url, current: row.image_url })
  }
}

console.log(`matched ${matched}/${SOURCE.length}`)
console.log(`already set ${matched - changed}`)
console.log(`to update  ${changed}`)

if (unmatched.length) {
  console.error(`\nno matching life_cycles row for ${unmatched.length} statement(s):`)
  for (const u of unmatched) console.error(`  ${u}`)
  process.exit(1)
}

if (!apply) {
  console.log('\ndry run, no writes. showing first 8 changes:')
  for (const u of updates.slice(0, 8)) {
    console.log(`  ${u.id}  ${u.current ?? 'null'} -> ${u.expected}`)
  }
  if (updates.length > 8) console.log(`  ... and ${updates.length - 8} more`)
  console.log('\nrerun with --apply to write')
  process.exit(0)
}

if (!updates.length) {
  console.log('\nnothing to do, all 36 rows already point at their illustration')
  process.exit(0)
}

console.log(`\nwriting ${updates.length} row(s)...`)

for (const u of updates) {
  const res = await fetch(`${URL_BASE}/rest/v1/life_cycles?id=eq.${u.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ image_url: u.expected }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PATCH ${u.id} -> ${res.status} ${body}`)
  }
}

console.log(`\ndone: ${updates.length} row(s) updated`)

const { data: after } = await fetch(
  `${URL_BASE}/rest/v1/life_cycles?select=image_url`,
  { headers },
).then((r) => r.json())

const set = after.filter((r) => r.image_url).length
console.log(`verification: ${set}/${after.length} rows have image_url`)
if (set !== after.length) {
  console.error('WARNING: some rows still have no image_url')
  process.exit(1)
}