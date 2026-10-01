/**
 * Check the licence of the 24 Wikimedia-sourced species photos.
 *
 * These were seeded by migration 00011 from upload.wikimedia.org, then copied
 * into our own bucket by scripts/host-specimen-images.mjs to dodge Wikimedia's
 * rate limiting. That copy removed the filename that identifies the Commons file,
 * so the origin has to be recovered from migration 00011, which is the only place
 * the original URLs survive.
 *
 * Wikimedia Commons is overwhelmingly CC BY-SA or public domain, but CC BY-SA is
 * share-alike: publishing a modified copy under it imposes obligations on the
 * whole derivative work, which an image embedded in an app is not obviously
 * compatible with. "Stable" and "hotlink-friendly" in that migration's comment
 * refer to availability, not licensing, so this has to be checked per file rather
 * than assumed from the source host.
 *
 * Commons is not reliably reachable from this environment, so a file that cannot
 * be resolved is reported as unverified rather than assumed compliant.
 *
 *   node scripts/audit-wikimedia-licences.mjs
 */
import fs from 'node:fs'

const UA = { 'User-Agent': 'EntomoLens/1.0 (licence audit; contact via repo)' }
const OK_LICENCES = ['cc0', 'public domain', 'cc-by', 'pd']

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Extract (common_name, commons URL) pairs from migration 00011. */
function seededUrls() {
  const sql = fs.readFileSync('supabase/migrations/00011_add_insect_images_and_orders.sql', 'utf8')
  const rows = []
  for (const line of sql.split(/\r?\n/)) {
    const url = line.match(/'(https:\/\/upload\.wikimedia\.org[^']+)'/)
    if (!url) continue
    const name = line.match(/^\s*update public\.insects set images = array\['.*?'\s*\)\s*where common_name = '([^']+)'/i)
    rows.push({
      commonName: name?.[1] ?? null,
      url: url[1],
      file: url[1].replace(/^\/wikipedia\/commons\/thumb\//, '').split('/').pop(),
    })
  }
  return rows
}

/**
 * Commons thumb URLs encode the real filename:
 *   /thumb/a/a7/Name.jpg/500px-Name.jpg  ->  a7/Name.jpg
 * The middle path segment is the first two hex digits of the MD5 of the filename.
 */
function commonsFilename(thumbUrl) {
  if (thumbUrl.includes('/thumb/')) {
    const after = thumbUrl.replace('/wikipedia/commons/thumb/', '')
    const sizeMatch = after.match(/\/(\d+)px-/)
    if (sizeMatch) return after.slice(0, sizeMatch.index)
    const parts = after.split('/')
    return parts.length >= 3 ? parts.slice(0, 3).join('/') : after
  }
  // Not a thumbnail: the URL is the original file, so the name is already right.
  // Without this branch the script returned the literal string
  // "upload.wikimedia.org" for the one species whose image was a direct link.
  return thumbUrl.replace('/wikipedia/commons/', '')
}

async function main() {
  const rows = seededUrls()
  console.log(`Wikimedia-sourced species images in 00011: ${rows.length}\n`)

  // Map each commons file back to the species we actually serve, via the bucket
  // slug (scientific name + last 4 of the row id).
  const insects = await (
    await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/insects?select=id,common_name,scientific_name,images&images=not.is.null&order=common_name`,
      {
        headers: {
          apikey: env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(30000),
      },
    )
  ).json()

  const byName = new Map(insects.map((i) => [i.common_name, i]))
  const unverified = []
  const byLicence = new Map()
  let checked = 0

  for (const row of rows) {
    const file = commonsFilename(row.url)
    const name = decodeURIComponent(file.split('/').pop())

    // Query the Commons API for this file's licence. thumb URLs are not
    // resolvable directly, so the file title is what must be asked about.
    let data
    try {
      const res = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo` +
          `&iiprop=extmetadata|url&titles=${encodeURIComponent(`File:${name}`)}`,
        { headers: UA, signal: AbortSignal.timeout(25000) },
      )
      if (!res.ok) {
        unverified.push(`${name}: Commons API HTTP ${res.status}`)
        continue
      }
      data = await res.json()
    } catch (error) {
      unverified.push(`${name}: ${error.message}`)
      continue
    }

    const pages = data?.query?.pages ?? {}
    const page = Object.values(pages)[0]
    if (!page || page.missing !== undefined) {
      unverified.push(`${name}: file not found on Commons`)
      continue
    }

    const meta = page.imageinfo?.[0]?.extmetadata ?? {}
    const licence = (meta.LicenseShortName?.value ?? 'unknown').toLowerCase()
    const author = (meta.Artist?.value ?? 'unknown').replace(/<[^>]*>/g, '').trim()
    byLicence.set(licence, (byLicence.get(licence) ?? 0) + 1)
    checked += 1

    const served = row.commonName ? byName.get(row.commonName) : null
    const slug = served
      ? String(served.images[0] ?? '').split('/').pop()
      : '(not served)'

    const flags = []
    if (!OK_LICENCES.some((ok) => licence.includes(ok))) flags.push('NOT in allowed set')
    if (/nc|nd/.test(licence)) flags.push('NON-COMMERCIAL or NO-DERIV')
    if (/sa/.test(licence)) flags.push('SHARE-ALIKE: derivative obligations')
    if (author === 'unknown') flags.push('no author recorded')

    console.log(
      `${flags.length ? 'CHECK' : 'ok   '} ${name.slice(0, 52).padEnd(53)} ${licence.padEnd(22)}` +
        ` ${slug}${flags.length ? `  <- ${flags.join('; ')}` : ''}`,
    )

    await sleep(250)
  }

  console.log('\n-- licence distribution --')
  for (const [licence, count] of [...byLicence].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(count).padStart(3)}  ${licence}`)
  }
  if (unverified.length) {
    console.log('\n-- could not verify (Commons unreachable from here) --')
    for (const u of unverified) console.log(`--   ${u}`)
  }
  console.log(`\nchecked: ${checked} / ${rows.length}   unverified: ${unverified.length}`)
}

await main()
