/**
 * Source verified, licence-safe photos for the extended species set.
 *
 * Why iNaturalist instead of Wikimedia Commons
 * --------------------------------------------
 * Commons is unreachable from this environment (commons.wikimedia.org answers
 * ECONNRESET, and WebFetch is blocked too), and guessing thumb URLs only
 * verified 1 of 20. iNaturalist is reachable, documents its API, and — the
 * part that actually matters — lets us filter to a specific licence, so the
 * images in the museum are safe to publish.
 *
 * Licence policy
 * --------------
 * cc0     preferred: public domain, no attribution obligation.
 * cc-by   accepted, but attribution is required, so the photographer and licence
 *         are recorded in image_attribution.json for the species page to show.
 * cc-by-nc and all other NC licences are rejected outright: this is a
 * agricultural extension site, and non-commercial terms are not something the
 * project can guarantee it will honour later.
 *
 * Only research-grade observations are considered, and captive/cultivated ones
 * are excluded, because a photo of a pinned museum specimen or a zoo animal is
 * a poor stand-in for a live field insect.
 *
 *   node scripts/source-species-photos.mjs          # survey only
 *   node scripts/source-species-photos.mjs --write  # also write the json
 */
import fs from 'node:fs/promises'

const UA = { 'User-Agent': 'EntomoLens/1.0 (species photo sourcing)' }
const ALLOWED = new Set(['cc0', 'cc-by'])

