/**
 * Coverage probe: how many of the 36 life_cycles stages have a stage-specific
 * Commons photograph, and under which licence?
 *
 * Commons is the right source here for a structural reason. iNaturalist has no
 * life-stage field, so a stage has to be inferred from free text and the
 * inference is unreliable. Commons files are filed into categories whose names
 * carry the stage ("Coccinella septempunctata larvae"), so the stage is part of
 * the metadata rather than a guess about a caption.
 *
 * Read-only probe: searches and reads licence metadata, downloads nothing.
 *
 * Note on access. commons.wikimedia.org is unreachable from this environment at
 * the TLS layer, but two other Wikimedia hosts work and between them cover the
 * whole job:
 *   api.wikimedia.org    search + file metadata (needs a descriptive User-Agent)
 *   upload.wikimedia.org  the image bytes (same User-Agent requirement)
 * Wikimedia returns 400/429 to requests without a contact URL in the User-Agent,
 * so every request here carries one and runs sequentially with a small delay.
 *
 *   node scripts/probe-commons-coverage.mjs
 */
const UA = 'Entomolens/1.0 (https://github.com/Talha78902/Entomolens; educational insect life-cycle reference) node-fetch'
const API = 'https://api.wikimedia.org/core/v1/commons'

const HEADERS = { 'User-Agent': UA, Accept: 'application/json' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const STAGES = {
  'Bemisia tabaci': ['egg', 'nymph', 'pupa', 'adult'],
  'Aphis gossypii': ['nymph', 'adult'],
  'Helicoverpa armigera': ['egg', 'larva', 'pupa', 'adult'],
  'Spodoptera frugiperda': ['egg', 'larva', 'pupa', 'adult'],
  'Pectinophora gossypiella': ['egg', 'larva', 'pupa', 'adult'],
  'Leucinodes orbonalis': ['egg', 'larva', 'pupa', 'adult'],
  'Coccinella septempunctata': ['egg', 'larva', 'pupa', 'adult'],
  'Thrips tabaci': ['egg', 'nymph', 'pupa', 'adult'],
  'Nilaparvata lugens': ['nymph', 'adult'],
  'Chrysoperla carnea': ['egg', 'larva', 'pupa', 'adult'],
}

/** Words a stage may appear as in a Commons category or file title. */
const STAGE_WORDS = {
  egg: ['egg', 'eggs', 'oviposition', 'ootheca'],
  larva: ['larva', 'larvae', 'caterpillar', 'caterpillars', 'caterpillar '],
  nymph: ['nymph', 'nymphs'],
  pupa: ['pupa', 'pupae', 'pupal'],
  adult: ['adult', 'adults', 'imago', 'moth', 'fly', 'beetle', 'wasp', 'bug'],
}

/** Titles that are charts, maps or damage shots rather than a portrait of the stage. */
const REJECT = /\b(map|distribution|scale)\b/i

/** Counters so a silently failing request cannot be mistaken for "no results". */
const stats = { ok: 0, html: 0, status: 0, network: 0 }

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let res
    try {
      res = await fetch(url, { headers: HEADERS })
    } catch {
      stats.network += 1
      await sleep(1200 * (attempt + 1))
      continue
    }

    if (res.status === 429 || res.status >= 500) {
      stats.status += 1
      await sleep(1500 * (attempt + 1))
      continue
    }

    const type = res.headers.get('content-type') ?? ''
    const body = await res.text()

    // Wikimedia answers some requests with an HTML error page under a 200, so a
    // JSON parse failure here is a real condition to count, not an exception.
    if (!type.includes('application/json') && !body.trimStart().startsWith('{')) {
      stats.html += 1
      return null
    }

    try {
      stats.ok += 1
      return JSON.parse(body)
    } catch {
      stats.html += 1
      return null
    }
  }
  return null
}

/**
 * Build a REST path segment for a Commons title.
 *
 * The endpoint requires underscores, not %20. Given `File:NIE 1905 Grass-worm.png`
 * it answers 200 text/html — a full MediaWiki HTML page rather than JSON — so a
 * plain encodeURIComponent silently loses the licence for every file. Cost a full
 * probe run to find: all 36 stages reported "unknown" licence despite the files
 * being perfectly good.
 */
function commonsPath(title) {
  return encodeURIComponent(title.replace(/ /g, '_'))
}

/** Only raster photographs. Rejects the PDFs, PPTs and scans that dominate results. */
const PHOTO_EXT = /\.(jpe?g|png|tiff?)$/i

