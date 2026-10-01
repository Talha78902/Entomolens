import fs from 'node:fs'
import path from 'node:path'

// Seeds the 20 extended species through PostgREST, bypassing the SQL editor.
// Reads the exact same values as .cache/00015-statements/insects.sql so the
// migration and the database stay in agreement. Idempotent: existing rows are
// skipped and images are only written when still empty.

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
if (!URL_BASE || !KEY) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

async function rest(pathname, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathname}`, { ...init, headers: { ...headers, ...(init.headers || {}) } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${pathname} -> ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

// Parses by position rather than literal index: rows carrying a non-null
// beneficial_category contain one extra string literal, which breaks any
// index-based mapping.
function parseInsects(sql) {
  const body = sql.replace(/^[\s\S]*?\bvalues\b/i, '').replace(/\bon\s+conflict\b[\s\S]*$/i, '')
  const unq = (s) => s.replace(/''/g, "'")
  const rows = []

  for (const chunk of body.split(/\n  \(/).slice(1)) {
    const head = chunk.match(
      /^'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*\(select id from public\.taxonomic_orders where name = '([^']*)'\)/,
    )
    if (!head) throw new Error(`unrecognised row head: ${chunk.slice(0, 120)}`)

    const [, id, scientific_name, common_name, genus_id, family_id, order_name] = head

    const tail = chunk.slice(head[0].length)
    const prose = tail.match(
      /^\s*,\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'\{\}'\s*,\s*(true|false)\s*,\s*(true|false)\s*,\s*(null|'[^']*')\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'/i,
    )
    if (!prose) throw new Error(`unrecognised row tail for ${scientific_name}: ${tail.slice(0, 120)}`)

    const [, description, identification_characteristics, is_pest, is_beneficial, cat, native_region, verification_status] = prose

    rows.push({
      id,
      scientific_name,
      common_name,
      genus_id,
      family_id,
      order_name,
      description: unq(description),
      identification_characteristics: unq(identification_characteristics),
      is_pest: is_pest.toLowerCase() === 'true',
      is_beneficial: is_beneficial.toLowerCase() === 'true',
      beneficial_category: cat.toLowerCase() === 'null' ? null : unq(cat.slice(1, -1)),
      native_region: unq(native_region),
      verification_status: unq(verification_status),
    })
  }
  return rows
}

const ALLOWED_STATUS = new Set(['draft', 'reviewed', 'verified'])
const ALLOWED_CATEGORY = new Set(['predator', 'parasitoid', 'pollinator', 'other'])

const species = parseInsects(fs.readFileSync(path.join('.cache', '00015-statements', 'insects.sql'), 'utf8'))

// Validate before touching the database, so a parser slip can never be mistaken
// for a schema problem the way the SQL editor round-trips were.
const bad = species.filter((s) => !ALLOWED_STATUS.has(s.verification_status))
if (bad.length) {
  console.error(`bad verification_status: ${bad.map((s) => `${s.scientific_name}=${s.verification_status}`).join(', ')}`)
  process.exit(1)
}
const badCat = species.filter((s) => s.beneficial_category !== null && !ALLOWED_CATEGORY.has(s.beneficial_category))
if (badCat.length) {
  console.error(`bad beneficial_category: ${badCat.map((s) => `${s.scientific_name}=${s.beneficial_category}`).join(', ')}`)
  process.exit(1)
}
const shortProse = species.filter((s) => s.description.length < 60 || s.identification_characteristics.length < 40)
if (shortProse.length) {
  console.error(`suspiciously short prose: ${shortProse.map((s) => s.scientific_name).join(', ')}`)
  process.exit(1)
}
// Guard against a truncated description, which is the shape a mis-split row
// takes. Prose may legitimately contain words like "from" or "select".
const looksSql = species.filter((s) => /^\s*(select|from|where|insert|update)\b/i.test(s.description))
if (looksSql.length) {
  console.error(`a description begins with SQL: ${looksSql.map((s) => s.scientific_name).join(', ')}`)
  process.exit(1)
}
console.log(
  `parsed ${species.length} species: statuses=${[...new Set(species.map((s) => s.verification_status))].join('/')}, ` +
  `categories=${[...new Set(species.map((s) => String(s.beneficial_category)))].join('/')}`,
)

const orders = await rest('taxonomic_orders?select=id,name')
const orderByName = new Map(orders.map((o) => [o.name.toLowerCase(), o.id]))
console.log(`resolved ${orders.length} orders`)

// Image refs come from 4-images.sql so the seed and the migration cannot drift.
function parseImageRefs(sql) {
  const map = new Map()
  for (const [, sci, ref] of sql.matchAll(/\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*\)/g)) {
    map.set(sci.replace(/''/g, "'"), ref.replace(/''/g, "'"))
  }
  return map
}

const imageRefs = parseImageRefs(fs.readFileSync(path.join('.cache', '00015-statements', '4-images.sql'), 'utf8'))
console.log(`parsed ${imageRefs.size} image refs`)

const CHUNK = 10
let inserted = 0

for (let i = 0; i < species.length; i += CHUNK) {
  const batch = species.slice(i, i + CHUNK).map(({ order_name, ...rest }) => {
    const order_id = orderByName.get(order_name.toLowerCase())
    if (!order_id) throw new Error(`no order named ${order_name}`)
    return { ...rest, order_id }
  })

  const { error, data } = await (async () => {
    const res = await fetch(`${URL_BASE}/rest/v1/insects?on_conflict=id`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(batch),
    })
    const t = await res.text()
    if (!res.ok) return { error: t }
    return { data: JSON.parse(t) }
  })()

  if (error) {
    console.error(`\nbatch starting at row ${i + 1} failed:\n${error}`)
    console.error('\nPer-row retry to isolate the offender:')
    for (const s of batch) {
      const r = await fetch(`${URL_BASE}/rest/v1/insects?on_conflict=id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([s]),
      })
      const t = await r.text()
      console.error(`  ${r.ok ? 'ok  ' : 'FAIL'} ${s.scientific_name}${r.ok ? '' : `  ${t}`}`)
      if (r.ok) inserted += 1
    }
    break
  }
  inserted += data.length
  console.log(`rows ${i + 1}-${Math.min(i + CHUNK, species.length)} ok (${data.length})`)
}

