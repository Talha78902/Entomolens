/**
 * Audit the licence of every image the site serves.
 *
 * iNaturalist's `license` query parameter filters on the *observation* licence,
 * while `photo_license` filters on the individual photo. They disagree in
 * practice: an observation can be tagged cc-by while its photos still read
 * "(c) Someone, all rights reserved", because the observer licensed the
 * observation and left the images unlicensed. Selecting on the observation
 * licence therefore admits photos that cannot legally be republished.
 *
 * Every served image has been rehosted into our own bucket, so the database URL
 * hides the originating iNat photo id. This script recovers the original source
 * URL from the manifests and fetches each photo record directly, which is the
 * only authoritative answer to "may I republish this file". It also cross-checks
 * the licence the manifest claims, so a stale or wrong claim is caught.
 *
 *   node scripts/audit-photo-licences.mjs
 */
import fs from 'node:fs'

const UA = { 'User-Agent': 'EntomoLens/1.0 (licence audit)' }
const ALLOWED = new Set(['cc0', 'cc-by'])

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const problems = []
const unverifiable = []
let clean = 0

/** iNat photo ids are the numeric segment of any /photos/<id>/ URL. */
const photoId = (url) => url?.match(/\/photos\/(\d+)\//)?.[1] ?? null

/** Wikimedia carries no per-image licence in iNat; report separately. */
const isWikimedia = (url) => /wikimedia/.test(url)

/**
 * Fetch one photo's own record.
 *
 * iNat has no /v1/photos/:id endpoint, so a photo can only be resolved through an
 * observation. The manifests record `observationUrl`, which carries the id.
 */
async function fetchPhoto(entry) {
  const obsId = entry.observationUrl?.match(/observations\/(\d+)/)?.[1]
  if (!obsId) return { error: 'no observation id in manifest' }

  const res = await fetch(`https://api.inaturalist.org/v1/observations/${obsId}`, {
    headers: UA,
    signal: AbortSignal.timeout(30000),
  })
  if (res.status === 404) return { error: `observation ${obsId} not found` }
  if (!res.ok) return { error: `observation ${obsId} -> HTTP ${res.status}` }

  const body = await res.json()
  const obs = body.results?.[0] ?? body
  const id = Number(photoId(entry.url))
  const photo = (obs.photos ?? []).find((p) => Number(p.id) === id)
  if (!photo) return { error: `photo ${id} not present on observation ${obsId}` }

  return {
    photo,
    // The observation's own licence, kept for comparison: this is the field that
    // can look open while the individual photo is not.
    observationLicense: (obs.license_code ?? '').toLowerCase(),
  }
}

/**
 * Normalise a taxon name into a match key.
 *
 * Handles the "Genus species" form, the "Genus species sp." placeholder used for
 * orders with no species-level observations, and binomials written without a
 * space ("Ctenolepisma longicaudatum" is a misspelling in the bucket filename).
 */
function taxonKey(name) {
  const cleaned = String(name ?? '')
    .toLowerCase()
    .replace(/\bsp\.$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Collapse to genus + species, dropping any author citation.
  const parts = cleaned.split(' ').slice(0, 2).map((p) => p.replace(/[^a-z-]/g, ''))
  return parts.filter(Boolean).join(' ')
}

function loadManifests() {
  const entries = []
  for (const file of ['src/data/species-photos.json', 'src/data/crop-photos.json']) {
    if (!fs.existsSync(file)) continue
    const body = JSON.parse(fs.readFileSync(file, 'utf8'))
    for (const p of body.photos ?? body.crops ?? []) {
      entries.push({
        label: p.name,
        taxon: p.scientific_name ?? p.matched ?? null,
        url: p.url,
        license: p.license ?? null,
        attribution: p.attribution ?? null,
        observationUrl: p.observationUrl ?? null,
        manifest: file.split('/').pop(),
      })
    }
  }
  return entries
}

/** Fetch the authoritative photo record and check its own licence. */
async function audit(entry, label) {
  const id = photoId(entry.url)

  let result
  try {
    result = await fetchPhoto(entry)
  } catch (error) {
    problems.push(`${label}: photo ${id} -> ${error.message}`)
    return
  }

  if (result.error) {
    unverifiable.push(`${label}: ${result.error}`)
    return
  }

  const { photo, observationLicense } = result
  const licence = (photo.license_code ?? '').toLowerCase()
  const attribution = photo.attribution ?? ''
  // iNat's own convention: "(c) Name, all rights reserved" means the file is NOT
  // licensed, even when the surrounding observation carries a licence.
  const reserved = /all rights reserved/i.test(attribution) && !/\(CC/i.test(attribution)

  if (!ALLOWED.has(licence) || reserved) {
    problems.push(
      `${label}: photo ${id} licence="${licence || 'none'}" attribution="${attribution}"` +
        ` observation=${observationLicense || 'none'}` +
        (entry.license ? ` manifest claims ${entry.license}` : ''),
    )
    return
  }

  clean += 1
  const notes = []
  if (entry.license && entry.license !== licence) notes.push(`manifest says ${entry.license}`)
  if (observationLicense && observationLicense !== licence) notes.push(`obs is ${observationLicense}`)
  const suffix = notes.length ? `  <- ${notes.join(', ')}` : ''
  console.log(`ok    ${label.padEnd(30)} photo ${id.padEnd(10)} ${licence.padEnd(6)}${suffix}`)
}

/**
 * Audit a species that predates the manifests.
 *
 * The bucket filename carries no source id, so the match is made by searching
 * iNat for the taxon and finding an observation whose photo set contains a file
 * of the same name. Filenames were derived from the taxon at download time, so a
 * matching name is strong evidence of the same original photo.
 */
async function auditSeeded(insect, served) {
  const slug = served.split('/').pop()

  let data
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(insect.scientific_name)}` +
        `&photos=true&quality_grade=research&per_page=200&order_by=votes&photo_license=cc0,cc-by&locale=en`,
      { headers: UA, signal: AbortSignal.timeout(30000) },
    )
    if (!res.ok) {
      unverifiable.push(`${insect.common_name}: search failed HTTP ${res.status}`)
      return
    }
    data = await res.json()
  } catch (error) {
    unverifiable.push(`${insect.common_name}: ${error.message}`)
    return
  }

  // iNat ids are stable across URL hosts: .../photos/<id>/large.jpeg and
  // .../photos/<id>/medium.jpg are the same file, so compare on the id alone.
  const wantedId = photoId(served)

  for (const obs of data.results ?? []) {
    const match = (obs.photos ?? []).find((p) => {
      if (wantedId && Number(p.id) === Number(wantedId)) return true
      return p.url?.includes(`/photos/${slug.replace(/\.[a-z]+$/i, '')}-`) ||
        p.url?.endsWith(`/${slug}`)
    })
    if (!match) continue

    const licence = (match.license_code ?? '').toLowerCase()
    const reserved =
      /all rights reserved/i.test(match.attribution ?? '') && !/\(CC/i.test(match.attribution ?? '')

    if (!ALLOWED.has(licence) || reserved) {
      problems.push(
        `${insect.common_name}: photo ${match.id} licence="${licence || 'none'}"` +
          ` attribution="${match.attribution ?? ''}" observation=${obs.license_code ?? 'none'}` +
          ` (observation ${obs.id})`,
      )
    } else {
      clean += 1
      const obsMismatch =
        (obs.license_code ?? '').toLowerCase() !== licence
          ? `  <- obs is ${obs.license_code}`
          : ''
      console.log(`ok    ${insect.common_name.padEnd(30)} photo ${String(match.id).padEnd(10)} ${licence.padEnd(6)}${obsMismatch}`)
    }
    return
  }

  unverifiable.push(
    `${insect.common_name}: no iNat photo matching ${slug} among ` +
      `${(data.results ?? []).length} candidate observations`,
  )
}

async function main() {
  const res = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/insects?select=common_name,scientific_name,images` +
      `&images=not.is.null&order=common_name`,
    {
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(30000),
    },
  )
  if (!res.ok) throw new Error(`insects query failed: HTTP ${res.status} ${await res.text()}`)
  const insects = await res.json()

  const entries = loadManifests()

  // The 24 species seeded by migration 00008 predate every manifest, so their
  // provenance has to be reconstructed from the observation itself: search iNat
  // for the taxon and look for one of our bucket filenames among its photos.
  const seeded = insects.filter(
    (i) =>
      !entries.some(
        (e) => taxonKey(e.taxon) === taxonKey(i.scientific_name) || taxonKey(e.label) === taxonKey(i.scientific_name),
      ),
  )

  console.log(`species served: ${insects.length}   manifest entries: ${entries.length}   seeded-only: ${seeded.length}\n`)

  const seen = new Set()
  for (const insect of insects) {
    const served = Array.isArray(insect.images) ? insect.images[0] : insect.images
    if (!served) continue

    if (isWikimedia(served)) {
      unverifiable.push(`${insect.common_name}: Wikimedia source (${served})`)
      continue
    }

    const entry = entries.find(
      (e) => taxonKey(e.taxon) === taxonKey(insect.scientific_name),
    )
    if (entry) {
      if (seen.has(entry.url)) continue
      seen.add(entry.url)
      await audit(entry, insect.common_name)
      continue
    }

    await auditSeeded(insect, served)
  }

  if (unverifiable.length) {
    console.log('\n-- could not verify through the iNat photo API --')
    for (const u of unverifiable) console.log(`--   ${u}`)
  }

  if (problems.length) {
    console.log('\n-- LICENCE PROBLEMS: these must not be republished --')
    for (const p of problems) console.log(`!!   ${p}`)
    process.exitCode = 1
  }

  console.log(
    `\nverified open licence: ${clean}   problems: ${problems.length}   unverifiable: ${unverifiable.length}`,
  )
}

await main()
