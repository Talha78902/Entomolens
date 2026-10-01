-- EntomoLens migration 00012: security hardening + specimen image backfill.
--
-- Fixes four real vulnerabilities and repairs the missing specimen photos:
--
--   1. Privilege escalation at signup: handle_new_user() trusted
--      raw_user_meta_data->>'role', so a signup request could mint itself an
--      admin. Roles now always start at 'student'.
--   2. Privilege escalation via profile update: "profiles_owner_update"
--      allowed a user to update their own row, including the `role` column.
--      A guard trigger now rejects role changes from non-admins.
--   3. ai_messages had no UPDATE/DELETE policy, so conversation deletion
--      silently failed; and naively adding one would have been an IDOR.
--      Policies are now scoped through conversation ownership.
--   4. quiz_attempts had no UPDATE/DELETE policy.
--
-- Plus: the 00011 specimen image backfill is re-applied here, guarded so it
-- only fills empty image arrays and never overwrites curator-chosen images.
-- (On the live project 00011 was never applied, so all 24 species showed
-- "Image coming soon".)
--
-- Idempotent: safe to run against a fresh or an already-patched database.

-- ---------------------------------------------------------------------------
-- 1. Specimen image backfill (only where images is empty)
-- ---------------------------------------------------------------------------
with seed (id, url) as (
  values
    ('40000000-0000-0000-0000-000000000001', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Silverleaf_whitefly.jpg/500px-Silverleaf_whitefly.jpg'),
    ('40000000-0000-0000-0000-000000000002', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Aphis_gossypii_252211071.jpg/500px-Aphis_gossypii_252211071.jpg'),
    ('40000000-0000-0000-0000-000000000003', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Phenacoccus_solenopsis_-_Solenopsis_mealybug_-_Unlu_bit_02.JPG/500px-Phenacoccus_solenopsis_-_Solenopsis_mealybug_-_Unlu_bit_02.JPG'),
    ('40000000-0000-0000-0000-000000000004', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Red_cotton_bug_%28Dysdercus_koenigii%29_nymph_on_Hibiscus_lobatus_W_IMG_4065.jpg/500px-Red_cotton_bug_%28Dysdercus_koenigii%29_nymph_on_Hibiscus_lobatus_W_IMG_4065.jpg'),
    ('40000000-0000-0000-0000-000000000005', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Empoasca_fabae_P1550790a.jpg/500px-Empoasca_fabae_P1550790a.jpg'),
    ('40000000-0000-0000-0000-000000000006', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Helicoverpa_armigera.jpg/500px-Helicoverpa_armigera.jpg'),
    ('40000000-0000-0000-0000-000000000007', 'https://upload.wikimedia.org/wikipedia/commons/4/44/Spodoptera_frugiperda.jpg'),
    ('40000000-0000-0000-0000-000000000008', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Spodoptera_litura_%2824045593674%29.jpg/500px-Spodoptera_litura_%2824045593674%29.jpg'),
    ('40000000-0000-0000-0000-000000000009', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Agrotis_ipsilon_aneituma.jpg/500px-Agotis_ipsilon_aneituma.jpg'),
    ('40000000-0000-0000-0000-000000000010', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Pectinophora_gossypiella_1265079.jpg/500px-Pectinophora_gossypiella_1265079.jpg'),
    ('40000000-0000-0000-0000-000000000011', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Leucinodes_orbonalis.jpg/500px-Leucinodes_orbonalis.jpg'),
    ('40000000-0000-0000-0000-000000000012', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Boll_weevil.jpg/500px-Boll_weevil.jpg'),
    ('40000000-0000-0000-0000-000000000013', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/7-Spotted-Ladybug-Coccinella-septempunctata-sq1.jpg/500px-7-Spotted-Ladybug-Coccinella-septempunctata-sq1.jpg'),
    ('40000000-0000-0000-0000-000000000014', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Callosobruchus_chinensis_%28Linn%C3%A9%2C_1758%29_male.jpg/500px-Callosobruchus_chinensis_%28Linn%C3%A9%2C_1758%29_male.jpg'),
    ('40000000-0000-0000-0000-000000000015', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Khapra_beetle.jpg/330px-Khapra_beetle.jpg'),
    ('40000000-0000-0000-0000-000000000016', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Thrips_tabaci%2C_Frankliniella_occidentalis.jpg/330px-Thrips_tabaci%2C_Frankliniella_occidentalis.jpg'),
    ('40000000-0000-0000-0000-000000000017', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Melon_fly_%28Bactrocera_cucurbitae%29_03.jpg/500px-Melon_fly_%28Bactrocera_cucurbitae%29_03.jpg'),
    ('40000000-0000-0000-0000-000000000018', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Marmalade_hoverfly_%28Episyrphus_balteatus%29_male_Wengen_2.jpg/330px-Marmalade_hoverfly_%28Episyrphus_balteatus%29_male_Wengen_2.jpg'),
    ('40000000-0000-0000-0000-000000000019', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Wanderheuschrecke-03.jpg/330px-Wanderheuschrecke-03.jpg'),
    ('40000000-0000-0000-0000-000000000020', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Female_of_Trichogramma_dendrolimi_on_egg_of_armyworm_%28Noctuidae%29%2C_photo_was_taken_by_Dr_Victor_Fursov.jpg/500px-Female_of_Trichogramma_dendrolimi_on_egg_of_armyworm_%28Noctuidae%29%2C_photo_was_taken_by_Dr_Victor_Fursov.jpg'),
    ('40000000-0000-0000-0000-000000000021', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Apis_mellifera_Western_honey_bee.jpg/500px-Apis_mellifera_Western_honey_bee.jpg'),
    ('40000000-0000-0000-0000-000000000022', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Orius_insidiosus_from_USDA_1.jpg/330px-Orius_insidiosus_from_USDA_1.jpg'),
    ('40000000-0000-0000-0000-000000000023', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Nilaparvata_lugens_439632934.jpg/330px-Nilaparvata_lugens_439632934.jpg'),
    ('40000000-0000-0000-0000-000000000024', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/%28MHNT%29_Chrysoperla_carnea_-_dorsal_view.jpg/500px-%28MHNT%29_Chrysoperla_carnea_-_dorsal_view.jpg')
)
update public.insects i
   set images = array[s.url]
  from seed s
 where i.id = s.id::uuid
   and coalesce(array_length(i.images, 1), 0) = 0;

-- ---------------------------------------------------------------------------
-- 2. Signup can no longer choose its own role
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Role is intentionally hard-coded. Previously this read
  -- new.raw_user_meta_data ->> 'role', which let any signup request create an
  -- admin account by adding {"role":"admin"} to its user metadata.
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Role changes are admin-only (defence in depth)
-- ---------------------------------------------------------------------------
-- The "profiles_owner_update" policy can stay (users should be able to edit
-- their own name/region), but a trigger now blocks privilege escalation even if
-- a future policy change re-opens the door.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators may change a user role.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- 4. ai_messages: allow the owner's delete, scoped through conversation
-- ---------------------------------------------------------------------------
-- A blanket policy would be an IDOR: ai_messages has no user_id column, so
-- ownership has to be proven through the parent conversation row.
drop policy if exists "message_update" on public.ai_messages;
create policy "message_update" on public.ai_messages
  for update to authenticated
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

drop policy if exists "message_delete" on public.ai_messages;
create policy "message_delete" on public.ai_messages
  for delete to authenticated
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 5. quiz_attempts: allow removing an own attempt, but never editing scores.
--
-- Migration 00012 originally added an UPDATE policy here "so a user could
-- correct an attempt". That is wrong once scores are authoritative: score,
-- correct_answers and wrong_answers must only ever be written by the grading
-- function (public.submit_quiz, see 00013). An owner-editable score is a
-- trivial cheat, so only DELETE is granted.
-- ---------------------------------------------------------------------------
drop policy if exists "attempt_update" on public.quiz_attempts;

drop policy if exists "attempt_delete" on public.quiz_attempts;
create policy "attempt_delete" on public.quiz_attempts
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. Search indexes
-- ---------------------------------------------------------------------------
-- Global search runs ILIKE '%term%' against eight columns. Only insects and
-- crops had trigram indexes, so the taxonomy/symptom/reference lookups were
-- sequential scans. These make every search branch index-backed.
create index if not exists taxonomic_orders_name_trgm
  on public.taxonomic_orders using gin (name gin_trgm_ops);
create index if not exists taxonomic_families_name_trgm
  on public.taxonomic_families using gin (name gin_trgm_ops);
create index if not exists taxonomic_genera_name_trgm
  on public.taxonomic_genera using gin (name gin_trgm_ops);
create index if not exists damage_symptoms_name_trgm
  on public.damage_symptoms using gin (name gin_trgm_ops);
create index if not exists damage_symptoms_description_trgm
  on public.damage_symptoms using gin (description gin_trgm_ops);
create index if not exists scientific_references_title_trgm
  on public.scientific_references using gin (title gin_trgm_ops);
