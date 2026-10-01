/**
 * Remove objects left behind by a bad run.
 *
 * Supabase Storage has no rename, so a fix means uploading under the correct key
 * and deleting the stale one. This exists because a previous version of
 * scripts/host-specimen-photos.mjs derived the object key with a slice that ate two
 * characters and published "-ina.jpg" for 20 files.
 *
 * Deleting is destructive, so it is dry-run by default and lists exactly what it
 * would remove. Pass --apply to delete.
 *
 *   node scripts/remove-stale-objects.mjs                    # list
 *   node scripts/remove-stale-objects.mjs --apply            # delete
 *   node scripts/remove-stale-objects.mjs --prefix ina       # different prefix
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const BUCKET = 'insect-images'
const prefixIndex = process.argv.indexOf('--prefix')
const PREFIX = prefixIndex > -1 ? process.argv[prefixIndex + 1] : 'ina'
const apply = process.argv.includes('--apply')

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required: listing objects needs write scope.')
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
if (error) throw error

/**
 * Match only the exact broken pattern, never a bare substring.
 *
 * The first version filtered on `name.includes('ina')`, which also matched
 * "orthetrum-sabina.jpg" and "perla-marginata.jpg" — two live images belonging to
 * other species. A substring match on a short suffix is not safe for a delete.
 * The broken keys are the 4-digit row id, the taxon slug, then "-ina" and an
 * extension, so the id anchor plus an explicit suffix boundary is what separates
 * them.
 */
const STALE = new RegExp(`^\\d{4}-[a-z0-9-]+${PREFIX}\\.(?:jpe?g|png|webp)$`, 'i')

const stale = (data ?? []).map((o) => o.name).filter((name) => STALE.test(name))

console.log(`objects matching "${PREFIX}": ${stale.length}`)
for (const name of stale) console.log(`  ${name}`)

if (stale.length === 0) {
  console.log('\nnothing to remove.')
  process.exit(0)
}

if (!apply) {
  console.log('\ndry run. Re-run with --apply to delete these.')
  process.exit(0)
}

const { error: delError } = await supabase.storage.from(BUCKET).remove(stale)
if (delError) throw delError
console.log(`\ndeleted ${stale.length}`)
