# EntomoLens

AI-powered insect identification, pest diagnosis and entomology intelligence for farmers, students, researchers and entomologists.

## Stack

- **Frontend:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Router, TanStack Query, leaflet (react-leaflet), lucide-react
- **Backend:** Supabase (Postgres + RLS + storage + auth), serverless functions in `api/` using Gemini vision for image analysis and Groq for text (identification fallback, damage diagnosis, EntomoAI chat)
- **Deploy:** Vercel (SPA rewrites + serverless functions)

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Supabase, Groq and Gemini keys
npm run dev
```

### Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `GROQ_API_KEY` | Groq API key for the text side of `/api/identify`, `/api/damage`, `/api/assistant` |
| `GROQ_MODEL` | Groq text model id |
| `GEMINI_API_KEY` | Google AI Studio key, used **only** for the image step in Identify / Damage Detective |
| `GEMINI_VISION_MODEL` | Preferred vision model; see the note below |

Only `VITE_`-prefixed variables reach the browser. Never prefix a provider secret with `VITE_`.

### Vision model availability

`gemini-1.5-flash` and `gemini-2.0-flash` are retired and now return 404, so they are
deliberately absent from the fallback chain in `api/_lib/providers.ts`. The remaining
candidates are frequently saturated with `503 high demand`, which is why the chain tries
several. If identification starts returning `visionUnavailable: true`, the whole chain was
saturated at that moment — set `GEMINI_VISION_MODEL` to whichever alias is responding
(`gemini-flash-lite-latest` is the cheapest and least contended) rather than adding a model
id to the code.

### Database

Apply migrations in order under `supabase/migrations/` (`00001` → `00017`). They are
idempotent where noted; see migration headers for details.

| Migration | Contents |
| --- | --- |
| `00001`–`00006` | Extensions, schemas, activity tables, triggers, RLS, storage buckets |
| `00007`–`00009` | Seed data: taxonomy, 24 insects, 12 quizzes |
| `00010` | Observation moderation |
| `00011` | `insects.images` column |
| `00012` | Security hardening (signup/profiled role escalation, missing RLS policies) + specimen image backfill |
| `00013` | Server-side quiz grading via `public.submit_quiz()`; hides `quiz_options.is_correct` |
| `00014` | Completes the order checklist to 28 extant orders |
| `00015` | Adds one family, genus and species for each of the 20 orders that had no specimens, plus their image references |
| `00016` | Crop photos (populate `crops.image_url`, append CC-BY credits where required) |
| `00017` | Lifecycle illustrations (metadata for life-cycle artwork) |

`00015` needs its 20 image files present in the bucket first, so the museum never renders a
reference to an object that does not exist. Upload them with `npm run host:extended`, then
apply the migration. `00015` is deliberately not idempotent in its image update: it only
writes to rows whose `images` array is still empty, so a hand-corrected photo is never
clobbered on a re-run.

`00016` and `00017` add images/metadata for crops and lifecycle illustrations; follow the script
instructions in their respective sections before or when applying them.

`00012` and `00013` are **required for the app to work in production** and are commonly
missed when only the schema is set up. Without `00013` the quiz RPC does not exist and the
answer key is readable by anyone through the REST API. Without `00012` the `insects.images`
column is empty, so every specimen falls back to its placeholder. Check whether they landed
with:

```bash
# 404 PGRST202 here means 00013 is missing
curl "$VITE_SUPABASE_URL/rest/v1/rpc/submit_quiz" -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_quiz_id":"00000000-0000-0000-0000-000000000000","p_answers":{}}'

# 200 here means is_correct is still exposed, i.e. 00013 is missing
curl "$VITE_SUPABASE_URL/rest/v1/quiz_options?select=*&limit=1" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```

After the schema is live, promote your own admin account:

```sql
update public.profiles set role = 'admin'
where id = auth.uid();
```

### Specimen images

`insects.images` holds **first-party storage references**, not remote URLs:

```
insect-images/coccinella-septempunctata-0013.jpg
```

`useImageUrl` resolves the `insect-images/` prefix against the public bucket
(`PUBLIC_BUCKETS` in `src/lib/supabase/client.ts`) and returns a Supabase CDN URL. Plain
`https://` values still pass through unchanged, so Wikimedia links continue to work — but
they should not be used for the museum grid. See below for why.

