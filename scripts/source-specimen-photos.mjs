/**
 * Re-source the 24 species photos that migration 00011 took from Wikimedia.
 *
 * Why
 * ---
 * `00011` seeded insects.images with upload.wikimedia.org thumbnails, and
 * scripts/host-specimen-images.mjs later copied them into our own bucket to avoid
 * Wikimedia's rate limiting. That solved the 429s but left the provenance
 * unverifiable: the copy discarded the Commons filename, so no script or manifest
 * records which Commons file each image came from or what licence it carried.
 * Commons files are commonly CC BY-SA, whose share-alike terms attach to the
 * derivative work, which is not a comfortable fit for a photo embedded in an app.
 * Commons is also unreachable from this environment, so the licences cannot be
 * checked here at all.
 *
 * Re-sourcing from iNaturalist puts all 44 species on one policy, one manifest,
 * and one licence set: CC0 preferred, CC-BY accepted with attribution, NC/ND
 * rejected outright.
 *
 * Taxon mismatch
 * --------------
 * 00011 matched photographs to species by filename alone and got several wrong,
 * so this script refuses them. Each entry carries the scientific name stored in the
 * database and a short list of alternates; the winner must be the exact binomial or
 * a member of the same genus, otherwise the candidate is rejected rather than
 * filed under a name it does not show. Rejected alternates are reported, because a
 * genus-level fallback is a different species-level claim than the database makes.
 *
 *   node scripts/source-specimen-photos.mjs          # survey only
 *   node scripts/source-specimen-photos.mjs --write  # also write the manifest
 */
import fs from 'node:fs/promises'

const UA = { 'User-Agent': 'EntomoLens/1.0 (specimen photo sourcing)' }
const ALLOWED = new Set(['cc0', 'cc-by'])

