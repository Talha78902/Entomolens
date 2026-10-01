// Verifies live coverage and that every referenced image resolves over HTTP.
// Uses only VITE_SUPABASE_ANON_KEY, which is safe to expose to the browser.
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
const PUBLIC_ROOT = `${URL_BASE}/storage/v1/object/public`

const get = async (p) => {
  const res = await fetch(`${URL_BASE}/rest/v1/${p}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  const t = await res.text()
  if (!res.ok) throw new Error(`GET ${p} -> ${res.status} ${t}`)
  return JSON.parse(t)
}

const orders = await get('taxonomic_orders?select=id,name')
const insects = await get('insects?select=id,scientific_name,order_id,images')
const families = await get('taxonomic_families?select=id')
const genera = await get('taxonomic_genera?select=id')

const covered = new Set(insects.map((i) => i.order_id))
const empty = orders.filter((o) => !covered.has(o.id))

console.log(`species:   ${insects.length}`)
console.log(`families:  ${families.length}`)
console.log(`genera:    ${genera.length}`)
console.log(`orders:    ${orders.length} (${covered.size} covered, ${empty.length} empty)`)
if (empty.length) console.log(`  empty: ${empty.map((o) => o.name).join(', ')}`)

const noImage = insects.filter((i) => !Array.isArray(i.images) || i.images.length === 0)
console.log(`no image:  ${noImage.length}${noImage.length ? ` (${noImage.map((i) => i.scientific_name).join(', ')})` : ''}`)

// Stored refs are bucket-relative paths that already include the bucket name,
// so they are appended to the storage root rather than to the bucket path.
const refs = [...new Set(insects.flatMap((i) => i.images || []))]
const uniq = [...new Set(refs.map((r) => (r.startsWith('http') ? r : `${PUBLIC_ROOT}/${r}`)))]
console.log(`unique images: ${uniq.length}`)

const results = await Promise.all(
  uniq.map(async (u) => {
    try {
      const res = await fetch(u, { method: 'GET' })
      const type = res.headers.get('content-type') || '?'
      const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0)
      return { u, status: res.status, type, size: buf.length }
    } catch (e) {
      return { u, status: 'ERR', type: e.message, size: 0 }
    }
  }),
)

const bad = results.filter((r) => r.status !== 200)
const jpeg = results.filter((r) => r.type.startsWith('image/jpeg')).length
const png = results.filter((r) => r.type.startsWith('image/png')).length
console.log(`HTTP 200:  ${results.length - bad.length}/${results.length}  (jpeg ${jpeg}, png ${png})`)
if (bad.length) {
  console.log('FAILURES:')
  for (const b of bad) console.log(`  ${b.status} ${b.u}`)
  process.exitCode = 1
}
if (empty.length || noImage.length) process.exitCode = 1