let patched = 0
const missingRefs = species.filter((s) => !imageRefs.has(s.scientific_name)).map((s) => s.scientific_name)
if (missingRefs.length) {
  console.error(`no image ref for: ${missingRefs.join(', ')}`)
  process.exit(1)
}

const failedPatches = []
for (const s of species) {
  const ref = imageRefs.get(s.scientific_name)
  // Ask for the rows back so a PATCH matching nothing is reported rather than
  // silently counted as success.
  const res = await fetch(`${URL_BASE}/rest/v1/insects?id=eq.${s.id}&select=id`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ images: [ref] }),
  })
  const body = await res.json().catch(() => null)
  if (res.ok && Array.isArray(body) && body.length === 1) patched += 1
  else failedPatches.push(`${s.scientific_name} (http ${res.status}, matched ${Array.isArray(body) ? body.length : '?'})`)
}

console.log(`\ninserted/merged: ${inserted}, images written: ${patched}`)
if (failedPatches.length) {
  console.error(`image patch failures (${failedPatches.length}): ${failedPatches.join('; ')}`)
  process.exitCode = 1
}

// Delete the diagnostic probe row created during schema triage.
const probe = await fetch(`${URL_BASE}/rest/v1/insects?id=eq.40000000-0000-0000-0000-000000000199`, {
  method: 'DELETE',
  headers: { ...headers, Prefer: 'return=representation' },
})
console.log(`probe row removed: ${probe.ok ? 'yes' : `no (${probe.status})`}`)