`scripts/host-specimen-images.mjs` maintains this mapping:

```bash
node scripts/host-specimen-images.mjs            # download to .cache/specimens only
npm run host:specimens                           # download + upload + repoint the rows
```

The script is idempotent, derives each filename from the scientific name plus a short id
suffix, and re-uses anything already cached. It needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`
because the bucket's write policy is admin-only. Delete the key afterwards — it bypasses RLS
entirely and has no business sitting in a project folder.

**Do not repoint these rows at Wikimedia.** The museum grid requests ~24 images at once and
`upload.wikimedia.org` rate-limits by IP, so a normal page load returns a burst of `HTTP 429`.
`InsectCard`'s `onError` handler then swaps in the placeholder and the grid reads as
completely broken even though every URL is valid. Measured on a 24-image burst:

| Source | Result |
| --- | --- |
| `upload.wikimedia.org` | 5 × 200, **19 × 429** |
| `insect-images` bucket | **24 × 200, 0 failures** |

Fetching those same URLs one at a time *succeeds*, which is what makes this confusing to
debug — always reproduce with a burst before concluding a URL is bad.

### Extending the museum to all 28 orders

`00014` added 20 extant orders that had no species, so those orders were selectable but
showed nothing. `00015` fills them with one specimen each, sourced from **iNaturalist**
rather than Wikimedia, for the rate-limit reasons above.

```bash
npm run source:photos     # refresh src/data/species-photos.json from the iNaturalist API
npm run host:extended     # download to .cache/specimens-extended + upload to the bucket
npm run check:migration   # validate 00015 against the schema and the cached files
```

Order matters: upload the images, then run `00015` in the Supabase SQL editor.

`00015` is a single file with five statements. If the editor gives you trouble running it as a
whole, `scripts/emit-statements.mjs` splits it into `.cache/00015-statements/*.sql` so each
statement can be run on its own. Families and genera must land before species, and the image
update must run **after** species, because it only writes to rows whose `images` array is still
empty.

If you would rather not paste SQL at all, `scripts/seed-extended-insects.mjs` seeds the same 20
species through PostgREST. It needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`, which is a
secret-service key: use it, then remove it and rotate it.

```bash
npm run seed:extended    # seed the 20 species via PostgREST (needs service role key)
npm run verify:museum    # check live coverage and fetch every image
```

`scripts/verify-museum.mjs` uses only the anon key and reports species/family/genus counts,
orders with no specimens, species with no image, and the HTTP status of every referenced image.
It is safe to run at any time.

`scripts/source-species-photos.mjs` only accepts **research-grade, non-captive** photos
under CC0 or CC-BY; NC and ND are rejected outright. 17 of the 20 are CC0 and 3 are CC-BY.
The three attribution-required images carry the photographer's name, licence and
observation URL in the `insects.description` field, which is the attribution CC-BY
requires — see `src/data/species-photos.json` for the full record.

`scripts/host-extended-photos.mjs` sniffs the real image type from the file's magic bytes
rather than trusting the extension, because one of the 20 files
(`mantis-religiosa.jpg`) is actually a PNG. Uploading it as `image/jpeg` would leave a
mislabelled object in storage.

`supabase/attribution/species-extended.txt` is a generated **attribution manifest, not a
migration** — it is plain text, it lives outside `migrations/` so nothing can pick it up by
mistake, and it must never be run as SQL. It is the audit trail for the three CC-BY images:
photographer, licence and observation URL per photo.

## Routes

Public: `/` `/museum` `/museum/:insectId` `/taxonomy` `/crops` `/crops/:cropId` `/life-cycles` `/beneficial-insects` `/identification-key` `/search` `/identify` `/drop` `/damage-detective` `/assistant` `/quiz` `/quiz/:quizId`

`/drop` is an alias of `/identify` — both render the same upload workflow.

Authenticated: `/dashboard` `/history` `/favorites` `/observations` `/observations/:observationId` `/map` `/research` `/research/:projectId` `/profile` `/settings`

Admin (`/admin/*`): dashboard, species, crops, taxonomy, references, users and observation moderation (pending/approved/rejected).

## Commands

```bash
npm run dev              # local dev
npm run build            # type-check + production build
npm run lint             # oxlint
npm run preview          # preview production build
npm run host:specimens   # copy cached specimen photos into Supabase storage
npm run source:photos    # refresh the iNaturalist photo manifest
npm run host:extended    # publish the 20 additional order photos
npm run check:migration  # validate 00015 against the schema and cached files
npm run emit:statements # split 00015 into .cache/00015-statements/*.sql
npm run seed:extended   # seed the 20 species via PostgREST (needs service role key)
npm run verify:museum   # check live coverage and fetch every image
npm run verify:images   # download every image and confirm the bytes are real
npm run verify:attribution  # confirm the 3 CC-BY credits are visible
npm run verify:noop     # rebuild scripts/verify-00014-noop.sql from 00014
npm run images:upgrade  # re-download undersized Wikimedia thumbnails
npm run source:crops    # refresh src/data/crop-photos.json from the iNaturalist API
npm run host:crops      # publish the 12 crop photos
npm run apply:crops     # set crops.image_url and append CC-BY credits
npm run verify:crops:images  # confirm every crop photo is real and credits show
```

### Crop photos

`00016_crop_photos.sql` fills the `crops.image_url` column, which had existed but was never
populated, so `/crops` showed a generic icon for every crop. The 12 photos come from
**iNaturalist** under the same licence policy as the species set: research-grade,
non-cultivated observations, CC0 preferred, CC-BY accepted with attribution, NC/ND rejected
outright. 10 are CC0 and 2 are CC BY.

```bash
npm run source:crops    # refresh src/data/crop-photos.json from the iNaturalist API
npm run host:crops      # download to .cache/specimens-crops + upload to the bucket
npm run apply:crops     # set crops.image_url and append the credits (needs service role key)
```

Order matters: source, then upload the objects, then apply. `apply:crops` reads its values
directly out of `00016_crop_photos.sql` so the script and the migration cannot drift apart, and
it runs a dry run by default; pass `--apply` to write. It refuses to write with the anon key,
because `crops` is behind RLS.

`crops` has no dedicated attribution column, so the two CC-BY credits are appended to
`description`, which the crop detail page already renders. The append is guarded on the credit
being absent, so re-running cannot duplicate the line.

`verify:crops:images` downloads every crop photo, sniffs its magic bytes and checks the two
credits are visible in the rendered description.

### Verifying

`verify:museum`, `verify:images` and `verify:attribution` all read only the anon key and are safe
to run against production. `verify:images` downloads each object and sniffs magic bytes, so a
`200` response carrying an HTML error page cannot pass; it also reports pixel dimensions and
flags anything under 500px as low resolution. `verify:attribution` reads the same fields the
species detail page renders, so it answers whether a CC-BY credit is actually shown rather than
merely stored.

7 of the 44 images are 330–400px wide. They came from `00012`, which seeded 18 Wikimedia
thumbnails at 500px and 6 at 330px. They render, but look soft in the grid.
`npm run images:upgrade` re-pulls the 330px ones at 800px; Wikimedia rate-limits this IP, so it
may need a retry later.

`verify:noop` regenerates `scripts/verify-00014-noop.sql` directly from `00014`, rather than
quoting it by hand. Paste the generated file into the SQL editor to prove `00014` is a safe
no-op: it re-runs the insert inside a transaction and reports `NO-OP-OK` if no row was added and
no id changed, then rolls back.