/**
 * Subjects that are not the species being illustrated.
 *
 * Commons filenames often name a second organism: the stage picture may be of a
 * parasitoid, a predator or a pathogen rather than the pest. "Ichneumonid pupa
 * next to its victim" is a wasp pupa, not a Helicoverpa pupa, and "a silverleaf
 * whitefly nymph which has been parasitised by ... Eretmocerus hayati" is
 * dominated by the wasp. Matching a stage word alone puts those on the list.
 */
const OTHER_ORGANISM =
  /\b(wasp|ichneumon|ichneumonid|parasitoid|parasite|parasitised|parasitized|parasitism|predator|preying|spider|mite|ant|bee|fly parasitoid|hyperparasitoid|erotomorus|trichogramma|cotesia|braconid|chalcid|fig wasp|egg parasitoid)\b/i

/** Scans, research output, and diagram-like reconstructions rather than field photos. */
const NOT_A_PHOTO =
  /\b(diagram|chart|graph|internal structure|reconstructed|reconstruction|sex determination|report on|bulletin|journal|paper|thesis|dissertation|poster|presentation|slides|handbook|manual|plague|locust swarm distribution|damage)\b/i

/**
 * Reject a title that names a second organism.
 *
 * Commons filenames routinely include a parasitoid or predator: "Therion
 * circumflexum depositing an egg in Helicoverpa armigera" is a wasp ovipositing,
 * not a Helicoverpa egg. A hardcoded blocklist keeps missing these, so detect the
 * second Latin binomial instead — any capitalised genus followed by a lowercase
 * species epithet that is not the target's own.
 */
function namesSecondOrganism(title, scientific, common) {
  let bare = title.replace(/^File:/, '')

  // Remove the common name first: "Fall armyworm, eggs ..." otherwise reads as
  // the binomial "Fall armyworm" and the genuine egg photo gets rejected.
  if (common) {
    const esc = common.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    bare = bare.replace(new RegExp(esc, 'gi'), ' ')
  }

  const binomials = bare.match(/\b[A-Z][a-z]{3,}\s+[a-z]{4,}\b/g) ?? []
  const [targetGenus, targetEpithet] = scientific.split(' ')
  return binomials.some((b) => {
    const [g, e] = b.split(' ')
    return g !== targetGenus && e !== targetEpithet
  })
}

/** Requires the species, its genus, or the common name to appear in the title. */
function namesTarget(title, scientific, common) {
  const bare = title.replace(/^File:/, '').toLowerCase()
  const genus = scientific.split(' ')[0].toLowerCase()
  return (
    bare.includes(scientific.toLowerCase()) ||
    new RegExp(`\\b${genus}\\b`).test(bare) ||
    (common.length > 4 && bare.includes(common.toLowerCase()))
  )
}

async function search(q, limit = 12) {
  const url = `${API}/search/page?q=${encodeURIComponent(q)}&limit=${limit}`
  const j = await getJson(url)
  await sleep(120)
  return j?.pages ?? []
}

/** Licence lives on /page/, not /file/ — /file/ returns the download URL only. */
async function licenceFor(title) {
  const url = `${API}/page/${commonsPath(title)}`
  const j = await getJson(url)
  await sleep(120)
  return j?.license ?? null
}

/**
 * Classify a licence from its URL rather than its title.
 *
 * The API returns spelled-out names ("Creative Commons Attribution-Share Alike
 * 4.0"), so matching on short codes like "CC BY-SA 4" silently rejects everything
 * — which is exactly what the first run did, reporting 0/36 while the files were
 * in fact all freely licensed.
 */
function classify(lic) {
  const url = (lic?.url ?? '').toLowerCase()
  if (!url) return { code: 'unknown', ok: false }
  if (url.includes('publicdomain/zero')) return { code: 'CC0', ok: true }
  if (url.includes('publicdomain/mark')) return { code: 'PD', ok: true }
  if (/noncommercial|non-commercial/.test(url)) return { code: 'NC', ok: false }
  if (/noderiv|no-deriv/.test(url)) return { code: 'ND', ok: false }
  const m = url.match(/\/(by(?:-sa)?)\/(\d)/)
  if (m) return { code: m[1].toUpperCase().replace('-', '-') + ' ' + m[2], ok: true }
  return { code: url, ok: false }
}

