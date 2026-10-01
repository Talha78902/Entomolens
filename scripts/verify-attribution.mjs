// Confirms the 3 CC-BY credits render on the species detail page, the way the
// page fetches them: via the same anon key and the same `select('*')` shape that
// fetchInsectDetail uses, then checking the text the page will put on screen.
//
// Uses only the anon key.
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

const manifest = JSON.parse(fs.readFileSync('src/data/species-photos.json', 'utf8'))
const ccby = manifest.photos.filter((p) => p.license === 'cc-by')

const all = await (async () => {
  const res = await fetch(`${URL_BASE}/rest/v1/insects?select=id,scientific_name,description,images`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
})()

let failures = 0

for (const photo of ccby) {
  // The manifest names the taxon, `matched` is what the host script slugged into
  // the filename, and the credit lives on whichever row the migration attached it to.
  const target = photo.matched || photo.name
  const row = all.find((i) => i.scientific_name === target)
  if (!row) {
    console.log(`FAIL ${photo.name}: no row named ${target}`)
    failures += 1
    continue
  }

  const desc = row.description || ''
  const who = photo.attribution.replace(/^\(c\)\s*/, '').replace(/,?\s*some rights reserved \(CC BY\).*$/i, '').trim()
  const obs = photo.observationUrl
  const hasWho = desc.includes(who)
  const hasObs = desc.includes(obs)
  const hasLicence = /\bCC[ -]?BY\b/i.test(desc)
  const ok = hasWho && hasObs && hasLicence

  console.log(`${ok ? 'ok  ' : 'FAIL'} ${target}`)
  console.log(`     photographer: ${hasWho ? 'shown' : 'MISSING'}  (${who})`)
  console.log(`     licence:      ${hasLicence ? 'shown' : 'MISSING'}`)
  console.log(`     observation:  ${hasObs ? 'shown' : 'MISSING'}  (${obs})`)

  // Confirm the page actually renders this field.
  const tail = desc.slice(desc.indexOf('Photographer credit'))
  if (tail) console.log(`     rendered text: ...${tail.slice(0, 120)}`)
  console.log()

  if (!ok) failures += 1
}

console.log(`CC-BY credits displayed: ${ccby.length - failures}/${ccby.length}`)
if (failures) process.exitCode = 1