// One representative species per still-empty order, chosen for reliable
// identification and, where possible, for relevance to Indian cropping.
// `search` lists the names to try, most specific first. Several orders are
// monotypic or near-monotypic, so a species name returns nothing and the
// genus/family is what actually carries observations.
const SPECIES = [
  // Archaeognatha needs the order-rank taxon: iNaturalist's species-level
  // coverage here is thin, but the order itself carries 46 cc0 and 317 cc-by
  // research observations. Requesting the order is legitimate — it *is* the
  // taxon, and the row is a genus-level placeholder either way.
  { name: 'Archaeognatha sp.', search: ['Archaeognatha'], order: 'Archaeognatha', note: 'jumping bristletail', alt: ['Archaeognatha'] },
  { name: 'Ctenolepisma longicaudata', search: ['Ctenolepisma longicaudata', 'Ctenolepisma'], order: 'Zygentoma', note: 'silverfish, stored grain' },
  { name: 'Cloeon dipterum', search: ['Cloeon dipterum', 'Cloeon'], order: 'Ephemeroptera', note: 'mayfly, fish food' },
  { name: 'Orthetrum sabina', search: ['Orthetrum sabina', 'Orthetrum'], order: 'Odonata', note: 'dragonfly, predator' },
  { name: 'Perla marginata', search: ['Perla marginata', 'Perla'], order: 'Plecoptera', note: 'stonefly, clean-water indicator' },
  { name: 'Forficula auricularia', search: ['Forficula auricularia', 'Forficula'], order: 'Dermaptera', note: 'earwig' },
  { name: 'Zorotypus sp.', search: ['Zorotypus', 'Zoraptera'], order: 'Zoraptera', note: 'angel insect' },
  { name: 'Mantis religiosa', search: ['Mantis religiosa', 'Mantis'], order: 'Mantodea', note: 'predator of crop pests' },
  { name: 'Reticulitermes flavipes', search: ['Reticulitermes flavipes', 'Reticulitermes'], order: 'Blattodea', note: 'subterranean termite, major pest' },
  { name: 'Grylloblatta sp.', search: ['Grylloblatta campodeiformis', 'Grylloblatta'], order: 'Grylloblattodea', note: 'ice crawler', alt: ['Notoptera', 'Grylloblattina'] },
  { name: 'Mantophasma sp.', search: ['Mantophasma', 'Mantophasmatidae'], order: 'Mantophasmatodea', note: 'gladiator insect' },
  { name: 'Phyllium sp.', search: ['Phyllium', 'Phylliidae', 'Cryptophyllium'], order: 'Phasmatodea', note: 'leaf insect', alt: ['Phasmida', 'Verophasmatodea'] },
  { name: 'Oligotoma saundersii', search: ['Oligotoma saundersii', 'Oligotoma'], order: 'Embioptera', note: 'webspinner' },
  { name: 'Liposcelis bostrychophila', search: ['Liposcelis bostrychophila', 'Liposcelis'], order: 'Psocodea', note: 'booklouse' },
  { name: 'Corydalus cornutus', search: ['Corydalus cornutus', 'Corydalus'], order: 'Megaloptera', note: 'dobsonfly' },
  { name: 'Raphidia ophiopsis', search: ['Raphidia ophiopsis', 'Raphidia'], order: 'Raphidioptera', note: 'snakefly' },
  { name: 'Panorpa communis', search: ['Panorpa communis', 'Panorpa'], order: 'Mecoptera', note: 'scorpionfly' },
  { name: 'Ctenocephalides felis', search: ['Ctenocephalides felis', 'Ctenocephalides'], order: 'Siphonaptera', note: 'flea' },
  { name: 'Limnephilus lunatus', search: ['Limnephilus lunatus', 'Limnephilus'], order: 'Trichoptera', note: 'caddisfly' },
  { name: 'Stylops melittae', search: ['Stylops melittae', 'Stylops'], order: 'Strepsiptera', note: 'bee parasite' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * GET JSON with retry on 429 and 5xx.
 *
 * The ancestors-verification pass issues dozens of requests, which is enough to
 * trip the API's rate limiter, and a naive caller then reports the order as
 * having no photo when in fact the request was simply throttled. Honour
 * Retry-After and back off exponentially.
 */
async function getJson(url, attempt = 1) {
  if (attempt > 5) throw new Error('gave up after 5 attempts')
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })
  if (res.status === 429 || res.status >= 500) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 2000 * 2 ** (attempt - 1)
    process.stdout.write(`    ${res.status}, backing off ${Math.round(waitMs / 1000)}s\n`)
    await sleep(waitMs)
    return getJson(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Resolve a taxon and *prove* it belongs to the intended order.
 *
 * A bare name search is unreliable in both directions. It returns nothing for
 * monotypic orders whose name doubles as a rank, and it happily returns a taxon
 * from a different order entirely — asking for "Lepismatidae" yields silverfish,
 * which are Zygentoma, not the bristletails of Archaeognatha. Seeding a species
 * row with that would have filed a silverfish under the wrong order heading.
 *
 * Note that iNaturalist does not always use modern ranks: it files Grylloblattodea
 * as a *suborder* of Notoptera, so its own `rank` is never "order" for these taxa.
 * Membership is therefore tested against the ancestors list, not the rank field.
 *
 * Candidates are gathered from several names, because a genus is often the only
 * rank with any observations. Every finalist is confirmed against its ancestors.
 */
async function resolveTaxon(names, expectedOrder, alternates) {
  const rankWeight = { species: 0, subspecies: 1, genus: 2, family: 3, suborder: 3.5, order: 4 }
  const seen = new Map()

  for (const name of names) {
    try {
      const data = await getJson(
        `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&per_page=20&locale=en`,
      )
      for (const t of data.results ?? []) {
        if (!seen.has(t.id)) seen.set(t.id, t)
      }
    } catch {
      // Partial failure here is tolerable; the ancestors pass decides the outcome.
    }
    await sleep(1200)
  }

  const verified = []
  for (const candidate of [...seen.values()].slice(0, 24)) {
    try {
      const full = await getJson(`https://api.inaturalist.org/v1/taxa/${candidate.id}?locale=en`)
      const record = full.results?.[0] ?? full
      const ancestors = (record.ancestors ?? []).map((a) => a.name)
      // iNaturalist's own order assignment differs from current consensus for
      // several of these: Phyllium sits under Insecta > Pterygota > Phasmida,
      // not directly under an order, so the rank immediately below Insecta is
      // Pterygota and tells us nothing. Membership is therefore accepted on the
      // expected order, on any caller-supplied alternate anywhere in the lineage
      // (Phasmida, Verophasmatodea), or on the taxon name itself matching.
      const allowed = [expectedOrder, ...(alternates ?? [])]
      const inLineage = allowed.some((name) => ancestors.includes(name))
      if (record.name === expectedOrder || inLineage) {
        verified.push(record)
      }
    } catch {
      // Skip this candidate; another may verify.
    }
    await sleep(700)
  }

  if (verified.length === 0) {
    throw new Error(`no taxon in ${expectedOrder}`)
  }
  verified.sort((a, b) => (rankWeight[a.rank] ?? 9) - (rankWeight[b.rank] ?? 9))
  const hit = verified[0]
  return { id: hit.id, matched: hit.name, rank: hit.rank, preferred: hit.preferred_common_name ?? null }
}

/** iNat returns votes as an array of objects; reduce it to a sortable number. */
function voteCount(obs) {
  const v = obs.votes
  if (typeof v === 'number') return v
  if (Array.isArray(v)) return v.length
  return 0
}

/**
 * Best research-grade, openly-licensed, non-captive photo for a taxon.
 *
 * Widens licence from cc0 to cc-by rather than the reverse, and prefers
 * cc-by-nc over nothing only as a last resort that is *not* taken: those are
 * rejected so the museum never ships a non-commercial image.
 */
async function bestPhoto(taxonId) {
  for (const licenses of ['cc0', 'cc-by']) {
    const data = await getJson(
      `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&photos=true` +
        `&quality_grade=research&photo_license=${licenses}&captive=false` +
        `&order_by=votes&per_page=30&locale=en`,
    )
    const ranked = (data.results ?? [])
      .slice()
      .sort((a, b) => voteCount(b) - voteCount(a))
    for (const obs of ranked) {
      for (const photo of obs.photos ?? []) {
        if (!ALLOWED.has(photo.license_code)) continue
        if (!/^https?:/.test(photo.url ?? '')) continue
        return {
          url: photo.url.replace('/square.', '/large.'),
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

for (const spec of SPECIES) {
  try {
    const taxon = await resolveTaxon(spec.search, spec.order, spec.alt)
    const photo = await bestPhoto(taxon.id)
    if (!photo) {
      failed.push({ ...spec, why: 'no cc0/cc-by research-grade photo' })
      console.log(`  MISS  ${spec.name.padEnd(26)} (${spec.order}) — no openly licensed photo`)
    } else {
      results.push({ ...spec, taxonId: taxon.id, matched: taxon.matched, ...photo })
      console.log(
        `  ok    ${spec.name.padEnd(22)} (${spec.order.padEnd(19)}) ${String(taxon.matched).padEnd(22)} ${photo.license.padEnd(5)} votes=${String(photo.votes).padStart(3)}`,
      )
    }
  } catch (error) {
    failed.push({ ...spec, why: error instanceof Error ? error.message : 'failed' })
    console.log(`  MISS  ${spec.name.padEnd(26)} (${spec.order}) — ${error instanceof Error ? error.message : 'failed'}`)
  }
  await sleep(600)
}

console.log(`\nsourced: ${results.length} / ${SPECIES.length}   failed: ${failed.length}`)
if (failed.length) {
  console.log('\n-- no usable photo; these orders will ship without one --')
  for (const f of failed) console.log(`--   ${f.order.padEnd(20)} ${f.name}  (${f.why})`)
}

if (process.argv.includes('--write')) {
  const target = 'src/data/species-photos.json'
  await fs.writeFile(
    target,
    JSON.stringify(
      { generatedFrom: 'iNaturalist API', licences: [...ALLOWED], photos: results },
      null,
      2,
    ) + '\n',
    'utf8',
  )
  console.log(`\nwrote ${target}`)
}