const COMMON = {
  'Bemisia tabaci': 'silverleaf whitefly',
  'Aphis gossypii': 'cotton aphid',
  'Helicoverpa armigera': 'cotton bollworm',
  'Spodoptera frugiperda': 'fall armyworm',
  'Pectinophora gossypiella': 'pink bollworm',
  'Leucinodes orbonalis': 'brinjal shoot and fruit borer',
  'Coccinella septempunctata': 'seven-spot ladybird',
  'Thrips tabaci': 'onion thrips',
  'Nilaparvata lugens': 'brown planthopper',
  'Chrysoperla carnea': 'green lacewing',
}

/** Candidate queries for one species/stage, most structured first. */
function queriesFor(scientific, common, stage) {
  const genus = scientific.split(' ')[0]
  const slug = (s) => s.replace(/[ ,]/g, '_')
  return [
    `incategory:${slug(scientific)}_${slug(stage)}`,
    `deepcategory:"${scientific}" ${stage}`,
    `incategory:${slug(genus)}_${slug(stage)}`,
    `incategory:${slug(scientific)}_${slug(stage)}s`,
    `"${scientific}" ${stage}`,
    `${common} ${stage}`,
    `${common} ${stage} instar`,
  ]
}

const results = []
let queriesRun = 0

for (const [scientific, stages] of Object.entries(STAGES)) {
  const common = COMMON[scientific] ?? scientific
  for (const stage of stages) {
    const pool = []

    for (const q of queriesFor(scientific, common, stage)) {
      queriesRun += 1
      const pages = await search(q, 20)
      for (const p of pages) {
        const title = p.title
        if (!title) continue
        if (REJECT.test(title)) continue
        if (!PHOTO_EXT.test(title)) continue
        if (OTHER_ORGANISM.test(title)) continue
        if (NOT_A_PHOTO.test(title)) continue
        if (namesSecondOrganism(title, scientific, common)) continue
        if (!namesTarget(title, scientific, common)) continue
        const bare = title.replace(/^File:/, '')
        const words = STAGE_WORDS[stage] ?? []
        const mentionsStage = words.some((w) => bare.toLowerCase().includes(w))
        if (!mentionsStage) continue

        // Prefer structured matches: a file inside "<species> <stage>" is a far
        // better bet than one that merely has both words in its name.
        const structured = q.startsWith('incategory:') || q.startsWith('deepcategory:')
        pool.push({ title, matchedQuery: q, mentionsStage, score: (structured ? 2 : 0) + (bare.toLowerCase().includes(scientific.toLowerCase()) ? 1 : 0) })
      }
    }

    // dedupe, best score first, keep a shortlist
    const byTitle = new Map()
    for (const c of pool) {
      const prev = byTitle.get(c.title)
      if (!prev || c.score > prev.score) byTitle.set(c.title, c)
    }
    const found = [...byTitle.values()].sort((a, b) => b.score - a.score).slice(0, 3)

    // licence check only on the shortlisted candidates
    const licensed = []
    for (const f of found) {
      const lic = await licenceFor(f.title)
      const cls = classify(lic)
      licensed.push({
        ...f,
        licence: cls.code,
        licenceTitle: lic?.title ?? 'unknown',
        ok: cls.ok,
      })
    }

    const ok = licensed.filter((f) => f.ok)
    results.push({ scientific, stage, ok, rejected: licensed.filter((f) => !f.ok) })
  }
}

const covered = results.filter((r) => r.ok.length > 0)
const gaps = results.filter((r) => r.ok.length === 0)

console.log(`queries run: ${queriesRun}`)
console.log(`requests ok=${stats.ok} html-error=${stats.html} bad-status=${stats.status} network=${stats.network}`)
console.log(`stages with >=1 acceptable candidate: ${covered.length}/${results.length}`)
console.log(`stages with no candidate: ${gaps.length}\n`)

const licences = {}
for (const r of results) for (const f of r.ok) licences[f.licence] = (licences[f.licence] ?? 0) + 1
console.log('licences across shortlisted candidates:')
for (const [l, n] of Object.entries(licences).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${l}`)

console.log('\nper stage:')
for (const r of results) {
  const mark = r.ok.length ? 'OK  ' : 'GAP '
  const best = r.ok[0]
  console.log(`  ${mark}${r.scientific.padEnd(26)} ${r.stage.padEnd(6)} ${best ? best.licence : '-'}  ${best ? best.title.replace(/^File:/, '') : ''}`)
  for (const x of r.rejected) console.log(`        rejected licence: ${x.licence}  ${x.title.replace(/^File:/, '')}`)
}
