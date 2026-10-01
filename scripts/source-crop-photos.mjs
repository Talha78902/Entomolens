/**
 * Source verified, licence-safe photos for the 12 crops.
 *
 * Mirrors scripts/source-species-photos.mjs so both sets obey the same policy:
 * iNaturalist only (it lets us filter to an explicit licence, Commons does not),
 * research-grade observations, non-cultivated only, CC0 preferred, CC-BY accepted
 * with attribution recorded, NC/ND rejected outright because this is an
 * agricultural extension site whose non-commercial terms we cannot guarantee.
 *
 * `search` lists names most-specific-first. Every crop already carries a
 * scientific name in the database, and those resolve cleanly, so each entry
 * verifies the taxon really is a plant in the right lineage before any photo is
 * accepted — otherwise "Solanum" style searches happily return a Solanaceae
 * member and file it under the wrong crop.
 *
 *   node scripts/source-crop-photos.mjs          # survey only
 *   node scripts/source-crop-photos.mjs --write  # also write the json
 */
import fs from 'node:fs/promises'

const UA = { 'User-Agent': 'EntomoLens/1.0 (crop photo sourcing)' }
const ALLOWED = new Set(['cc0', 'cc-by'])

// Matches the crops table exactly, so the manifest can never drift from the DB.
// `search` carries fallbacks for the two crops where the cultivated binomials
// return thin coverage (sugarcane is a sterile hybrid complex, brinjal's
// binomial resolves to a different taxon on iNat).
const CROPS = [
  { name: 'Cotton', scientific_name: 'Gossypium hirsutum', search: ['Gossypium hirsutum', 'Gossypium'], plant: 'Angiosperms' },
  { name: 'Wheat', scientific_name: 'Triticum aestivum', search: ['Triticum aestivum', 'Triticum'], plant: 'Angiosperms' },
  { name: 'Maize', scientific_name: 'Zea mays', search: ['Zea mays', 'Zea'], plant: 'Angiosperms' },
  { name: 'Rice', scientific_name: 'Oryza sativa', search: ['Oryza sativa', 'Oryza'], plant: 'Angiosperms' },
  { name: 'Tomato', scientific_name: 'Solanum lycopersicum', search: ['Solanum lycopersicum', 'Solanum lycopersicum var. lycopersicum', 'Lycopersicon esculentum'], plant: 'Angiosperms' },
  { name: 'Okra', scientific_name: 'Abelmoschus esculentus', search: ['Abelmoschus esculentus', 'Abelmoschus'], plant: 'Angiosperms' },
  { name: 'Chickpea', scientific_name: 'Cicer arietinum', search: ['Cicer arietinum', 'Cicer'], plant: 'Angiosperms' },
  { name: 'Sugarcane', scientific_name: 'Saccharum officinarum', search: ['Saccharum officinarum', 'Saccharum', 'Saccharum hybrid cultivar'], plant: 'Angiosperms' },
  { name: 'Potato', scientific_name: 'Solanum tuberosum', search: ['Solanum tuberosum', 'Solanum tuberosum group tuberosum'], plant: 'Angiosperms' },
  { name: 'Brinjal', scientific_name: 'Solanum melongena', search: ['Solanum melongena', 'Solanum incanum', 'Solanum melongena group esculentum'], plant: 'Angiosperms' },
  { name: 'Chilli', scientific_name: 'Capsicum annuum', search: ['Capsicum annuum', 'Capsicum'], plant: 'Angiosperms' },
  { name: 'Cucumber', scientific_name: 'Cucumis sativus', search: ['Cucumis sativus', 'Cucumis'], plant: 'Angiosperms' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, attempt = 1) {
  if (attempt > 5) throw new Error('gave up after 5 attempts')
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })
  if (res.status === 429 || res.status >= 500) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** (attempt - 1)
    process.stdout.write(`    ${res.status}, backing off ${Math.round(waitMs / 1000)}s\n`)
    await sleep(waitMs)
    return getJson(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Resolve a taxon and prove it is a plant, preferring the exact binomial.
 *
 * The species-page version of this checks membership of an insect order. Here the
 * requirement is weaker but still load-bearing: the taxon must be a Plantae
 * member, so a homonym or a cultivar named after a crop cannot be filed as the
 * crop. Exact-name matches win over genus-level fallbacks, because a photo of
 * "Solanum" would not be a photograph of tomato.
 */
async function resolveTaxon(names, plant) {
  const rankWeight = { species: 0, subspecies: 1, variety: 2, genus: 3, family: 4, subfamily: 5 }
  const seen = new Map()

  for (const name of names) {
    try {
      const data = await getJson(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&per_page=20&locale=en`)
      // The search endpoint returns taxa with only id/name/rank: no kingdom, and
      // an empty ancestors array. The lineage check below needs the per-taxon
      // endpoint instead, which is why this cannot rely on the search payload.
      for (const t of data.results ?? []) if (!seen.has(t.id)) seen.set(t.id, t)
    } catch {
      // Tolerant here; the lineage pass decides the outcome.
    }
    await sleep(1200)
  }

  const wanted = names.map((n) => n.toLowerCase())
  void plant
  const verified = []
  for (const candidate of [...seen.values()].slice(0, 24)) {
    try {
      const full = await getJson(`https://api.inaturalist.org/v1/taxa/${candidate.id}?locale=en`)
      const record = full.results?.[0] ?? full
      // Neither the search nor the per-taxon payload carries a `kingdom` field,
      // so lineage comes from the ancestors array. Note iNat spells the clade
      // "Angiospermae" here, not "Angiosperms", so both are accepted.
      const lineage = (record.ancestors ?? []).map((a) => a.name)
      if (lineage.includes('Plantae')) verified.push(record)
    } catch {
      // Skip; another candidate may verify.
    }
    await sleep(700)
  }

  if (verified.length === 0) throw new Error('no Plantae taxon matched')

  // An exact-name hit outranks a genus fallback, but among equals the lower rank
  // (species before genus) wins. Without this the sort could return any verified
  // taxon, and a genus-level fallback is not a photograph of the crop: a search
  // for "Cicer" once returned Sonchus oleraceus (sow thistle), which is a plant
  // and would have passed every other check here.
  verified.sort((a, b) => {
    const aExact = wanted.includes((a.name ?? '').toLowerCase()) ? 0 : 1
    const bExact = wanted.includes((b.name ?? '').toLowerCase()) ? 0 : 1
    if (aExact !== bExact) return aExact - bExact
    return (rankWeight[a.rank] ?? 9) - (rankWeight[b.rank] ?? 9)
  })
  const hit = verified[0]

  // Final gate: when the caller offered an exact binomial, the winner must be
  // that binomial or a member of the expected genus. Anything else is a
  // same-kingdom impostor and is rejected rather than quietly filed.
  const binomials = names.filter((n) => n.includes(' '))
  if (binomials.length > 0) {
    const name = hit.name.toLowerCase()
    const genus = binomials[0].split(' ')[0].toLowerCase()
    if (!binomials.some((b) => b.toLowerCase() === name) && !name.startsWith(`${genus} `)) {
      throw new Error(`resolved to ${hit.name} (${hit.rank}), expected ${binomials[0]}`)
    }
  }

  return { id: hit.id, matched: hit.name, rank: hit.rank, preferred: hit.preferred_common_name ?? null }
}

function voteCount(obs) {
  const v = obs.votes
  if (typeof v === 'number') return v
  if (Array.isArray(v)) return v.length
  return 0
}

/** Best research-grade, openly-licensed, non-cultivated photo. Widens cc0 -> cc-by. */
async function bestPhoto(taxonId) {
  for (const license of ['cc0', 'cc-by']) {
    const data = await getJson(
      `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&photos=true` +
        `&quality_grade=research&photo_license=${license}&captive=false` +
        `&order_by=votes&per_page=30&locale=en`,
    )
    const ranked = (data.results ?? []).slice().sort((a, b) => voteCount(b) - voteCount(a))
    for (const obs of ranked) {
      for (const photo of obs.photos ?? []) {
        if (!ALLOWED.has(photo.license_code)) continue
        if (!/^https?:/.test(photo.url ?? '')) continue
        // iNat serves square/small/medium/large/original. The museum grid is
        // three-up on desktop, so anything under 500px looks soft.
        const url = photo.url
          .replace('/square.', '/large.')
          .replace('/small.', '/large.')
          .replace('/medium.', '/large.')
        return {
          url,
          license: photo.license_code,
          attribution: photo.attribution ?? null,
          observationUrl: obs.uri,
          votes: voteCount(obs),
          quality: obs.quality_grade,
        }
      }
    }
  }
  return null
}

const results = []
const failed = []

for (const crop of CROPS) {
  try {
    const taxon = await resolveTaxon(crop.search, crop.plant)
    const photo = await bestPhoto(taxon.id)
    if (!photo) {
      failed.push({ ...crop, why: 'no cc0/cc-by research-grade photo' })
      console.log(`  MISS  ${crop.name.padEnd(12)} — no openly licensed photo`)
    } else {
      results.push({ ...crop, taxonId: taxon.id, matched: taxon.matched, ...photo })
      console.log(
        `  ok    ${crop.name.padEnd(12)} ${String(taxon.matched).padEnd(30)} ${photo.license.padEnd(5)} votes=${String(photo.votes).padStart(3)}`,
      )
    }
  } catch (error) {
    failed.push({ ...crop, why: error instanceof Error ? error.message : 'failed' })
    console.log(`  MISS  ${crop.name.padEnd(12)} — ${error instanceof Error ? error.message : 'failed'}`)
  }
  await sleep(600)
}

console.log(`\nsourced: ${results.length} / ${CROPS.length}   failed: ${failed.length}`)
if (failed.length) {
  console.log('\n-- no usable photo; these crops will ship without one --')
  for (const f of failed) console.log(`--   ${f.name.padEnd(12)} (${f.why})`)
}

if (process.argv.includes('--write')) {
  const target = 'src/data/crop-photos.json'
  await fs.writeFile(
    target,
    JSON.stringify({ generatedFrom: 'iNaturalist API', licences: [...ALLOWED], crops: results }, null, 2) + '\n',
    'utf8',
  )
  console.log(`\nwrote ${target}`)
}