// Ids match migration 00011, so this list can never drift from what is served.
// `alternates` are older or disputed names that iNat may file the species under;
// each is still gated on genus, so an alternate can only ever match within the
// correct genus.
const SPECIMENS = [
  { id: '40000000-0000-0000-0000-000000000001', common_name: 'Silverleaf whitefly', scientific_name: 'Bemisia tabaci', alternates: ['Bemisia tabaci', 'Bemisia'] },
  { id: '40000000-0000-0000-0000-000000000002', common_name: 'Cotton aphid', scientific_name: 'Aphis gossypii', alternates: ['Aphis gossypii', 'Aphis'] },
  { id: '40000000-0000-0000-0000-000000000003', common_name: 'Cotton mealybug', scientific_name: 'Phenacoccus solenopsis', alternates: ['Phenacoccus solenopsis', 'Phenacoccus'] },
  { id: '40000000-0000-0000-0000-000000000004', common_name: 'Red cotton stainer', scientific_name: 'Dysdercus koenigii', alternates: ['Dysdercus koenigii', 'Dysdercus'] },
  { id: '40000000-0000-0000-0000-000000000005', common_name: 'Cotton jassid', scientific_name: 'Amrasca biguttula', alternates: ['Amrasca biguttula', 'Amrasca'] },
  { id: '40000000-0000-0000-0000-000000000006', common_name: 'Old World bollworm', scientific_name: 'Helicoverpa armigera', alternates: ['Helicoverpa armigera', 'Helicoverpa'] },
  { id: '40000000-0000-0000-0000-000000000007', common_name: 'Fall armyworm', scientific_name: 'Spodoptera frugiperda', alternates: ['Spodoptera frugiperda', 'Spodoptera'] },
  { id: '40000000-0000-0000-0000-000000000008', common_name: 'Tobacco caterpillar', scientific_name: 'Spodoptera litura', alternates: ['Spodoptera litura', 'Spodoptera'] },
  { id: '40000000-0000-0000-0000-000000000009', common_name: 'Black cutworm', scientific_name: 'Agrotis ipsilon', alternates: ['Agrotis ipsilon', 'Agrotis segetum', 'Agrotis'] },
  { id: '40000000-0000-0000-0000-000000000010', common_name: 'Pink bollworm', scientific_name: 'Pectinophora gossypiella', alternates: ['Pectinophora gossypiella', 'Pectinophora', 'Pectinophora gossypiella'] },
  { id: '40000000-0000-0000-0000-000000000011', common_name: 'Brinjal shoot and fruit borer', scientific_name: 'Leucinodes orbonalis', alternates: ['Leucinodes orbonalis', 'Leucinodes'] },
  { id: '40000000-0000-0000-0000-000000000012', common_name: 'Cotton boll weevil', scientific_name: 'Anthonomus grandis', alternates: ['Anthonomus grandis', 'Anthonomus'] },
  { id: '40000000-0000-0000-0000-000000000013', common_name: 'Seven-spot ladybird', scientific_name: 'Coccinella septempunctata', alternates: ['Coccinella septempunctata', 'Coccinella'] },
  { id: '40000000-0000-0000-0000-000000000014', common_name: 'Pulse beetle', scientific_name: 'Callosobruchus chinensis', alternates: ['Callosobruchus chinensis', 'Callosobruchus'] },
  { id: '40000000-0000-0000-0000-000000000015', common_name: 'Khapra beetle', scientific_name: 'Trogoderma granarium', alternates: ['Trogoderma granarium', 'Trogoderma'] },
  { id: '40000000-0000-0000-0000-000000000016', common_name: 'Onion thrips', scientific_name: 'Thrips tabaci', alternates: ['Thrips tabaci', 'Thrips'] },
  { id: '40000000-0000-0000-0000-000000000017', common_name: 'Melon fruit fly', scientific_name: 'Bactrocera cucurbitae', alternates: ['Bactrocera cucurbitae', 'Bactrocera'] },
  { id: '40000000-0000-0000-0000-000000000018', common_name: 'Marmalade hoverfly', scientific_name: 'Episyrphus balteatus', alternates: ['Episyrphus balteatus', 'Episyrphus'] },
  { id: '40000000-0000-0000-0000-000000000019', common_name: 'Migratory locust', scientific_name: 'Locusta migratoria', alternates: ['Locusta migratoria', 'Locusta'] },
  { id: '40000000-0000-0000-0000-000000000020', common_name: 'Trichogramma wasp', scientific_name: 'Trichogramma chilonis', alternates: ['Trichogramma chilonis', 'Trichogramma'] },
  { id: '40000000-0000-0000-0000-000000000021', common_name: 'Western honey bee', scientific_name: 'Apis mellifera', alternates: ['Apis mellifera', 'Apis'] },
  { id: '40000000-0000-0000-0000-000000000022', common_name: 'Minute pirate bug', scientific_name: 'Orius laevigatus', alternates: ['Orius laevigatus', 'Orius'] },
  { id: '40000000-0000-0000-0000-000000000023', common_name: 'Brown planthopper', scientific_name: 'Nilaparvata lugens', alternates: ['Nilaparvata lugens', 'Nilaparvata'] },
  { id: '40000000-0000-0000-0000-000000000024', common_name: 'Common green lacewing', scientific_name: 'Chrysoperla carnea', alternates: ['Chrysoperla carnea', 'Chrysoperla'] },
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
 * Resolve a taxon, preferring the exact binomial and rejecting cross-genus hits.
 *
 * The genus gate is the load-bearing check. 00011 accepted Empoasca fabae for
 * Amrasca biguttula, Orius insidiosus for Orius laevigatus and Trichogramma
 * dendrolimi for T. chilonis: all are real insects in the right family, so a
 * looser "same family" or "looks like a pest" test would pass them, and each one
 * puts the wrong species behind the right name on a site whose whole point is
 * correct identification.
 */
async function resolveTaxon(names, expectedBinomial) {
  const rankWeight = { species: 0, subspecies: 1, variety: 2, genus: 3, family: 4 }
  const seen = new Map()

  for (const name of names) {
    try {
      const data = await getJson(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&per_page=20&locale=en`)
      for (const t of data.results ?? []) if (!seen.has(t.id)) seen.set(t.id, t)
    } catch {
      // Tolerant; the lineage and genus gates below decide the outcome.
    }
    await sleep(1100)
  }

  const wanted = names.map((n) => n.toLowerCase())
  const genus = expectedBinomial.split(' ')[0].toLowerCase()
  const verified = []

  for (const candidate of [...seen.values()].slice(0, 24)) {
    try {
      const full = await getJson(`https://api.inaturalist.org/v1/taxa/${candidate.id}?locale=en`)
      const record = full.results?.[0] ?? full
      const lineage = (record.ancestors ?? []).map((a) => a.name)
      // Animalia, and must be a member of the expected genus. Checking the genus
      // here rather than after the sort means an impostor never becomes a
      // candidate at all.
      if (!lineage.includes('Animalia')) continue
      const name = (record.name ?? '').toLowerCase()
      if (name !== genus && !name.startsWith(`${genus} `)) continue
      verified.push(record)
    } catch {
      // Skip; another candidate may verify.
    }
    await sleep(650)
  }

  if (verified.length === 0) throw new Error(`no ${genus} taxon matched`)

  // Exact binomial beats a genus fallback, then lower rank wins. A genus-level
  // result is not a photograph of this species, so it is only used when nothing
  // exact exists, and is reported so the substitution is visible.
  verified.sort((a, b) => {
    const aExact = wanted.includes((a.name ?? '').toLowerCase()) ? 0 : 1
    const bExact = wanted.includes((b.name ?? '').toLowerCase()) ? 0 : 1
    if (aExact !== bExact) return aExact - bExact
    return (rankWeight[a.rank] ?? 9) - (rankWeight[b.rank] ?? 9)
  })
  const hit = verified[0]
  // "Exact" must mean the database's binomial, not merely one of the search names.
  // The genus itself is always in `wanted`, so testing against that list would
  // report a genus-level fallback as exact and hide the substitution.
  const isExact = (hit.name ?? '').toLowerCase() === expectedBinomial.toLowerCase()

  return {
    id: hit.id,
    matched: hit.name,
    rank: hit.rank,
    exact: isExact,
    preferred: hit.preferred_common_name ?? null,
  }
}

function voteCount(obs) {
  const v = obs.votes
  if (typeof v === 'number') return v
  if (Array.isArray(v)) return v.length
  return 0
}

/**
 * Best research-grade, openly-licensed, non-captive photo. Widens cc0 -> cc-by.
 *
 * `photo_license` is the filter, never `license`. The latter applies to the
 * observation, and an observation can be CC-BY while its individual photos still
 * read "(c) Someone, all rights reserved", because the observer licensed the
 * record and left the images unlicensed. Selecting on it admits files that cannot
 * be republished, and photo.license_code is re-checked per photo for the same reason.
 */
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
        // iNat serves square/small/medium/large; the museum grid is three-up, so
        // anything below large looks soft on a retina display.
        const url = photo.url
          .replace('/square.', '/large.')
          .replace('/small.', '/large.')
          .replace('/medium.', '/large.')
        return {
          url,
          license: photo.license_code,
          attribution: photo.attribution ?? null,
          observationUrl: obs.uri,
          observationId: obs.id,
          photoId: photo.id,
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

for (const spec of SPECIMENS) {
  try {
    const taxon = await resolveTaxon(spec.alternates, spec.scientific_name)
    const photo = await bestPhoto(taxon.id)
    if (!photo) {
      failed.push({ ...spec, why: 'no cc0/cc-by research-grade photo' })
      console.log(`  MISS  ${spec.common_name.padEnd(30)} — no openly licensed photo`)
    } else {
      results.push({ ...spec, taxonId: taxon.id, matched: taxon.matched, exact: taxon.exact, ...photo })
      console.log(
        `  ok    ${spec.common_name.padEnd(30)} ${String(taxon.matched).padEnd(28)} ${photo.license.padEnd(5)}` +
          ` votes=${String(photo.votes).padStart(3)}${taxon.exact ? '' : '  (genus fallback)'}`,
      )
    }
  } catch (error) {
    failed.push({ ...spec, why: error instanceof Error ? error.message : 'failed' })
    console.log(`  MISS  ${spec.common_name.padEnd(30)} — ${error instanceof Error ? error.message : 'failed'}`)
  }
  await sleep(500)
}

console.log(`\nsourced: ${results.length} / ${SPECIMENS.length}   failed: ${failed.length}`)
const fallbacks = results.filter((r) => !r.exact)
if (fallbacks.length) {
  console.log('\n-- genus-level fallback: the photo is the right genus but not the exact species --')
  for (const f of fallbacks) console.log(`--   ${f.common_name.padEnd(30)} db=${f.scientific_name} got=${f.matched}`)
}
if (failed.length) {
  console.log('\n-- no usable photo; these keep their current image --')
  for (const f of failed) console.log(`--   ${f.common_name.padEnd(30)} (${f.why})`)
}

if (process.argv.includes('--write')) {
  const target = 'src/data/specimen-photos.json'
  await fs.writeFile(
    target,
    JSON.stringify(
      {
        generatedFrom: 'iNaturalist API',
        replaces: 'supabase/migrations/00011_add_insect_images_and_orders.sql (Wikimedia Commons)',
        licences: [...ALLOWED],
        specimens: results,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )
  console.log(`\nwrote ${target}`)
}
