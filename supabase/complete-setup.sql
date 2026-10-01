-- =============================================================
-- EntomoLens FULL reset + database setup
-- Wipes any partial state from earlier runs, then applies migrations
-- 00001..00010 cleanly. Run this ENTIRE file once.
-- =============================================================

drop schema public cascade;
create schema public;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

-- Remove storage-object policies that survive the public-schema reset
drop policy if exists "insect_images_public_read" on storage.objects;
drop policy if exists "insect_images_admin_write" on storage.objects;
drop policy if exists "insect_images_admin_update_delete" on storage.objects;
drop policy if exists "insect_images_admin_delete" on storage.objects;
drop policy if exists "identification_images_owner_read" on storage.objects;
drop policy if exists "identification_images_owner_insert" on storage.objects;
drop policy if exists "identification_images_owner_update" on storage.objects;
drop policy if exists "identification_images_owner_delete" on storage.objects;
drop policy if exists "observation_images_owner_read" on storage.objects;
drop policy if exists "observation_images_owner_insert" on storage.objects;
drop policy if exists "observation_images_owner_update" on storage.objects;
drop policy if exists "observation_images_owner_delete" on storage.objects;
drop policy if exists "observation_images_public_when_observation_public" on storage.objects;
drop policy if exists "profile_images_owner_read" on storage.objects;
drop policy if exists "profile_images_owner_insert" on storage.objects;
drop policy if exists "profile_images_owner_update" on storage.objects;
drop policy if exists "profile_images_owner_delete" on storage.objects;
drop policy if exists "storage_admin_all" on storage.objects;


-- =============================================================
-- MIGRATIONS 00001 .. 00010
-- =============================================================

-- -------------------------------------------------------------
-- Migration: 00001_extensions.sql
-- -------------------------------------------------------------
-- EntomoLens: extensions. Applied once. Idempotent.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- -------------------------------------------------------------
-- Migration: 00002_knowledge_schema.sql
-- -------------------------------------------------------------
-- EntomoLens: knowledge-system schema
-- Tables: profiles, taxonomy, insects, crops, relationships, symptoms, life cycles,
-- natural enemies, management, references.
-- RLS is enabled on every table (Supabase requirement). Row-level permissions are
-- defined in 00004_rls.sql.

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users; row auto-created by trigger in 00005_triggers.sql)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  full_name   text,
  avatar_url  text,
  role        text not null default 'student'
              check (role in ('student', 'farmer', 'researcher', 'entomologist', 'admin')),
  institution text,
  region      text
);

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------
create table if not exists public.taxonomic_orders (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null unique,
  common_name text,
  description text
);

create table if not exists public.taxonomic_families (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null unique,
  common_name text,
  description text,
  order_id    uuid not null references public.taxonomic_orders (id) on delete restrict
);

create table if not exists public.taxonomic_genera (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null unique,
  description text,
  family_id   uuid not null references public.taxonomic_families (id) on delete restrict
);

-- ---------------------------------------------------------------------------
-- Insects (knowledge records + AI targets)
-- ---------------------------------------------------------------------------
create table if not exists public.insects (
  id                          uuid primary key default gen_random_uuid(),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  scientific_name             text not null,
  common_name                 text not null,
  genus_id                    uuid not null references public.taxonomic_genera (id) on delete restrict,
  family_id                   uuid not null references public.taxonomic_families (id) on delete restrict,
  order_id                    uuid not null references public.taxonomic_orders (id) on delete restrict,
  description                 text not null default '',
  identification_characteristics text,
  images                      text[] not null default '{}',
  is_pest                     boolean not null default false,
  is_beneficial               boolean not null default false,
  beneficial_category         text
                              check (beneficial_category in ('predator', 'parasitoid', 'pollinator', 'other')),
  native_region               text,
  verification_status         text not null default 'draft'
                              check (verification_status in ('draft', 'reviewed', 'verified')),
  featured                    boolean not null default false
);

create unique index if not exists insects_scientific_name_key on public.insects (lower(scientific_name));
create index if not exists insects_common_name_trgm on public.insects using gin (common_name gin_trgm_ops);
create index if not exists insects_scientific_name_trgm on public.insects using gin (scientific_name gin_trgm_ops);
create index if not exists insects_order_idx on public.insects (order_id);
create index if not exists insects_family_idx on public.insects (family_id);
create index if not exists insects_genus_idx on public.insects (genus_id);
create index if not exists insects_verification_idx on public.insects (verification_status);
create index if not exists insects_featured_idx on public.insects (featured) where featured = true;

-- ---------------------------------------------------------------------------
-- Crops
-- ---------------------------------------------------------------------------
create table if not exists public.crops (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  name           text not null,
  scientific_name text,
  description    text,
  image_url      text,
  region         text
);

create unique index if not exists crops_name_key on public.crops (lower(name));
create index if not exists crops_name_trgm on public.crops using gin (name gin_trgm_ops);

create table if not exists public.crop_insects (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  crop_id           uuid not null references public.crops (id) on delete cascade,
  insect_id         uuid not null references public.insects (id) on delete cascade,
  relationship_type text not null check (relationship_type in ('pest', 'beneficial')),
  severity          text check (severity in ('major', 'minor', 'occasional')),
  notes             text,
  unique (crop_id, insect_id, relationship_type)
);

create index if not exists crop_insects_crop_idx on public.crop_insects (crop_id);
create index if not exists crop_insects_insect_idx on public.crop_insects (insect_id);

-- ---------------------------------------------------------------------------
-- Damage symptoms
-- ---------------------------------------------------------------------------
create table if not exists public.damage_symptoms (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  category    text not null
              check (category in ('chewing', 'piercing-sucking', 'mining', 'boring',
                                  'skeletonization', 'webbing', 'curling', 'wilting',
                                  'fruit-damage', 'other')),
  description text
);

create table if not exists public.insect_damage_symptoms (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  insect_id   uuid not null references public.insects (id) on delete cascade,
  symptom_id  uuid not null references public.damage_symptoms (id) on delete cascade,
  description text,
  severity    text,
  unique (insect_id, symptom_id)
);

create index if not exists insect_damage_symptoms_insect_idx on public.insect_damage_symptoms (insect_id);

-- ---------------------------------------------------------------------------
-- Life cycles
-- ---------------------------------------------------------------------------
create table if not exists public.life_cycles (
  id                            uuid primary key default gen_random_uuid(),
  created_at                    timestamptz not null default now(),
  insect_id                     uuid not null references public.insects (id) on delete cascade,
  stage_order                   int  not null,
  stage_name                    text not null check (stage_name in ('egg', 'larva', 'nymph', 'pupa', 'adult')),
  duration                      text,
  appearance                    text,
  feeding_behavior              text,
  damage_description            text,
  identification_characteristics text,
  image_url                     text,
  unique (insect_id, stage_order)
);

create index if not exists life_cycles_insect_idx on public.life_cycles (insect_id);

-- ---------------------------------------------------------------------------
-- Natural enemies
-- ---------------------------------------------------------------------------
create table if not exists public.natural_enemy_relationships (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  pest_insect_id  uuid not null references public.insects (id) on delete cascade,
  enemy_insect_id uuid not null references public.insects (id) on delete cascade,
  relationship    text not null check (relationship in ('predator', 'parasitoid', 'pathogen')),
  notes           text,
  unique (pest_insect_id, enemy_insect_id, relationship)
);

create index if not exists natural_enemies_pest_idx on public.natural_enemy_relationships (pest_insect_id);
create index if not exists natural_enemies_enemy_idx on public.natural_enemy_relationships (enemy_insect_id);

-- ---------------------------------------------------------------------------
-- Management (IPM)
-- ---------------------------------------------------------------------------
create table if not exists public.management_methods (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  category    text not null
              check (category in ('monitoring', 'cultural', 'mechanical', 'physical',
                                  'biological', 'chemical')),
  description text
);

create table if not exists public.insect_management (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  insect_id   uuid not null references public.insects (id) on delete cascade,
  method_id   uuid not null references public.management_methods (id) on delete cascade,
  notes       text,
  source_id   uuid, -- populated when a chemical/legal claim needs a verified source
  unique (insect_id, method_id)
);

create index if not exists insect_management_insect_idx on public.insect_management (insect_id);

-- ---------------------------------------------------------------------------
-- Scientific references
-- ---------------------------------------------------------------------------
create table if not exists public.scientific_references (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  title       text not null,
  authors     text[] not null default '{}',
  year        int,
  journal     text,
  doi         text,
  url         text,
  source_type text not null default 'journal'
              check (source_type in ('journal', 'book', 'report', 'website', 'database', 'other'))
);

create table if not exists public.insect_scientific_references (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  insect_id     uuid not null references public.insects (id) on delete cascade,
  reference_id  uuid not null references public.scientific_references (id) on delete cascade,
  unique (insect_id, reference_id)
);

create index if not exists insect_scientific_references_insect_idx
  on public.insect_scientific_references (insect_id);
create index if not exists scientific_references_year_idx on public.scientific_references (year);

-- -------------------------------------------------------------
-- Migration: 00003_activity_schema.sql
-- -------------------------------------------------------------
-- EntomoLens: user-activity schema
-- Identifications, AI conversations, favorites, observations, research, quizzes.

-- ---------------------------------------------------------------------------
-- AI identifications
-- ---------------------------------------------------------------------------
create table if not exists public.identifications (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  image_path       text,
  crop_id          uuid references public.crops (id) on delete set null,
  location_name    text,
  notes            text,
  status           text not null default 'pending'
                   check (status in ('pending', 'completed', 'failed')),
  model_name       text,
  result_summary   text,
  top_insect_id    uuid references public.insects (id) on delete set null
);

create index if not exists identifications_user_idx on public.identifications (user_id);
create index if not exists identifications_created_idx on public.identifications (user_id, created_at desc);
create index if not exists identifications_crop_idx on public.identifications (crop_id);

create table if not exists public.identification_candidates (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  identification_id uuid not null references public.identifications (id) on delete cascade,
  insect_id         uuid not null references public.insects (id) on delete cascade,
  rank              int  not null,
  confidence        numeric(5,2) not null default 0 check (confidence >= 0 and confidence <= 100),
  confidence_label  text
);

create index if not exists identification_candidates_ident_idx
  on public.identification_candidates (identification_id, rank);

create table if not exists public.identification_evidence (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  identification_id   uuid not null references public.identifications (id) on delete cascade,
  image_evidence      numeric(5,2) not null default 0 check (image_evidence >= 0 and image_evidence <= 100),
  crop_evidence       numeric(5,2) not null default 0 check (crop_evidence >= 0 and crop_evidence <= 100),
  symptom_evidence    numeric(5,2) not null default 0 check (symptom_evidence >= 0 and symptom_evidence <= 100),
  observation_evidence numeric(5,2) not null default 0 check (observation_evidence >= 0 and observation_evidence <= 100),
  overall_evidence    numeric(5,2) not null default 0 check (overall_evidence >= 0 and overall_evidence <= 100),
  notes               text,
  unique (identification_id)
);

create index if not exists identification_evidence_ident_idx
  on public.identification_evidence (identification_id);

-- ---------------------------------------------------------------------------
-- AI conversations
-- ---------------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  title               text,
  context_insect_id   uuid references public.insects (id) on delete set null
);

create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, created_at desc);

create table if not exists public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null default '',
  sources         jsonb
);

create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Favorites
-- ---------------------------------------------------------------------------
create table if not exists public.favorite_insects (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  insect_id  uuid not null references public.insects (id) on delete cascade,
  unique (user_id, insect_id)
);

create index if not exists favorite_insects_user_idx on public.favorite_insects (user_id);

-- ---------------------------------------------------------------------------
-- Locations + observations
-- ---------------------------------------------------------------------------
create table if not exists public.locations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text,
  latitude   numeric(9,6) not null,
  longitude  numeric(9,6) not null,
  region     text,
  country    text
);

create table if not exists public.observations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  insect_id     uuid not null references public.insects (id) on delete cascade,
  crop_id       uuid references public.crops (id) on delete set null,
  location_id   uuid references public.locations (id) on delete set null,
  location_name text,
  latitude      numeric(9,6),
  longitude     numeric(9,6),
  observed_on   date not null default current_date,
  image_path    text,
  life_stage    text,
  quantity      numeric,
  damage_level  numeric(2,1) check (damage_level >= 0 and damage_level <= 5),
  notes         text,
  visibility    text not null default 'private' check (visibility in ('private', 'public'))
);

create index if not exists observations_user_idx on public.observations (user_id);
create index if not exists observations_public_idx on public.observations (visibility, created_at desc) where visibility = 'public';
create index if not exists observations_insect_idx on public.observations (insect_id);
create index if not exists observations_crop_idx on public.observations (crop_id);

-- ---------------------------------------------------------------------------
-- Research projects
-- ---------------------------------------------------------------------------
create table if not exists public.research_projects (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  description   text,
  start_date    date,
  end_date      date,
  status        text not null default 'active'
                check (status in ('active', 'completed', 'archived'))
);

create index if not exists research_projects_user_idx on public.research_projects (user_id);

create table if not exists public.research_project_observations (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  project_id     uuid not null references public.research_projects (id) on delete cascade,
  observation_id uuid not null references public.observations (id) on delete cascade,
  unique (project_id, observation_id)
);

create index if not exists research_project_obs_project_idx
  on public.research_project_observations (project_id);

-- ---------------------------------------------------------------------------
-- Quizzes
-- ---------------------------------------------------------------------------
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  category    text not null
              check (category in ('taxonomy', 'pest-identification', 'beneficial-insects',
                                  'life-cycles', 'crop-pests', 'ipm')),
  difficulty  text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  description text
);

create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  quiz_id     uuid not null references public.quizzes (id) on delete cascade,
  question    text not null,
  explanation text,
  "order"     int  not null default 0
);

create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id, "order");

create table if not exists public.quiz_options (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  option_text text not null,
  is_correct  boolean not null default false,
  "order"     int  not null default 0
);

create index if not exists quiz_options_question_idx on public.quiz_options (question_id, "order");

create table if not exists public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  quiz_id          uuid not null references public.quizzes (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  score            numeric(5,2) not null default 0,
  total_questions  int  not null default 0,
  correct_answers  int  not null default 0,
  wrong_answers    int  not null default 0,
  completed_at     timestamptz
);

create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);

-- -------------------------------------------------------------
-- Migration: 00004_triggers.sql
-- -------------------------------------------------------------
-- EntomoLens: updated_at triggers + profile auto-creation on signup.
-- The profile trigger is security-definer so it can insert rows that would
-- otherwise be blocked by RLS during the post-signup handler.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_taxonomic_orders_updated_at
  before update on public.taxonomic_orders
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_taxonomic_families_updated_at
  before update on public.taxonomic_families
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_taxonomic_genera_updated_at
  before update on public.taxonomic_genera
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_insects_updated_at
  before update on public.insects
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_crops_updated_at
  before update on public.crops
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_scientific_references_updated_at
  before update on public.scientific_references
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_observations_updated_at
  before update on public.observations
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_research_projects_updated_at
  before update on public.research_projects
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile auto-creation
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'student')::text
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------
-- Migration: 00005_rls.sql
-- -------------------------------------------------------------
-- EntomoLens: Row Level Security policies.
-- Model:
--   - Knowledge records  -> readable by anon + authenticated; edited by admins only.
--   - Personal records   -> owner CRUD; admins may moderate.
--   - Public observations -> readable by everyone; private rows owner-only.
-- service_role bypasses RLS for server-side work (Vercel functions).

-- Admin helper --------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Profiles -------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Knowledge tables -----------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'taxonomic_orders', 'taxonomic_families', 'taxonomic_genera',
    'insects', 'crops', 'crop_insects',
    'damage_symptoms', 'insect_damage_symptoms',
    'life_cycles', 'natural_enemy_relationships',
    'management_methods', 'insect_management',
    'scientific_references', 'insect_scientific_references'
  ]
  LOOP
    EXECUTE format('alter table public.%I enable row level security;', t);
    EXECUTE format('drop policy if exists %I on public.%I;', 'knowledge_select_' || t, t);
    EXECUTE format('create policy %I on public.%I for select to anon, authenticated using (true);',
                   'knowledge_select_' || t, t);
    EXECUTE format('drop policy if exists admin_write_%I on public.%I;', t, t);
    EXECUTE format('create policy admin_write_%I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
                   t, t);
  END LOOP;
END $$;

-- Quizzes: readable and answerable by everyone (options include is_correct;
-- clients only render option_text). Hardening can split correct answers later.
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;

create policy "quiz_select" on public.quizzes for select to anon, authenticated using (true);
create policy "quiz_admin_write" on public.quizzes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "quiz_question_select" on public.quiz_questions for select to anon, authenticated using (true);
create policy "quiz_question_admin_write" on public.quiz_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "quiz_option_select" on public.quiz_options for select to anon, authenticated using (true);
create policy "quiz_option_admin_write" on public.quiz_options for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Identifications --------------------------------------------------------------
alter table public.identifications enable row level security;

create policy "identification_insert" on public.identifications
  for insert to authenticated with check (auth.uid() = user_id);

create policy "identification_owner_select" on public.identifications
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

create policy "identification_owner_update" on public.identifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "identification_owner_delete" on public.identifications
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

alter table public.identification_candidates enable row level security;

create policy "candidate_insert" on public.identification_candidates
  for insert to authenticated
  with check (exists (
    select 1 from public.identifications i
    where i.id = identification_id and i.user_id = auth.uid()
  ));

create policy "candidate_select" on public.identification_candidates
  for select to authenticated using (public.is_admin() or exists (
    select 1 from public.identifications i
    where i.id = identification_id and i.user_id = auth.uid()
  ));

alter table public.identification_evidence enable row level security;

create policy "evidence_insert" on public.identification_evidence
  for insert to authenticated
  with check (exists (
    select 1 from public.identifications i
    where i.id = identification_id and i.user_id = auth.uid()
  ));

create policy "evidence_select" on public.identification_evidence
  for select to authenticated using (public.is_admin() or exists (
    select 1 from public.identifications i
    where i.id = identification_id and i.user_id = auth.uid()
  ));

-- AI conversations -------------------------------------------------------------
alter table public.ai_conversations enable row level security;

create policy "conversation_insert" on public.ai_conversations
  for insert to authenticated with check (auth.uid() = user_id);

create policy "conversation_owner_select" on public.ai_conversations
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

create policy "conversation_owner_update" on public.ai_conversations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "conversation_owner_delete" on public.ai_conversations
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

alter table public.ai_messages enable row level security;

create policy "message_insert" on public.ai_messages
  for insert to authenticated
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

create policy "message_select" on public.ai_messages
  for select to authenticated using (public.is_admin() or exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

-- Favorites ---------------------------------------------------------------------
alter table public.favorite_insects enable row level security;

create policy "favorite_owner_all" on public.favorite_insects
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "favorite_admin_all" on public.favorite_insects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Locations + observations --------------------------------------------------------
alter table public.locations enable row level security;

create policy "locations_select_authenticated" on public.locations
  for select to authenticated using (true);

create policy "locations_admin_write" on public.locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.observations enable row level security;

create policy "observations_select" on public.observations
  for select to anon, authenticated
  using (visibility = 'public' or auth.uid() = user_id or public.is_admin());

create policy "observations_insert" on public.observations
  for insert to authenticated with check (auth.uid() = user_id);

create policy "observations_owner_update" on public.observations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "observations_owner_delete" on public.observations
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

-- Research ------------------------------------------------------------------------
alter table public.research_projects enable row level security;

create policy "research_insert" on public.research_projects
  for insert to authenticated with check (auth.uid() = user_id);

create policy "research_owner_select" on public.research_projects
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

create policy "research_owner_update" on public.research_projects
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "research_owner_delete" on public.research_projects
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

alter table public.research_project_observations enable row level security;

create policy "rpo_insert" on public.research_project_observations
  for insert to authenticated
  with check (exists (
    select 1 from public.research_projects p
    where p.id = project_id and p.user_id = auth.uid()
  ));

create policy "rpo_select" on public.research_project_observations
  for select to authenticated using (public.is_admin() or exists (
    select 1 from public.research_projects p
    where p.id = project_id and p.user_id = auth.uid()
  ));

create policy "rpo_delete" on public.research_project_observations
  for delete to authenticated using (exists (
    select 1 from public.research_projects p
    where p.id = project_id and p.user_id = auth.uid()
  ) or public.is_admin());

-- Quiz attempts -------------------------------------------------------------------
alter table public.quiz_attempts enable row level security;

create policy "attempt_insert" on public.quiz_attempts
  for insert to authenticated with check (auth.uid() = user_id);

create policy "attempt_owner_select" on public.quiz_attempts
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

-- -------------------------------------------------------------
-- Migration: 00006_storage.sql
-- -------------------------------------------------------------
-- EntomoLens: Supabase Storage buckets + policies.
-- Buckets:
--   insect-images        (public)  -> curated species images, admin-managed
--   identification-images (private) -> per-user folders: <user_id>/<file>
--   observation-images   (private) -> per-user folders; auto-visible only when
--                                     the linked observation row is public
--   profile-images       (private) -> per-user avatar: <user_id>/<file>

insert into storage.buckets (id, name, public)
values ('insect-images', 'insect-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('identification-images', 'identification-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('observation-images', 'observation-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', false)
on conflict (id) do nothing;

-- insect-images -----------------------------------------------------------------
create policy "insect_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'insect-images');

create policy "insect_images_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'insect-images' and public.is_admin());

create policy "insect_images_admin_update_delete" on storage.objects
  for update to authenticated
  using (bucket_id = 'insect-images' and public.is_admin());

create policy "insect_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'insect-images' and public.is_admin());

-- identification-images (per-user folders) ---------------------------------------
create policy "identification_images_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'identification-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "identification_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'identification-images'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "identification_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'identification-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "identification_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'identification-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

-- observation-images (per-user folders; public only when observation is public) --
create policy "observation_images_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'observation-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "observation_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'observation-images'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "observation_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'observation-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "observation_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'observation-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "observation_images_public_when_observation_public" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'observation-images'
         and exists (
           select 1 from public.observations o
           where o.visibility = 'public' and o.image_path = name
         ));

-- profile-images (per-user folders) ------------------------------------------------
create policy "profile_images_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-images'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-images'
         and (storage.foldername(name))[1] = auth.uid()::text);

-- Admin broad access across user buckets -------------------------------------------
create policy "storage_admin_all" on storage.objects
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- Migration: 00007_seed_taxonomy.sql
-- -------------------------------------------------------------
-- EntomoLens: seed — taxonomy, crops, symptoms, methods, references.
-- Content is a conservative, curated starter set of well-documented organisms.
-- UUIDs are deterministic so relational seeds can reference them.
-- Idempotent: re-running never duplicates.

-- ---------------------------------------------------------------------------
-- Taxonomic orders
-- ---------------------------------------------------------------------------
insert into public.taxonomic_orders (id, name, common_name, description) values
  ('10000000-0000-0000-0000-000000000001', 'Hemiptera', 'True bugs', 'Sucking insects including whiteflies, aphids, mealybugs, leafhoppers and stainer bugs.'),
  ('10000000-0000-0000-0000-000000000002', 'Lepidoptera', 'Butterflies and moths', 'Scaling-winged insects whose larvae (caterpillars) feed on foliage, stems and fruit.'),
  ('10000000-0000-0000-0000-000000000003', 'Coleoptera', 'Beetles', 'Hard-shelled insects with chewing mouthparts in both adult and larval stages.'),
  ('10000000-0000-0000-0000-000000000004', 'Thysanoptera', 'Thrips', 'Minute slender insects with rasping-sucking mouthparts.'),
  ('10000000-0000-0000-0000-000000000005', 'Diptera', 'True flies', 'Two-winged insects; includes fruit flies, hoverflies and tachinid flies.'),
  ('10000000-0000-0000-0000-000000000006', 'Orthoptera', 'Grasshoppers and crickets', 'Leaping insects with chewing mouthparts; some form migratory swarms.'),
  ('10000000-0000-0000-0000-000000000007', 'Hymenoptera', 'Bees, wasps and ants', 'Winged or wingless insects including bees and parasitoid wasps.'),
  ('10000000-0000-0000-0000-000000000008', 'Neuroptera', 'Lacewings', 'Soft-bodied predatory insects with delicate net-veined wings.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Taxonomic families
-- ---------------------------------------------------------------------------
insert into public.taxonomic_families (id, name, common_name, description, order_id) values
  ('20000000-0000-0000-0000-000000000001', 'Aleyrodidae', 'Whiteflies', 'Small sap-feeding flies with white powdery wings.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Aphididae', 'Aphids', 'Soft-bodied sap-feeding insects, often with cornicles.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'Pseudococcidae', 'Mealybugs', 'Sap-feeding insects covered with waxy mealy secretions.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', 'Pyrrhocoridae', 'Stainer bugs', 'Brightly coloured true bugs that stain cotton fibre.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', 'Cicadellidae', 'Leafhoppers', 'Jumping sap-feeding bugs on a wide range of crops.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000006', 'Noctuidae', 'Owlet moths', 'Dull-coloured moths with robust caterpillars, many are serious crop pests.', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000007', 'Gelechiidae', 'Gelechiid moths', 'Small moths; includes serious pests of cotton and stored grain.', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000008', 'Crambidae', 'Crambid moths', 'Grass and stem moths; includes the brinjal shoot and fruit borer.', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000009', 'Curculionidae', 'Weevils', 'Snout beetles; major pests of cotton and stored products.', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000010', 'Coccinellidae', 'Ladybird beetles', 'Distinctively spotted beetles; adults and larvae are important predators.', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000011', 'Chrysomelidae', 'Leaf beetles', 'Diverse family including stored-pulse bruchid beetles.', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000012', 'Dermestidae', 'Skin and grain beetles', 'Scavenging beetles; includes the destructive khapra beetle.', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000013', 'Thripidae', 'Common thrips', 'Slender thrips that rasp plant tissues.', '10000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000014', 'Tephritidae', 'Fruit flies', 'Picturesque-winged flies whose larvae feed inside fruit.', '10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000015', 'Syrphidae', 'Hoverflies', 'Fly pollinators and predators; aphid-feeding larvae.', '10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000016', 'Acrididae', 'Grasshoppers and locusts', 'Large chewing insects; some form plague swarms.', '10000000-0000-0000-0000-000000000006'),
  ('20000000-0000-0000-0000-000000000017', 'Trichogrammatidae', 'Trichogramma wasps', 'Tiny egg parasitoids of many moth pests.', '10000000-0000-0000-0000-000000000007'),
  ('20000000-0000-0000-0000-000000000018', 'Apidae', 'True bees', 'Includes the western honey bee, a major pollinator.', '10000000-0000-0000-0000-000000000007'),
  ('20000000-0000-0000-0000-000000000019', 'Anthocoridae', 'Minute pirate bugs', 'Small predatory bugs of thrips, mites and eggs.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000021', 'Chrysopidae', 'Green lacewings', 'Delicate green-winged insects; voracious aphid and egg predators.', '10000000-0000-0000-0000-000000000008'),
  ('20000000-0000-0000-0000-000000000022', 'Delphacidae', 'Planthoppers', 'Sap-feeding planthoppers; includes the brown planthopper of rice.', '10000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Taxonomic genera
-- ---------------------------------------------------------------------------
insert into public.taxonomic_genera (id, name, description, family_id) values
  ('30000000-0000-0000-0000-000000000001', 'Bemisia', 'Whiteflies; B. tabaci is a global crop pest.', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'Aphis', 'Large aphid genus; A. gossypii is the cotton aphid.', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000003', 'Phenacoccus', 'Mealybugs; P. solenopsis is the cotton mealybug.', '20000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000004', 'Dysdercus', 'Stainer bugs; D. koenigii stains cotton.', '20000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000005', 'Amrasca', 'Leafhoppers; A. biguttula is the cotton jassid.', '20000000-0000-0000-0000-000000000005'),
  ('30000000-0000-0000-0000-000000000006', 'Helicoverpa', 'Highly polyphagous bollworm moths.', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000007', 'Spodoptera', 'Armyworms and cutworms; serious foliage pests.', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000008', 'Agrotis', 'Cutworm moths whose larvae cut seedlings.', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000009', 'Pectinophora', 'Pink bollworm of cotton.', '20000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000010', 'Leucinodes', 'Stem and fruit borers of solanaceous crops.', '20000000-0000-0000-0000-000000000008'),
  ('30000000-0000-0000-0000-000000000011', 'Anthonomus', 'Flower and boll weevils.', '20000000-0000-0000-0000-000000000009'),
  ('30000000-0000-0000-0000-000000000012', 'Coccinella', 'Classic spotted ladybird beetles.', '20000000-0000-0000-0000-000000000010'),
  ('30000000-0000-0000-0000-000000000013', 'Callosobruchus', 'Bruchid weevils of stored pulses and grain.', '20000000-0000-0000-0000-000000000011'),
  ('30000000-0000-0000-0000-000000000014', 'Trogoderma', 'Dermestid beetles of stored grain; includes khapra beetle.', '20000000-0000-0000-0000-000000000012'),
  ('30000000-0000-0000-0000-000000000015', 'Thrips', 'Type genus of thripid thrips.', '20000000-0000-0000-0000-000000000013'),
  ('30000000-0000-0000-0000-000000000016', 'Bactrocera', 'Major fruit fly pests of horticulture.', '20000000-0000-0000-0000-000000000014'),
  ('30000000-0000-0000-0000-000000000017', 'Episyrphus', 'Aphid-feeding hoverflies.', '20000000-0000-0000-0000-000000000015'),
  ('30000000-0000-0000-0000-000000000018', 'Locusta', 'Migratory locusts.', '20000000-0000-0000-0000-000000000016'),
  ('30000000-0000-0000-0000-000000000019', 'Trichogramma', 'Egg parasitoids released for biological control.', '20000000-0000-0000-0000-000000000017'),
  ('30000000-0000-0000-0000-000000000020', 'Apis', 'Cavity-nesting honey bees.', '20000000-0000-0000-0000-000000000018'),
  ('30000000-0000-0000-0000-000000000021', 'Orius', 'Minute pirate bugs, key thrips predators.', '20000000-0000-0000-0000-000000000019'),
  ('30000000-0000-0000-0000-000000000022', 'Nilaparvata', 'Plant hopper; brown planthopper of rice.', '20000000-0000-0000-0000-000000000022'),
  ('30000000-0000-0000-0000-000000000023', 'Chrysoperla', 'Common green lacewings used in augmentative biocontrol.', '20000000-0000-0000-0000-000000000021')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Crops
-- ---------------------------------------------------------------------------
insert into public.crops (id, name, scientific_name, description, region) values
  ('50000000-0000-0000-0000-000000000001', 'Cotton', 'Gossypium hirsutum', 'Fibre crop susceptible to a broad pest complex from seedling to boll stage.', 'Tropical and subtropical'),
  ('50000000-0000-0000-0000-000000000002', 'Wheat', 'Triticum aestivum', 'Staple cereal; occasional stalk-cutting cutworm and locust damage.', 'Temperate and subtropical'),
  ('50000000-0000-0000-0000-000000000003', 'Maize', 'Zea mays', 'Cereal attacked especially by fall armyworm and stem-feeding bollworms.', 'Tropical to temperate'),
  ('50000000-0000-0000-0000-000000000004', 'Rice', 'Oryza sativa', 'Landmark cereal; sap-feeding planthoppers and invasive armyworms are key concerns.', 'Tropical and subtropical'),
  ('50000000-0000-0000-0000-000000000005', 'Tomato', 'Solanum lycopersicum', 'Vegetable crop; whitefly and fruit borer are the major pest groups.', 'Warm climates'),
  ('50000000-0000-0000-0000-000000000006', 'Okra', 'Abelmoschus esculentus', 'Vegetable attacked by jassids, whitefly and fruit borers.', 'Tropical'),
  ('50000000-0000-0000-0000-000000000007', 'Chickpea', 'Cicer arietinum', 'Pulse crop; pod borer is the key field pest, bruchids the main storage pest.', 'Semi-arid'),
  ('50000000-0000-0000-0000-000000000008', 'Sugarcane', 'Saccharum officinarum', 'Cane crop; young stands vulnerable to cutworms and armyworms.', 'Tropical and subtropical'),
  ('50000000-0000-0000-0000-000000000009', 'Potato', 'Solanum tuberosum', 'Tuber crop; cutworms attack young stems; whitefly may appear in warm regions.', 'Cool to subtropical'),
  ('50000000-0000-0000-0000-000000000010', 'Brinjal', 'Solanum melongena', 'Eggplant; shoot and fruit borer is the classic damaging pest.', 'Tropical and subtropical'),
  ('50000000-0000-0000-0000-000000000011', 'Chilli', 'Capsicum annuum', 'Spice crop; thrips and whitefly cause leaf damage and virus spread.', 'Tropical'),
  ('50000000-0000-0000-0000-000000000012', 'Cucumber', 'Cucumis sativus', 'Cucurbit vegetable; maturing fruit is the main target of fruit flies.', 'Tropical and warm temperate')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Damage symptoms
-- ---------------------------------------------------------------------------
insert into public.damage_symptoms (id, name, category, description) values
  ('60000000-0000-0000-0000-000000000001', 'Chewed leaves and holes', 'chewing', 'Irregular holes and notching on leaf margins from chewing insects.'),
  ('60000000-0000-0000-0000-000000000002', 'Leaf stippling and yellowing', 'piercing-sucking', 'Fine pale stipples, chlorosis and leaf yellowing from sap-feeding insects.'),
  ('60000000-0000-0000-0000-000000000003', 'Honeydew and sooty mould', 'other', 'Sticky excreta supporting black sooty mould that blocks leaf light.'),
  ('60000000-0000-0000-0000-000000000004', 'Leaf mining', 'mining', 'Serpentine whitish tunnels inside leaf tissues from mining larvae.'),
  ('60000000-0000-0000-0000-000000000005', 'Fruit boring and exit holes', 'fruit-damage', 'Entry and exit holes on fruit with internal tunnels and frass.'),
  ('60000000-0000-0000-0000-000000000006', 'Skeletonized leaves', 'skeletonization', 'Leaf tissue removed leaving only veins, giving a lace-like appearance.'),
  ('60000000-0000-0000-0000-000000000007', 'Webbing on foliage', 'webbing', 'Silken webbing rolled or binding leaves and growing points.'),
  ('60000000-0000-0000-0000-000000000008', 'Leaf curling', 'curling', 'Curled, distorted and crinkled young leaves.'),
  ('60000000-0000-0000-0000-000000000009', 'Wilting and stunting', 'wilting', 'Wilted, stunted or dying plants from root, stem or vascular feeding.'),
  ('60000000-0000-0000-0000-000000000010', 'Stored-grain damage', 'other', 'Grain hollowed, contaminated or infested in storage.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Management methods (IPM)
-- ---------------------------------------------------------------------------
insert into public.management_methods (id, name, category, description) values
  ('70000000-0000-0000-0000-000000000001', 'Regular field scouting', 'monitoring', 'Monitor crops weekly; use sticky traps and inspect leaf undersides for early stages.'),
  ('70000000-0000-0000-0000-000000000002', 'Crop rotation and resistant varieties', 'cultural', 'Rotate crops and choose tolerant/resistant cultivars to reduce pest build-up.'),
  ('70000000-0000-0000-0000-000000000003', 'Hand picking and removal', 'mechanical', 'Remove and destroy egg masses and heavily infested plant parts.'),
  ('70000000-0000-0000-0000-000000000004', 'Yellow sticky traps and netting', 'physical', 'Deploy sticky traps for winged stages and exclusion netting where practical.'),
  ('70000000-0000-0000-0000-000000000005', 'Biological control', 'biological', 'Conserve natural enemies and release biocontrol agents (e.g. Trichogramma, lacewings).'),
  ('70000000-0000-0000-0000-000000000006', 'Judicious chemical control', 'chemical', 'Apply only approved insecticides at label rates, scouting-based thresholds and targeted timing.'),
  ('70000000-0000-0000-0000-000000000007', 'Sanitation and hygiene in storage', 'cultural', 'Clean storage premises, inspect incoming lots, and use of fumigation only by trained operators.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Scientific references (real, verifiable sources)
-- ---------------------------------------------------------------------------
insert into public.scientific_references (id, title, authors, year, journal, doi, url, source_type) values
  ('80000000-0000-0000-0000-000000000001', 'IPM for Bemisia tabaci: a case study from North America', ARRAY['Ellsworth, P. C.', 'Martinez-Carrillo, J. L.'], 2001, 'Crop Protection', '10.1016/S0261-2194(01)00114-0', null, 'journal'),
  ('80000000-0000-0000-0000-000000000002', 'The ecology of Heliothis armigera (Hübner) and H. punctigera (Wallengren) in Australia', ARRAY['Fitt, G. P.'], 1989, 'Annual Review of Entomology', '10.1146/annurev.en.34.010189.002105', null, 'journal'),
  ('80000000-0000-0000-0000-000000000003', 'Insect Pests of Rice', ARRAY['Pathak, M. D.', 'Khan, Z. R.'], 1994, null, null, null, 'book'),
  ('80000000-0000-0000-0000-000000000004', 'CABI Compendium — Bemisia tabaci', ARRAY['CABI' ], 2024, null, null, 'https://www.cabidigitallibrary.org/doi/10.1079/cabicompendium.8927', 'database'),
  ('80000000-0000-0000-0000-000000000005', 'Diseases, Pests and Weeds in Tropical Crops', ARRAY['Kranz, J.', 'Schmutterer, H.', 'Koch, W.'], 1977, null, null, null, 'book')
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Migration: 00008_seed_insects.sql
-- -------------------------------------------------------------
-- EntomoLens: seed — verified insect profiles + relationships.
-- Contents are conservative, well-documented agricultural arthropod records.
-- Idempotent via deterministic UUIDs.

insert into public.insects
  (id, scientific_name, common_name, genus_id, family_id, order_id, description,
   identification_characteristics, images, is_pest, is_beneficial, beneficial_category,
   native_region, verification_status, featured)
values
  ('40000000-0000-0000-0000-000000000001', 'Bemisia tabaci', 'Silverleaf whitefly',
   '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'A small sap-feeding whitefly and a serious pest of cotton, vegetables and ornamentals in warm regions. It causes direct feeding damage, excretes honeydew favouring sooty mould, and transmits several plant viruses.',
   'Tiny (about 1 mm long), moth-like flies covered with a white waxy powder; four wings held roof-like; adults disperse in flushes; immature stages are scale-like, greenish-yellow, attached to leaf undersides.',
   '{}', true, false, null, 'Tropical and subtropical worldwide', 'verified', true),
  ('40000000-0000-0000-0000-000000000002', 'Aphis gossypii', 'Cotton aphid',
   '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'A small, soft-bodied aphid attacking cotton, cucurbits and many other crops. Colonies feed on phloem sap, causing curling, honeydew and sooty mould, and transmit viruses such as cucumber mosaic.',
   'Pear-shaped green to dark insects up to 2 mm; two short cornicles (tail tubes); active colonies on young shoots and leaf undersides; both winged and wingless forms occur.',
   '{}', true, false, null, 'Cosmopolitan', 'verified', false),
  ('40000000-0000-0000-0000-000000000003', 'Phenacoccus solenopsis', 'Cotton mealybug',
   '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
   'A polyphagous mealybug that became an important cotton pest in Asia. Dense colonies clog plant growth, produce heavy honeydew and can cause severe leaf loss and boll shedding.',
   'Body soft, covered with white granular wax; females oval, about 3 mm, with short waxy filaments; males small and winged; colonies often in leaf axils and on new growth.',
   '{}', true, false, null, 'North America; invasive in Asia', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000004', 'Dysdercus koenigii', 'Red cotton stainer',
   '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   'A brightly coloured true bug that pierces developing cotton bolls and seeds. Feeding stains the lint brown and reduces fibre quality and germination.',
   'Oval, about 10–15 mm, bright red with black markings; wings have two dark spots; clusters of nymphs and adults on bolls and seedpods.',
   '{}', true, false, null, 'Tropical Asia', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000005', 'Amrasca biguttula', 'Cotton jassid',
   '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
   'A small leafhopper that sucks sap from cotton, okra and other crops. Feeding causes characteristic hopper-burn — yellowing and curling of leaf margins — and reduces plant vigour.',
   'Wedge-shaped, pale green, about 2–3 mm, with two black spots on the vertex; jumps readily when disturbed; nymphs on leaf underside.',
   '{}', true, false, null, 'South and Southeast Asia', 'verified', false),
  ('40000000-0000-0000-0000-000000000006', 'Helicoverpa armigera', 'Old World bollworm',
   '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002',
   'A highly polyphagous moth pest of cotton, tomato, chickpea, maize and many other crops. Larvae bore into fruiting structures, causing heavy yield loss, and the species is a target of integrated and Bt-based management.',
   'Adult: pale brown moth (~35–40 mm wingspan) with a dark band and two spots on each forewing; larva: caterpillar with alternating pale and dark longitudinal lines, up to ~40 mm, colour variable.',
   '{}', true, false, null, 'Africa, Europe, Asia, Australasia; invasive in the Americas', 'verified', true),
  ('40000000-0000-0000-0000-000000000007', 'Spodoptera frugiperda', 'Fall armyworm',
   '30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002',
   'A migratory moth that emerged as a devastating invasive pest of maize and many other crops worldwide. Larvae are strong feeders on foliage, whorls and reproductive structures.',
   'Adult: grey-brown moth with pale markings (~35 mm wingspan); front wing has light spots; larva: young caterpillars are greenish, older ones brown with an inverted white Y on the head and four dark spots on the last abdominal segment.',
   '{}', true, false, null, 'Native to the Americas; invasive in Africa and Asia', 'verified', true),
  ('40000000-0000-0000-0000-000000000008', 'Spodoptera litura', 'Tobacco caterpillar',
   '30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002',
   'A defoliating caterpillar of cotton, okra, tobacco and vegetables. Young larvae feed gregariously on leaf tissue; older larvae disperse and can strip plants.',
   'Adult moth mottled brown with conspicuous white kidney-shaped spots on the forewings; larva has a yellow longitudinal stripe and dark dorsal markings.',
   '{}', true, false, null, 'Asia-Pacific; invasive in Africa', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000009', 'Agrotis ipsilon', 'Black cutworm',
   '30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002',
   'A cutworm whose larvae sever young seedlings at ground level. Damages many field and vegetable crops, especially after weedy fallow or where residues persist.',
   'Larva: greasy dark grey or black caterpillar curling into a C when disturbed; feeds at night and hides in soil by day; adult: plain dark brown moth.',
   '{}', true, false, null, 'Cosmopolitan', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000010', 'Pectinophora gossypiella', 'Pink bollworm',
   '30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002',
   'A specialist pest of cotton that has historically been one of its most damaging. Larvae bore into flowers, squares and bolls, feeding on seed and causing lint spoilage.',
   'Larva: pale caterpillar with pink bands, up to 12 mm; adult: small grey-brown moth with dark spots; overwintering larvae form "double seed" damage in bolls.',
   '{}', true, false, null, 'Tropical and subtropical cotton areas', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000011', 'Leucinodes orbonalis', 'Brinjal shoot and fruit borer',
   '30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002',
   'The classic pest of brinjal (eggplant). Larvae bore into young shoots causing wilting, and into fruits making them unmarketable. Requires frequent crop-specific management.',
   'Larva: pinkish-white caterpillar with a brown head; adult: white moth with brown wing markings, small (about 20 mm wingspan).',
   '{}', true, false, null, 'South and Southeast Asia', 'verified', false),
  ('40000000-0000-0000-0000-000000000012', 'Anthonomus grandis', 'Cotton boll weevil',
   '30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003',
   'A historic cotton pest in the Americas. Adults feed on squares and young bolls and larvae develop inside them, destroying fruiting bodies; eradication programmes have eliminated it from large areas.',
   'Adult: small (3–8 mm) weevil, grey to brown, with a long snout; flattened body when young, stout when older.',
   '{}', true, false, null, 'The Americas', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000013', 'Coccinella septempunctata', 'Seven-spot ladybird',
   '30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003',
   'A familiar and important aphid predator. Both adults and larvae consume large numbers of aphids and other soft-bodied pests, contributing to natural pest suppression.',
   'Adult: convex, shining red beetle with seven black spots; larvae are elongated, bluish-grey and spiny.',
   '{}', false, true, 'predator', 'Palearctic; introduced in North America', 'verified', true),
  ('40000000-0000-0000-0000-000000000014', 'Callosobruchus chinensis', 'Pulse beetle',
   '30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003',
   'A destructive stored-pulse pest. Larvae develop inside seed, hollowing them out and reducing germination and marketability of chickpea and other pulses.',
   'Adult: small (2–3 mm) reddish-brown beetle with round punctures on the elytra; emerges through round exit holes in seeds.',
   '{}', true, false, null, 'Asia', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000015', 'Trogoderma granarium', 'Khapra beetle',
   '30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003',
   'A quarantine-significant pest of stored grain. Larvae are highly destructive and can survive long periods without food, making the beetle very hard to control once established.',
   'Adult: small (2–3 mm), oval, reddish-brown to dark beetle with short elytra; larvae are hairy, banded and cause characteristic shredded grain debris.',
   '{}', true, false, null, 'India and surrounding region; invasive', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000016', 'Thrips tabaci', 'Onion thrips / Tobacco thrips',
   '30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000004',
   'A minute thrips damaging a wide range of crops including onion, tobacco, cotton and chilli. Raspberrying of foliage, silvered patches and virus transmission make it an economic pest.',
   'Slender, pale yellow-brown, about 1.2 mm; wings narrow and fringed; rasping-sucking damage leaves silver streaks.',
   '{}', true, false, null, 'Cosmopolitan', 'verified', false),
  ('40000000-0000-0000-0000-000000000017', 'Bactrocera cucurbitae', 'Melon fruit fly',
   '30000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005',
   'A major fruit fly pest of cucurbits. Females sting maturing fruit and larvae tunnel inside, causing rot and making produce unfit for market.',
   'Adult: yellow-brown fly (about 8 mm) with dark wing markings and a black T-shaped pattern on the abdomen; larvae are white legless maggots in fruit.',
   '{}', true, false, null, 'Asia-Pacific; invasive elsewhere', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000018', 'Episyrphus balteatus', 'Marmalade hoverfly',
   '30000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000005',
   'A common hoverfly whose larvae feed voraciously on aphids, while adults are important flower pollinators. A valuable generalist natural enemy in field crops.',
   'Adult: small hoverfly with orange-yellow and black banded abdomen and a double black band on each segment; larvae are greenish, tapered, slug-like and feed on aphid colonies.',
   '{}', false, true, 'pollinator', 'Palearctic', 'verified', false),
  ('40000000-0000-0000-0000-000000000019', 'Locusta migratoria', 'Migratory locust',
   '30000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000006',
   'A grasshopper that can shift into a gregarious, swarming phase able to devastate field crops and rangeland over large areas.',
   'Adult: large grasshopper (5–6 cm), brown or green, with a characteristic ridge on the pronotum; swarming phase has contrasting colours.',
   '{}', true, false, null, 'Africa, Europe, Asia', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000020', 'Trichogramma chilonis', 'Trichogramma wasp',
   '30000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000007',
   'A minute egg parasitoid of moth pests such as Helicoverpa, Spodoptera and pink bollworm. Mass-reared and released for augmentative biological control in cotton, maize and vegetables.',
   'Adult: tiny (<1 mm), yellowish wasp with fringed wings; develops inside pest eggs shown by darkened emerged host eggs.',
   '{}', false, true, 'parasitoid', 'Asia', 'verified', false),
  ('40000000-0000-0000-0000-000000000021', 'Apis mellifera', 'Western honey bee',
   '30000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000007',
   'The most widely managed pollinator in agriculture. Honey bees pollinate many fruit, vegetable and oilseed crops, substantively increasing fruit set and yield.',
   'Adult worker: about 12–15 mm, amber-brown with black bands, robust and hairy; queens larger; colonies live in cavities with characteristic hexagonal comb.',
   '{}', false, true, 'pollinator', 'Europe, Africa, West Asia; spread worldwide', 'verified', true),
  ('40000000-0000-0000-0000-000000000022', 'Orius laevigatus', 'Minute pirate bug',
   '30000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000001',
   'A small predatory bug used for biological control, especially of thrips. Both nymphs and adults also feed on aphids, mites and pest eggs.',
   'Adult: small (about 2 mm), dark with conspicuous white wing patches when wings are spread.',
   '{}', false, true, 'predator', 'Europe and Mediterranean', 'reviewed', false),
  ('40000000-0000-0000-0000-000000000023', 'Nilaparvata lugens', 'Brown planthopper',
   '30000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000001',
   'A key pest of irrigated rice in Asia. Dense populations cause hopperburn — sudden browning and wilting of rice hills — and the insect transmits grassy and ragged stunt viruses.',
   'Adult: small brown hopper (2.5–4 mm), no distinct markings, wings normal or long-winged in migrants; nymphs whitish to brown on the plant base.',
   '{}', true, false, null, 'South, Southeast and East Asia', 'verified', false),
  ('40000000-0000-0000-0000-000000000024', 'Chrysoperla carnea', 'Common green lacewing',
   '30000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000008',
   'A widely used beneficial insect. Larvae (aphid lions) are generalist predators of aphids, whitefly, thrips, mites and moth eggs, and are mass-released in integrated programmes.',
   'Adult: delicate pale green lacewing with golden eyes and finely veined clear wings; larvae are elongated brownish-grey with large jaws.',
   '{}', false, true, 'predator', 'Temperate regions; native in Europe', 'verified', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Life cycles (conventional durations; verified records)
-- ---------------------------------------------------------------------------
insert into public.life_cycles
  (insect_id, stage_order, stage_name, duration, appearance, feeding_behavior, damage_description)
values
  ('40000000-0000-0000-0000-000000000001', 1, 'egg', '5–7 days', 'Small, oval, whitish eggs on leaf underside; change colour before hatching.', 'None.', 'None directly; eggs cluster on new growth.'),
  ('40000000-0000-0000-0000-000000000001', 2, 'nymph', '12–16 days (4 instars)', 'Flattened, semi-transparent squamae attached to leaf underside.', 'Sap feeding through stylets.', 'Leaf yellowing and stippling.'),
  ('40000000-0000-0000-0000-000000000001', 3, 'pupa', '3–6 days (puparium)', 'Oval raised "casing" resembling a scale.', 'None.', '—'),
  ('40000000-0000-0000-0000-000000000001', 4, 'adult', 'Several weeks', 'Small white moth-like fly resting roof-like over body.', 'Sap feeding; egg laying and flight dispersal.', 'Honeydew, sooty mould, virus transmission.'),

  ('40000000-0000-0000-0000-000000000002', 1, 'nymph', '6–7 days', 'Soft-bodied green aphid nymphs in colonies.', 'Phloem sap feeding.', 'Colony growth, leaf curl.'),
  ('40000000-0000-0000-0000-000000000002', 2, 'adult', 'About 2–3 weeks', 'Winged or wingless pear-shaped adults around 2 mm.', 'Phloem sap feeding; viviparous reproduction.', 'Honeydew, sooty mould, curling.'),

  ('40000000-0000-0000-0000-000000000006', 1, 'egg', '2–4 days', 'Globular, ribbed, whitish eggs laid singly.', 'None.', 'None directly.'),
  ('40000000-0000-0000-0000-000000000006', 2, 'larva', '13–22 days (6 instars)', 'Caterpillar with pale and dark lateral lines; colour variable.', 'Foliage and fruiting parts; bore into bolls and pods.', 'Fruit boring with entry holes and frass; square/boll shedding.'),
  ('40000000-0000-0000-0000-000000000006', 3, 'pupa', '10–14 days', 'Brown pupa in soil chamber.', 'Non-feeding.', '—'),
  ('40000000-0000-0000-0000-000000000006', 4, 'adult', '7–10 days', 'Pale brown moth, dark median band on forewing.', 'Nectar feeding; mates and oviposits.', 'Damage from larval offspring.'),

  ('40000000-0000-0000-0000-000000000007', 1, 'egg', '2–3 days', 'Small dome-shaped, laid in masses covered with scale-like hairs.', 'None.', 'None directly.'),
  ('40000000-0000-0000-0000-000000000007', 2, 'larva', '14–21 days (6 instars)', 'Green young larvae; older brown with white inverted Y on head.', 'Foliage, whorl, cob and ear feeding.', 'Foliar stripping, whorl damage, cob feeding; frass in whorls.'),
  ('40000000-0000-0000-0000-000000000007', 3, 'pupa', '8–10 days', 'Red-brown pupa in soil.', 'Non-feeding.', '—'),
  ('40000000-0000-0000-0000-000000000007', 4, 'adult', '10–21 days', 'Grey-brown moth, ~35 mm wingspan.', 'Feeds on nectar; migrates long distances.', '—'),

  ('40000000-0000-0000-0000-000000000010', 1, 'egg', '3–5 days', 'Very small elongate white eggs near buds.', 'None.', 'None directly.'),
  ('40000000-0000-0000-0000-000000000010', 2, 'larva', '10–18 days', 'White caterpillar with pink bands, ~12 mm.', 'Bores into flowers, squares and bolls.', '"Double seed" damage and lint spoilage.'),
  ('40000000-0000-0000-0000-000000000010', 3, 'pupa', '8–10 days', 'Brown pupa in plant debris or soil.', 'Non-feeding.', '—'),
  ('40000000-0000-0000-0000-000000000010', 4, 'adult', '5–10 days', 'Small grey-brown moth with dark terminal spots.', 'Nectar feeding and mating.', '—'),

  ('40000000-0000-0000-0000-000000000011', 1, 'egg', '3–5 days', 'Pale, laid singly on shoots.', 'None.', 'None directly.'),
  ('40000000-0000-0000-0000-000000000011', 2, 'larva', '12–18 days', 'Pinkish-white caterpillar, brown head.', 'Boores into shoots and fruits.', 'Wilted shoots; bored, rotting fruit.'),
  ('40000000-0000-0000-0000-000000000011', 3, 'pupa', '6–9 days', 'Silken cocoon in debris or dried shoots.', 'Non-feeding.', '—'),
  ('40000000-0000-0000-0000-000000000011', 4, 'adult', '4–7 days', 'White moth with brown wing markings.', 'Nectar feeding and egg laying.', '—'),

  ('40000000-0000-0000-0000-000000000016', 1, 'egg', '4–5 days', 'Minute kidney-shaped eggs inserted in leaf tissue.', 'None.', 'None directly.'),
  ('40000000-0000-0000-0000-000000000016', 2, 'nymph', '5–6 days (2 instars)', 'Pale elongated nymphs.', 'Rasping and sucking cell contents.', 'Silvered, stippled foliage.'),
  ('40000000-0000-0000-0000-000000000016', 3, 'pupa', '2–3 days (prepupa+pupa)', 'Non-feeding pupal stages in soil or leaf litter.', 'None.', '—'),
  ('40000000-0000-0000-0000-000000000016', 4, 'adult', '7–15 days', 'Slender yellow-brown thrips, fringed wings.', 'Rasping and viral transmission.', 'Silvered streaks and leaf damage.'),

  ('40000000-0000-0000-0000-000000000023', 1, 'nymph', 'About 2–3 weeks', 'Whitish to brown nymphs at plant base.', 'Phloem sap feeding on tiller bases.', 'Tiller damage on rice.'),
  ('40000000-0000-0000-0000-000000000023', 2, 'adult', '1–2 weeks', 'Small brown hopper, winged forms migrate.', 'Phloem sap feeding; hopperburn.', 'Hopperburn: browning and wilting of rice; virus transmissions.'),

  ('40000000-0000-0000-0000-000000000013', 1, 'egg', '3–5 days', 'Bright yellow elongate eggs laid near prey.', 'None.', 'N/A (beneficial).'),
  ('40000000-0000-0000-0000-000000000013', 2, 'larva', '1–2 weeks', 'Blue-grey spiny larva.', 'Consumes several hundred aphids.', 'N/A (enemy of pests).'),
  ('40000000-0000-0000-0000-000000000013', 3, 'pupa', '1 week', 'Dark pupa attached to leaf.', 'Non-feeding.', '—'),
  ('40000000-0000-0000-0000-000000000013', 4, 'adult', 'Several weeks', 'Shining red beetle with seven spots.', 'Predation on aphids; also pollens.', '—'),

  ('40000000-0000-0000-0000-000000000024', 1, 'egg', '3–5 days', 'Small eggs on stalks at the end of silk threads.', 'None.', 'N/A (beneficial).'),
  ('40000000-0000-0000-0000-000000000024', 2, 'larva', 'About 2 weeks', 'Brownish-grey flattened larva with large jaws.', 'Predates aphids, whitefly, thrips, eggs.', 'N/A (enemy of pests).'),
  ('40000000-0000-0000-0000-000000000024', 3, 'pupa', 'About 1 week', 'Silken cocoon on foliage.', 'Non-feeding.', '—'),
  ('40000000-0000-0000-0000-000000000024', 4, 'adult', 'Several weeks', 'Delicate green lacewing, golden eyes.', 'Nectar, pollen and honeydew feeding.', '—')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Crop associations
-- ---------------------------------------------------------------------------
insert into public.crop_insects (crop_id, insect_id, relationship_type, severity) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000006', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000010', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000012', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000008', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000016', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000013', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000024', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000020', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000022', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000018', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000021', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000009', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000019', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000015', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000013', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000018', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000007', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000006', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000009', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000019', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000013', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000024', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000020', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000018', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000023', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000007', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000019', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000015', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000020', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000021', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000006', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000007', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000016', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000013', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000024', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000021', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000005', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000002', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000004', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000008', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000013', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000024', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000022', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000021', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000006', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000009', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000014', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000020', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000009', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000007', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000019', 'pest', 'occasional'),

  ('50000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000009', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000001', 'pest', 'occasional'),
  ('50000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000013', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000011', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000016', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000020', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000022', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000021', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000016', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000001', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000006', 'pest', 'minor'),
  ('50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000013', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000024', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000022', 'beneficial', null),
  ('50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000021', 'beneficial', null),

  ('50000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000017', 'pest', 'major'),
  ('50000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000021', 'beneficial', null)
on conflict (crop_id, insect_id, relationship_type) do nothing;

-- ---------------------------------------------------------------------------
-- Damage symptom associations
-- ---------------------------------------------------------------------------
insert into public.insect_damage_symptoms (insect_id, symptom_id, description, severity) values
  ('40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'Fine stippling and yellowing on older leaves.', 'moderate'),
  ('40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', 'Honeydew supports sooty mould on foliage and bolls.', 'high'),
  ('40000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000008', 'Curled and distorted young leaves and shoots.', 'high'),
  ('40000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 'Honeydew and sooty mould on infested growth.', 'moderate'),
  ('40000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', 'Heavy honeydew and sooty mould from dense colonies.', 'high'),
  ('40000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 'Staining damage and fibre discolouration after feeding.', 'high'),
  ('40000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000008', 'Hopper-burn: yellowing and curling of leaf margins.', 'high'),
  ('40000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000005', 'Round entry/exit holes in bolls, pods and fruit with frass.', 'high'),
  ('40000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000001', 'Feeding on squares and young leaves; shedding of fruiting bodies.', 'moderate'),
  ('40000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000006', 'Skeletonization and windowpane feeding on maize whorls.', 'high'),
  ('40000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', 'Cob and ear damage with heavy frass.', 'high'),
  ('40000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000006', 'Foliar stripping and skeletonization by older larvae.', 'high'),
  ('40000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000009', 'Seedlings severed at the base; plants topple.', 'high'),
  ('40000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000005', 'Bored squares, bolls and flowers; seed damage.', 'high'),
  ('40000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000009', 'Wilted shoots from larval boring.', 'high'),
  ('40000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000005', 'Bored, rotting fruit with exit holes.', 'high'),
  ('40000000-0000-0000-0000-000000000012', '60000000-0000-0000-0000-000000000005', 'Punctured and aborted squares and young bolls.', 'high'),
  ('40000000-0000-0000-0000-000000000014', '60000000-0000-0000-0000-000000000010', 'Hollowed stored seeds and round exit holes.', 'high'),
  ('40000000-0000-0000-0000-000000000015', '60000000-0000-0000-0000-000000000010', 'Grain shredded and contaminated in storage.', 'high'),
  ('40000000-0000-0000-0000-000000000016', '60000000-0000-0000-0000-000000000002', 'Silver streaks and stippling from rasping feeding.', 'moderate'),
  ('40000000-0000-0000-0000-000000000017', '60000000-0000-0000-0000-000000000005', 'Sting marks and rotting tunnels inside cucurbit fruit.', 'high'),
  ('40000000-0000-0000-0000-000000000019', '60000000-0000-0000-0000-000000000001', 'Extensive defoliation during swarming outbreaks.', 'high'),
  ('40000000-0000-0000-0000-000000000023', '60000000-0000-0000-0000-000000000009', 'Hopperburn: sudden browning and wilting of rice hills.', 'high')
on conflict (insect_id, symptom_id) do nothing;

-- ---------------------------------------------------------------------------
-- Natural enemy relationships
-- ---------------------------------------------------------------------------
insert into public.natural_enemy_relationships (pest_insect_id, enemy_insect_id, relationship) values
  ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000024', 'predator'),
  ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000022', 'predator'),
  ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000013', 'predator'),
  ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000024', 'predator'),
  ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000018', 'predator'),
  ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000022', 'predator'),
  ('40000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000022', 'predator'),
  ('40000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000020', 'parasitoid'),
  ('40000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000024', 'predator'),
  ('40000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000013', 'predator'),
  ('40000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000020', 'parasitoid'),
  ('40000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000022', 'predator'),
  ('40000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000020', 'parasitoid'),
  ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000020', 'parasitoid'),
  ('40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000020', 'parasitoid'),
  ('40000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000022', 'predator')
on conflict (pest_insect_id, enemy_insect_id, relationship) do nothing;

-- ---------------------------------------------------------------------------
-- IPM management per insect
-- ---------------------------------------------------------------------------
insert into public.insect_management (insect_id, method_id, notes) values
  ('40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Use yellow sticky traps and inspect leaf undersides weekly.'),
  ('40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Avoid crop overlap; rogue infected plants to reduce virus sources.'),
  ('40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000005', 'Conserve lacewings and minute pirate bugs.'),
  ('40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', 'Only when thresholds are exceeded; rotate insecticide groups.'),
  ('40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'Scout young growth for colony build-up.'),
  ('40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003', 'Remove severely infested shoots.'),
  ('40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Ladybirds, lacewings and hoverflies are effective.'),
  ('40000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', 'Check leaf axils and new growth; ants tending colonies need control.'),
  ('40000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'Remove and destroy heavily infested parts.'),
  ('40000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000003', 'Hand pick adults and nymphs from bolls where feasible.'),
  ('40000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000002', 'Prompt harvest and clean-up of alternative hosts.'),
  ('40000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000001', 'Monitor with yellow sticky traps and hopper counts.'),
  ('40000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000002', 'Some cultivars show tolerance; avoid host crop overlap.'),
  ('40000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000001', 'Pheromone traps and egg scouting guide decisions.'),
  ('40000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000002', 'Bt cotton and timely sowing reduce pressure.'),
  ('40000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000005', 'Release Trichogramma at egg stage; conserve predators.'),
  ('40000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000006', 'Apply when scouting thresholds are met; time to egg stage.'),
  ('40000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000001', 'Scout whorls and margins; use pheromone traps.'),
  ('40000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000003', 'Crush egg masses and hand-pick larvae in small plots.'),
  ('40000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000005', 'Trichogramma releases and natural predators help early.'),
  ('40000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000006', 'Target early instars; rotate chemistries to delay resistance.'),
  ('40000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000001', 'Watch for first instar feeding windows.'),
  ('40000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000005', 'Egg parasitoids and predators suppress young larvae.'),
  ('40000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000001', 'Night scouting near seedling rows.'),
  ('40000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000003', 'Remove soil debris and destroy larvae found at plant base.'),
  ('40000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000001', 'Pheromone traps and pick-up of shed bolls.'),
  ('40000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000003', 'Destroy infested bolls and post-harvest stalks.'),
  ('40000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000005', 'Trichogramma releases are widely used.'),
  ('40000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000001', 'Regular removal and destruction of infested shoots and fruit.'),
  ('40000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000005', 'Trichogramma and parasitoid conservation.'),
  ('40000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000006', 'Insecticide timing at peak adult emergence.'),
  ('40000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000001', 'Trap-based monitoring of overwintering adults.'),
  ('40000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000002', 'Aid regional eradication/containment programmes.'),
  ('40000000-0000-0000-0000-000000000014', '70000000-0000-0000-0000-000000000007', 'Clean storage, airtight containers and early consumption of pulses.'),
  ('40000000-0000-0000-0000-000000000014', '70000000-0000-0000-0000-000000000004', 'Solar disinfestation of stored seed where practical.'),
  ('40000000-0000-0000-0000-000000000015', '70000000-0000-0000-0000-000000000007', 'Strict quarantine hygiene; storage fumigation only by licensed operators.'),
  ('40000000-0000-0000-0000-000000000016', '70000000-0000-0000-0000-000000000001', 'Blue sticky traps for monitoring.'),
  ('40000000-0000-0000-0000-000000000016', '70000000-0000-0000-0000-000000000004', 'Sticky traps and reflective mulches deter populations.'),
  ('40000000-0000-0000-0000-000000000016', '70000000-0000-0000-0000-000000000005', 'Minute pirate bugs control thrips effectively.'),
  ('40000000-0000-0000-0000-000000000017', '70000000-0000-0000-0000-000000000001', 'Methyl-eugenol and cue-lure traps for monitoring (crop-specific lures).'),
  ('40000000-0000-0000-0000-000000000017', '70000000-0000-0000-0000-000000000002', 'Harvest fruit early; remove and destroy infested fruit.'),
  ('40000000-0000-0000-0000-000000000019', '70000000-0000-0000-0000-000000000001', 'Early warning monitoring at outbreak foci.'),
  ('40000000-0000-0000-0000-000000000019', '70000000-0000-0000-0000-000000000002', 'Use of barrier crops and early detection campaigns.'),
  ('40000000-0000-0000-0000-000000000023', '70000000-0000-0000-0000-000000000001', 'Water-level and field sampling; avoid over-fertilizing rice.'),
  ('40000000-0000-0000-0000-000000000023', '70000000-0000-0000-0000-000000000002', 'Use resistant/tolerant rice varieties and balanced nitrogen.'),
  ('40000000-0000-0000-0000-000000000023', '70000000-0000-0000-0000-000000000005', 'Conserve planthopper natural enemies (spiders and mirids).')
on conflict (insect_id, method_id) do nothing;

-- ---------------------------------------------------------------------------
-- Reference links
-- ---------------------------------------------------------------------------
insert into public.insect_scientific_references (insect_id, reference_id) values
  ('40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000007', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000009', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000010', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000011', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000012', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000013', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000014', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000015', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000016', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000017', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000019', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000020', '80000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000023', '80000000-0000-0000-0000-000000000003')
on conflict (insect_id, reference_id) do nothing;

-- -------------------------------------------------------------
-- Migration: 00009_seed_quizzes.sql
-- -------------------------------------------------------------
-- 00009_seed_quizzes.sql
-- Curated quizzes across all six categories and three difficulty levels.
-- Deterministic UUIDs: quizzes a0000000-…, questions b0000000-…, options c0000000-…

-- ---------------------------------------------------------------------------
-- Quizzes
-- ---------------------------------------------------------------------------
insert into public.quizzes (id, title, category, difficulty, description) values
  ('a0000000-0000-4000-8000-000000000001', 'Taxonomy Basics',                  'taxonomy',            'beginner',     'Ranking, naming and the ordering of insect life.'),
  ('a0000000-0000-4000-8000-000000000002', 'Advanced Taxonomy',                'taxonomy',            'advanced',     'Families and finer classification of common agroecosystem insects.'),
  ('a0000000-0000-4000-8000-000000000003', 'Pest Identification',              'pest-identification', 'beginner',     'Recognise the most common field pests.'),
  ('a0000000-0000-4000-8000-000000000004', 'Common Field Pests',               'pest-identification', 'intermediate', 'Identification of pests from their damage symptoms.'),
  ('a0000000-0000-4000-8000-000000000005', 'Beneficial Insects',               'beneficial-insects',  'beginner',     'The insects that work for you.'),
  ('a0000000-0000-4000-8000-000000000006', 'Beneficial Professionals',         'beneficial-insects',  'intermediate', 'Predators, parasitoids and bio-control agents.'),
  ('a0000000-0000-4000-8000-000000000007', 'Life Cycles',                      'life-cycles',         'beginner',     'How insects grow and develop.'),
  ('a0000000-0000-4000-8000-000000000008', 'Advanced Life Cycles',             'life-cycles',         'advanced',     'Diapause, polymorphism and hidden development.'),
  ('a0000000-0000-4000-8000-000000000009', 'Crop Pests',                       'crop-pests',          'beginner',     'Major pests of cotton, rice, sugarcane and vegetables.'),
  ('a0000000-0000-4000-8000-00000000000a', 'IPM Fundamentals',                 'ipm',                 'beginner',     'Core ideas behind Integrated Pest Management.'),
  ('a0000000-0000-4000-8000-00000000000b', 'IPM Strategy',                     'ipm',                 'intermediate', 'Thresholds, scouting and bio-control decisions.'),
  ('a0000000-0000-4000-8000-00000000000c', 'Cotton IPM Challenge',             'crop-pests',          'advanced',     'A field-season scenario quiz for the cotton crop.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Questions + options (correct option first in each block)
-- ---------------------------------------------------------------------------

-- Quiz 1: Taxonomy Basics (q01–q04)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Which is the highest (broadest) taxonomic rank?',
   'Ranking from broadest to narrowest: Kingdom → Phylum → Class → Order → Family → Genus → Species.', 1),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'A scientific name such as Helicoverpa armigera is written…',
   'Binomial names are italicised with the genus capitalised and the species in lower case.', 2),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'To which order does the honeybee belong?',
   'Bees, wasps and ants belong to Hymenoptera, defined by two pairs of membranous wings.', 3),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'The science of naming and classifying organisms is called…',
   'Taxonomy is the discipline of identifying, naming and classifying organisms.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Order', true, 1),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Family', false, 2),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Genus', false, 3),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Species', false, 4),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'With an italic genus and lower-case species', true, 1),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'With capitals for both words', false, 2),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000002', 'In quotation marks', false, 3),
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000002', 'Underlined only', false, 4),
  ('c0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000003', 'Hymenoptera', true, 1),
  ('c0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-000000000003', 'Diptera', false, 2),
  ('c0000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-000000000003', 'Lepidoptera', false, 3),
  ('c0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-000000000003', 'Coleoptera', false, 4),
  ('c0000000-0000-4000-8000-00000000000d', 'b0000000-0000-4000-8000-000000000004', 'Taxonomy', true, 1),
  ('c0000000-0000-4000-8000-00000000000e', 'b0000000-0000-4000-8000-000000000004', 'Ecology', false, 2),
  ('c0000000-0000-4000-8000-00000000000f', 'b0000000-0000-4000-8000-000000000004', 'Entomology', false, 3),
  ('c0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000004', 'Embryology', false, 4);

-- Quiz 2: Advanced Taxonomy (q05–q08)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002',
   'In binomial nomenclature the first word of the name denotes the…',
   'The first word is the genus (e.g. Coccinella in Coccinella septempunctata).', 1),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002',
   'Ladybird beetles belong to which family?',
   'Coccinellidae — the ladybird or lady beetle family.', 2),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002',
   'The predatory green lacewing belongs to which order?',
   'Green lacewings are Neuroptera — lacewings, owlflies and antlions.', 3),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002',
   'Whiteflies belong to which hemipteran family?',
   'Whiteflies are Aleyrodidae, tiny sap-feeding true bugs.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000005', 'Genus', true, 1),
  ('c0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000005', 'Species', false, 2),
  ('c0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000005', 'Family', false, 3),
  ('c0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000005', 'Order', false, 4),
  ('c0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000006', 'Coccinellidae', true, 1),
  ('c0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000006', 'Chrysopidae', false, 2),
  ('c0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000006', 'Syrphidae', false, 3),
  ('c0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000006', 'Trichogrammatidae', false, 4),
  ('c0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000007', 'Neuroptera', true, 1),
  ('c0000000-0000-4000-8000-00000000001a', 'b0000000-0000-4000-8000-000000000007', 'Odonata', false, 2),
  ('c0000000-0000-4000-8000-00000000001b', 'b0000000-0000-4000-8000-000000000007', 'Mantodea', false, 3),
  ('c0000000-0000-4000-8000-00000000001c', 'b0000000-0000-4000-8000-000000000007', 'Isoptera', false, 4),
  ('c0000000-0000-4000-8000-00000000001d', 'b0000000-0000-4000-8000-000000000008', 'Aleyrodidae', true, 1),
  ('c0000000-0000-4000-8000-00000000001e', 'b0000000-0000-4000-8000-000000000008', 'Aphididae', false, 2),
  ('c0000000-0000-4000-8000-00000000001f', 'b0000000-0000-4000-8000-000000000008', 'Cicadellidae', false, 3),
  ('c0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000008', 'Thripidae', false, 4);

-- Quiz 3: Pest Identification (q09–q12)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000003',
   'A small soft-bodied insect clustering on new shoots and producing sticky honeydew is most likely…',
   'Aphids are soft-bodied, gregarious sap-feeders that excrete honeydew, which attracts ants.', 1),
  ('b0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000003',
   'The pest that bores into cotton bolls and leaves “rosette” damage is the…',
   'Pink bollworm (Pectinophora gossypiella) feeds inside bolls causing rosetting and exit holes.', 2),
  ('b0000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000003',
   'Fall armyworm belongs to which insect order?',
   'Moths and butterflies, including fall armyworm Spodoptera frugiperda, are Lepidoptera.', 3),
  ('b0000000-0000-4000-8000-00000000000c', 'a0000000-0000-4000-8000-000000000003',
   'Tiny slender insects that rasp leaf tissue causing silvery streaks are…',
   'Thrips rasp the leaf surface and feed on exuding sap, leaving silvery scars.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000009', 'Aphid', true, 1),
  ('c0000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000009', 'Whitefly', false, 2),
  ('c0000000-0000-4000-8000-000000000023', 'b0000000-0000-4000-8000-000000000009', 'Thrips', false, 3),
  ('c0000000-0000-4000-8000-000000000024', 'b0000000-0000-4000-8000-000000000009', 'Scale insect', false, 4),
  ('c0000000-0000-4000-8000-000000000025', 'b0000000-0000-4000-8000-00000000000a', 'Pink bollworm', true, 1),
  ('c0000000-0000-4000-8000-000000000026', 'b0000000-0000-4000-8000-00000000000a', 'Jassid', false, 2),
  ('c0000000-0000-4000-8000-000000000027', 'b0000000-0000-4000-8000-00000000000a', 'Whitefly', false, 3),
  ('c0000000-0000-4000-8000-000000000028', 'b0000000-0000-4000-8000-00000000000a', 'Mealybug', false, 4),
  ('c0000000-0000-4000-8000-000000000029', 'b0000000-0000-4000-8000-00000000000b', 'Lepidoptera', true, 1),
  ('c0000000-0000-4000-8000-00000000002a', 'b0000000-0000-4000-8000-00000000000b', 'Diptera', false, 2),
  ('c0000000-0000-4000-8000-00000000002b', 'b0000000-0000-4000-8000-00000000000b', 'Coleoptera', false, 3),
  ('c0000000-0000-4000-8000-00000000002c', 'b0000000-0000-4000-8000-00000000000b', 'Hemiptera', false, 4),
  ('c0000000-0000-4000-8000-00000000002d', 'b0000000-0000-4000-8000-00000000000c', 'Thrips', true, 1),
  ('c0000000-0000-4000-8000-00000000002e', 'b0000000-0000-4000-8000-00000000000c', 'Aphids', false, 2),
  ('c0000000-0000-4000-8000-00000000002f', 'b0000000-0000-4000-8000-00000000000c', 'Leaf miners', false, 3),
  ('c0000000-0000-4000-8000-000000000030', 'b0000000-0000-4000-8000-00000000000c', 'Mites', false, 4);

-- Quiz 4: Common Field Pests (q13–q16)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000004',
   '“Hopper burn” with yellow-browning leaf margins on cotton is caused by…',
   'Cotton jassid feeding removes sap and injects toxins, causing characteristic hopper burn.', 1),
  ('b0000000-0000-4000-8000-00000000000e', 'a0000000-0000-4000-8000-000000000004',
   'Silvery-white streaks and curled distorted leaves on onion/chili indicate…',
   'Thrips rasping produces silvery scars and leaf curl; adults and nymphs hide in folded leaves.', 2),
  ('b0000000-0000-4000-8000-00000000000f', 'a0000000-0000-4000-8000-000000000004',
   'Entry holes ringed with brown frass pellets in tomato/cotton fruit are typical of…',
   'Helicoverpa (American bollworm) larvae bore in and push out excreta-frass around the hole.', 3),
  ('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000004',
   'Ground termites most often attack crops at the…',
   'Termites girdle stems near the soil line and attack after transplanting or in dry spells.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000031', 'b0000000-0000-4000-8000-00000000000d', 'Cotton jassid', true, 1),
  ('c0000000-0000-4000-8000-000000000032', 'b0000000-0000-4000-8000-00000000000d', 'Whitefly', false, 2),
  ('c0000000-0000-4000-8000-000000000033', 'b0000000-0000-4000-8000-00000000000d', 'Aphid', false, 3),
  ('c0000000-0000-4000-8000-000000000034', 'b0000000-0000-4000-8000-00000000000d', 'Spider mite', false, 4),
  ('c0000000-0000-4000-8000-000000000035', 'b0000000-0000-4000-8000-00000000000e', 'Thrips', true, 1),
  ('c0000000-0000-4000-8000-000000000036', 'b0000000-0000-4000-8000-00000000000e', 'Jassid', false, 2),
  ('c0000000-0000-4000-8000-000000000037', 'b0000000-0000-4000-8000-00000000000e', 'Whitefly', false, 3),
  ('c0000000-0000-4000-8000-000000000038', 'b0000000-0000-4000-8000-00000000000e', 'Aphid', false, 4),
  ('c0000000-0000-4000-8000-000000000039', 'b0000000-0000-4000-8000-00000000000f', 'American bollworm (Helicoverpa)', true, 1),
  ('c0000000-0000-4000-8000-00000000003a', 'b0000000-0000-4000-8000-00000000000f', 'Pink bollworm only', false, 2),
  ('c0000000-0000-4000-8000-00000000003b', 'b0000000-0000-4000-8000-00000000000f', 'Fruit fly', false, 3),
  ('c0000000-0000-4000-8000-00000000003c', 'b0000000-0000-4000-8000-00000000000f', 'Cutworm', false, 4),
  ('c0000000-0000-4000-8000-00000000003d', 'b0000000-0000-4000-8000-000000000010', 'Stem base near the soil line', true, 1),
  ('c0000000-0000-4000-8000-00000000003e', 'b0000000-0000-4000-8000-000000000010', 'Tops of mature plants', false, 2),
  ('c0000000-0000-4000-8000-00000000003f', 'b0000000-0000-4000-8000-000000000010', 'Root tip only', false, 3),
  ('c0000000-0000-4000-8000-000000000040', 'b0000000-0000-4000-8000-000000000010', 'Leaf lamina', false, 4);

-- Quiz 5: Beneficial Insects (q17–q20)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000005',
   'Ladybird beetle larvae mainly feed on…',
   'Both larval and adult ladybirds are voracious predators of aphids and scales.', 1),
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000005',
   'The “aphid lion” is the larva of the…',
   'Green lacewing larvae, known as aphid lions, pierce and drain their prey.', 2),
  ('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000005',
   'Honeybees are vital in agriculture mainly because they…',
   'Pollination by bees increases fruit-set and yield for many crops.', 3),
  ('b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000005',
   'Trichogramma wasps are natural enemies that…',
   'Trichogramma are egg parasitoids — adults lay eggs inside pest eggs, killing them.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000011', 'Aphids and scale insects', true, 1),
  ('c0000000-0000-4000-8000-000000000042', 'b0000000-0000-4000-8000-000000000011', 'Pollen only', false, 2),
  ('c0000000-0000-4000-8000-000000000043', 'b0000000-0000-4000-8000-000000000011', 'Plant leaves', false, 3),
  ('c0000000-0000-4000-8000-000000000044', 'b0000000-0000-4000-8000-000000000011', 'Nectar only', false, 4),
  ('c0000000-0000-4000-8000-000000000045', 'b0000000-0000-4000-8000-000000000012', 'Green lacewing', true, 1),
  ('c0000000-0000-4000-8000-000000000046', 'b0000000-0000-4000-8000-000000000012', 'Hoverfly', false, 2),
  ('c0000000-0000-4000-8000-000000000047', 'b0000000-0000-4000-8000-000000000012', 'Ground beetle', false, 3),
  ('c0000000-0000-4000-8000-000000000048', 'b0000000-0000-4000-8000-000000000012', 'Damselfly', false, 4),
  ('c0000000-0000-4000-8000-000000000049', 'b0000000-0000-4000-8000-000000000013', 'They pollinate flowers', true, 1),
  ('c0000000-0000-4000-8000-00000000004a', 'b0000000-0000-4000-8000-000000000013', 'They eat aphids', false, 2),
  ('c0000000-0000-4000-8000-00000000004b', 'b0000000-0000-4000-8000-000000000013', 'They aerate soil', false, 3),
  ('c0000000-0000-4000-8000-00000000004c', 'b0000000-0000-4000-8000-000000000013', 'They fix nitrogen', false, 4),
  ('c0000000-0000-4000-8000-00000000004d', 'b0000000-0000-4000-8000-000000000014', 'Kill pest eggs as egg parasitoids', true, 1),
  ('c0000000-0000-4000-8000-00000000004e', 'b0000000-0000-4000-8000-000000000014', 'Sting humans', false, 2),
  ('c0000000-0000-4000-8000-00000000004f', 'b0000000-0000-4000-8000-000000000014', 'Compete with bees for nectar', false, 3),
  ('c0000000-0000-4000-8000-000000000050', 'b0000000-0000-4000-8000-000000000014', 'Bore into wood', false, 4);

-- Quiz 6: Beneficial Professionals (q21–q24)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000006',
   'A predatory mite widely released for thrips and mite control is…',
   'Amblyseius (Neoseiulus) species are commercially used predatory mites.', 1),
  ('b0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000006',
   'Cryptolaemus montrouzieri (mealybug destroyer) is a specialist predator of…',
   'This ladybird beetle and its larvae attack mealybug colonies.', 2),
  ('b0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000006',
   'Which agent is used as a mycoinsecticide against sucking pests?',
   'Entomopathogenic fungi such as Beauveria bassiana infect and kill insect pests.', 3),
  ('b0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000006',
   'Encarsia formosa is a parasitoid used against…',
   'Encarsia formosa is the classic greenhouse parasitoid of whitefly nymphs.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000015', 'Amblyseius (predatory mite)', true, 1),
  ('c0000000-0000-4000-8000-000000000052', 'b0000000-0000-4000-8000-000000000015', 'Spider mite', false, 2),
  ('c0000000-0000-4000-8000-000000000053', 'b0000000-0000-4000-8000-000000000015', 'Scabies mite', false, 3),
  ('c0000000-0000-4000-8000-000000000054', 'b0000000-0000-4000-8000-000000000015', 'Varroa mite', false, 4),
  ('c0000000-0000-4000-8000-000000000055', 'b0000000-0000-4000-8000-000000000016', 'Mealybugs', true, 1),
  ('c0000000-0000-4000-8000-000000000056', 'b0000000-0000-4000-8000-000000000016', 'Aphids', false, 2),
  ('c0000000-0000-4000-8000-000000000057', 'b0000000-0000-4000-8000-000000000016', 'Grasshoppers', false, 3),
  ('c0000000-0000-4000-8000-000000000058', 'b0000000-0000-4000-8000-000000000016', 'Mole crickets', false, 4),
  ('c0000000-0000-4000-8000-000000000059', 'b0000000-0000-4000-8000-000000000017', 'Beauveria bassiana (fungus)', true, 1),
  ('c0000000-0000-4000-8000-00000000005a', 'b0000000-0000-4000-8000-000000000017', 'Baculovirus only', false, 2),
  ('c0000000-0000-4000-8000-00000000005b', 'b0000000-0000-4000-8000-000000000017', 'Entomopathogenic bacteria only', false, 3),
  ('c0000000-0000-4000-8000-00000000005c', 'b0000000-0000-4000-8000-000000000017', 'Nematode-trapping bacterium', false, 4),
  ('c0000000-0000-4000-8000-00000000005d', 'b0000000-0000-4000-8000-000000000018', 'Whiteflies', true, 1),
  ('c0000000-0000-4000-8000-00000000005e', 'b0000000-0000-4000-8000-000000000018', 'Aphids', false, 2),
  ('c0000000-0000-4000-8000-00000000005f', 'b0000000-0000-4000-8000-000000000018', 'Caterpillars', false, 3),
  ('c0000000-0000-4000-8000-000000000060', 'b0000000-0000-4000-8000-000000000018', 'Scale insects', false, 4);

-- Quiz 7: Life Cycles (q25–q28)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000007',
   'Complete metamorphosis proceeds as…',
   'Egg → larva → pupa → adult (holometaboly), e.g. butterflies, beetles, flies.', 1),
  ('b0000000-0000-4000-8000-00000000001a', 'a0000000-0000-4000-8000-000000000007',
   'In warm seasons many aphids reproduce by…',
   'Aphids commonly reproduce by parthenogenesis, giving live birth to nymphs without mating.', 2),
  ('b0000000-0000-4000-8000-00000000001b', 'a0000000-0000-4000-8000-000000000007',
   'The pupa of many moths is formed…',
   'Most moths pupate in the soil, leaf litter or within a silk cocoon.', 3),
  ('b0000000-0000-4000-8000-00000000001c', 'a0000000-0000-4000-8000-000000000007',
   'Which insect grows through incomplete metamorphosis (egg → nymph → adult)?',
   'Grasshoppers and true bugs hatch as nymphs that resemble small adults.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000061', 'b0000000-0000-4000-8000-000000000019', 'Egg → larva → pupa → adult', true, 1),
  ('c0000000-0000-4000-8000-000000000062', 'b0000000-0000-4000-8000-000000000019', 'Egg → nymph → adult', false, 2),
  ('c0000000-0000-4000-8000-000000000063', 'b0000000-0000-4000-8000-000000000019', 'Egg → pupa → larva → adult', false, 3),
  ('c0000000-0000-4000-8000-000000000064', 'b0000000-0000-4000-8000-000000000019', 'Larva → egg → adult → pupa', false, 4),
  ('c0000000-0000-4000-8000-000000000065', 'b0000000-0000-4000-8000-00000000001a', 'Parthenogenesis (live birth)', true, 1),
  ('c0000000-0000-4000-8000-000000000066', 'b0000000-0000-4000-8000-00000000001a', 'Fertilised egg-laying only', false, 2),
  ('c0000000-0000-4000-8000-000000000067', 'b0000000-0000-4000-8000-00000000001a', 'Budding', false, 3),
  ('c0000000-0000-4000-8000-000000000068', 'b0000000-0000-4000-8000-00000000001a', 'Fission', false, 4),
  ('c0000000-0000-4000-8000-000000000069', 'b0000000-0000-4000-8000-00000000001b', 'In the soil, litter or a silk cocoon', true, 1),
  ('c0000000-0000-4000-8000-00000000006a', 'b0000000-0000-4000-8000-00000000001b', 'Always in open water', false, 2),
  ('c0000000-0000-4000-8000-00000000006b', 'b0000000-0000-4000-8000-00000000001b', 'Inside other insects', false, 3),
  ('c0000000-0000-4000-8000-00000000006c', 'b0000000-0000-4000-8000-00000000001b', 'On exposed leaf upper-sides only', false, 4),
  ('c0000000-0000-4000-8000-00000000006d', 'b0000000-0000-4000-8000-00000000001c', 'Grasshopper', true, 1),
  ('c0000000-0000-4000-8000-00000000006e', 'b0000000-0000-4000-8000-00000000001c', 'Butterfly', false, 2),
  ('c0000000-0000-4000-8000-00000000006f', 'b0000000-0000-4000-8000-00000000001c', 'Beetle', false, 3),
  ('c0000000-0000-4000-8000-000000000070', 'b0000000-0000-4000-8000-00000000001c', 'Hoverfly', false, 4);

-- Quiz 8: Advanced Life Cycles (q29–q32)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-00000000001d', 'a0000000-0000-4000-8000-000000000008',
   'Cicada nymphs typically spend their development…',
   'Cicada nymphs feed on root xylem underground for years before emerging as adults.', 1),
  ('b0000000-0000-4000-8000-00000000001e', 'a0000000-0000-4000-8000-000000000008',
   'Whitefly immature stages are characterised by…',
   'First-instar crawlers settle and become flattened, scale-like sessile nymphs.', 2),
  ('b0000000-0000-4000-8000-00000000001f', 'a0000000-0000-4000-8000-000000000008',
   'Diapause is best described as…',
   'Diapause is a genetically programmed, hormone-controlled state of arrested development.', 3),
  ('b0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000008',
   'Under warm favourable conditions which pest population can grow fastest?',
   'Aphids with parthenogenetic live birth can explode in days, outpacing most other pests.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000071', 'b0000000-0000-4000-8000-00000000001d', 'Underground on roots for years', true, 1),
  ('c0000000-0000-4000-8000-000000000072', 'b0000000-0000-4000-8000-00000000001d', 'In flowing water', false, 2),
  ('c0000000-0000-4000-8000-000000000073', 'b0000000-0000-4000-8000-00000000001d', 'In ant nests', false, 3),
  ('c0000000-0000-4000-8000-000000000074', 'b0000000-0000-4000-8000-00000000001d', 'Inside fruit', false, 4),
  ('c0000000-0000-4000-8000-000000000075', 'b0000000-0000-4000-8000-00000000001e', 'Sessile scale-like nymphs under leaves', true, 1),
  ('c0000000-0000-4000-8000-000000000076', 'b0000000-0000-4000-8000-00000000001e', 'Free-moving aquatic larvae', false, 2),
  ('c0000000-0000-4000-8000-000000000077', 'b0000000-0000-4000-8000-00000000001e', 'Cocooned pupae on stems', false, 3),
  ('c0000000-0000-4000-8000-000000000078', 'b0000000-0000-4000-8000-00000000001e', 'Gall-forming larvae', false, 4),
  ('c0000000-0000-4000-8000-000000000079', 'b0000000-0000-4000-8000-00000000001f', 'A programmed arrest of development to survive adverse seasons', true, 1),
  ('c0000000-0000-4000-8000-00000000007a', 'b0000000-0000-4000-8000-00000000001f', 'Accidental death in cold weather', false, 2),
  ('c0000000-0000-4000-8000-00000000007b', 'b0000000-0000-4000-8000-00000000001f', 'Rapid summer reproduction', false, 3),
  ('c0000000-0000-4000-8000-00000000007c', 'b0000000-0000-4000-8000-00000000001f', 'Migration to higher altitude', false, 4),
  ('c0000000-0000-4000-8000-00000000007d', 'b0000000-0000-4000-8000-000000000020', 'Aphid', true, 1),
  ('c0000000-0000-4000-8000-00000000007e', 'b0000000-0000-4000-8000-000000000020', 'Cicada', false, 2),
  ('c0000000-0000-4000-8000-00000000007f', 'b0000000-0000-4000-8000-000000000020', 'Termite colony', false, 3),
  ('c0000000-0000-4000-8000-000000000080', 'b0000000-0000-4000-8000-000000000020', 'Dragonfly', false, 4);

-- Quiz 9: Crop Pests (q33–q36)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000009',
   'In Pakistan the most damaging cotton bollworm complex includes…',
   'Helicoverpa armigera and pink bollworm together make up the main bollworm complex.', 1),
  ('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000009',
   'Sugarcane top borer mainly attacks the…',
   'Top borer larvae bore into the central shoot, causing deadheart.', 2),
  ('b0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000009',
   'Rice leaf folder feeding causes…',
   'Larvae fold leaves and scrape the green tissue, leaving white / scorched streaks.', 3),
  ('b0000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000009',
   'Curled, silvery, distorted chili leaves with visible tiny insects indicate…',
   'Chili thrips produce silvering and leaf curl; insects can be shaken onto paper.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000081', 'b0000000-0000-4000-8000-000000000021', 'American bollworm + pink bollworm', true, 1),
  ('c0000000-0000-4000-8000-000000000082', 'b0000000-0000-4000-8000-000000000021', 'Fall armyworm only', false, 2),
  ('c0000000-0000-4000-8000-000000000083', 'b0000000-0000-4000-8000-000000000021', 'Boll weevil only', false, 3),
  ('c0000000-0000-4000-8000-000000000084', 'b0000000-0000-4000-8000-000000000021', 'Cutworm only', false, 4),
  ('c0000000-0000-4000-8000-000000000085', 'b0000000-0000-4000-8000-000000000022', 'Central growing shoot (deadheart)', true, 1),
  ('c0000000-0000-4000-8000-000000000086', 'b0000000-0000-4000-8000-000000000022', 'Mature cane internodes only', false, 2),
  ('c0000000-0000-4000-8000-000000000087', 'b0000000-0000-4000-8000-000000000022', 'Leaf blades', false, 3),
  ('c0000000-0000-4000-8000-000000000088', 'b0000000-0000-4000-8000-000000000022', 'Root system', false, 4),
  ('c0000000-0000-4000-8000-000000000089', 'b0000000-0000-4000-8000-000000000023', 'White or scorched streaks along the leaf', true, 1),
  ('c0000000-0000-4000-8000-00000000008a', 'b0000000-0000-4000-8000-000000000023', 'Holes in the panicle', false, 2),
  ('c0000000-0000-4000-8000-00000000008b', 'b0000000-0000-4000-8000-000000000023', 'Root galls', false, 3),
  ('c0000000-0000-4000-8000-00000000008c', 'b0000000-0000-4000-8000-000000000023', 'Sticky honeydew on panicles', false, 4),
  ('c0000000-0000-4000-8000-00000000008d', 'b0000000-0000-4000-8000-000000000024', 'Thrips', true, 1),
  ('c0000000-0000-4000-8000-00000000008e', 'b0000000-0000-4000-8000-000000000024', 'Aphids', false, 2),
  ('c0000000-0000-4000-8000-00000000008f', 'b0000000-0000-4000-8000-000000000024', 'Whiteflies', false, 3),
  ('c0000000-0000-4000-8000-000000000090', 'b0000000-0000-4000-8000-000000000024', 'Scale insects', false, 4);

-- Quiz 10: IPM Fundamentals (q37–q40)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-00000000000a',
   'IPM stands for…',
   'Integrated Pest Management combines cultural, biological, mechanical and chemical tools.', 1),
  ('b0000000-0000-4000-8000-000000000026', 'a0000000-0000-4000-8000-00000000000a',
   'The first step of any IPM programme is…',
   'Correct pest identification and monitoring guide every later decision.', 2),
  ('b0000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-00000000000a',
   'The Economic Injury Level (EIL) is the pest density at which…',
   'EIL is where the cost of control equals the value of damage the pest would cause.', 3),
  ('b0000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-00000000000a',
   'Which is an example of cultural control?',
   'Crop rotation, timely sowing and residue destruction reduce pest carryover without sprays.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000091', 'b0000000-0000-4000-8000-000000000025', 'Integrated Pest Management', true, 1),
  ('c0000000-0000-4000-8000-000000000092', 'b0000000-0000-4000-8000-000000000025', 'Integrated Pesticide Management', false, 2),
  ('c0000000-0000-4000-8000-000000000093', 'b0000000-0000-4000-8000-000000000025', 'Intensive Pest Monitoring', false, 3),
  ('c0000000-0000-4000-8000-000000000094', 'b0000000-0000-4000-8000-000000000025', 'International Pest Measure', false, 4),
  ('c0000000-0000-4000-8000-000000000095', 'b0000000-0000-4000-8000-000000000026', 'Identifying the pest and monitoring it', true, 1),
  ('c0000000-0000-4000-8000-000000000096', 'b0000000-0000-4000-8000-000000000026', 'Spraying a broad-spectrum insecticide', false, 2),
  ('c0000000-0000-4000-8000-000000000097', 'b0000000-0000-4000-8000-000000000026', 'Clearing all weeds', false, 3),
  ('c0000000-0000-4000-8000-000000000098', 'b0000000-0000-4000-8000-000000000026', 'Applying fertilizer', false, 4),
  ('c0000000-0000-4000-8000-000000000099', 'b0000000-0000-4000-8000-000000000027', 'Control cost equals the value of crop loss prevented', true, 1),
  ('c0000000-0000-4000-8000-00000000009a', 'b0000000-0000-4000-8000-000000000027', 'The pest first appears in the field', false, 2),
  ('c0000000-0000-4000-8000-00000000009b', 'b0000000-0000-4000-8000-000000000027', 'Crop is completely defoliated', false, 3),
  ('c0000000-0000-4000-8000-00000000009c', 'b0000000-0000-4000-8000-000000000027', 'Natural enemies disappear', false, 4),
  ('c0000000-0000-4000-8000-00000000009d', 'b0000000-0000-4000-8000-000000000028', 'Crop rotation and residue destruction', true, 1),
  ('c0000000-0000-4000-8000-00000000009e', 'b0000000-0000-4000-8000-000000000028', 'Releasing ladybirds', false, 2),
  ('c0000000-0000-4000-8000-00000000009f', 'b0000000-0000-4000-8000-000000000028', 'Pheromone trapping', false, 3),
  ('c0000000-0000-4000-8000-0000000000a0', 'b0000000-0000-4000-8000-000000000028', 'Systemic seed treatment', false, 4);

-- Quiz 11: IPM Strategy (q41–q44)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000029', 'a0000000-0000-4000-8000-00000000000b',
   'The Economic Threshold Level (ETL) is reached when action should be taken…',
   'ETL is the density at which control should be initiated so the pest never reaches the EIL.', 1),
  ('b0000000-0000-4000-8000-00000000002a', 'a0000000-0000-4000-8000-00000000000b',
   'Conservation biological control primarily means…',
   'Protecting and enhancing existing natural enemies through habitat and reduced sprays.', 2),
  ('b0000000-0000-4000-8000-00000000002b', 'a0000000-0000-4000-8000-00000000000b',
   'Which of these is a bio-pesticide?',
   'Bacillus thuringiensis (Bt) is a microbial insecticide widely used in IPM.', 3),
  ('b0000000-0000-4000-8000-00000000002c', 'a0000000-0000-4000-8000-00000000000b',
   'During peak pest season, fields should typically be scouted…',
   'Regular weekly (or twice-weekly in hot weather) scouting is standard during peak season.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-0000000000a1', 'b0000000-0000-4000-8000-000000000029', 'You should apply control to prevent reaching the EIL', true, 1),
  ('c0000000-0000-4000-8000-0000000000a2', 'b0000000-0000-4000-8000-000000000029', 'You should harvest immediately', false, 2),
  ('c0000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-000000000029', 'You should stop monitoring', false, 3),
  ('c0000000-0000-4000-8000-0000000000a4', 'b0000000-0000-4000-8000-000000000029', 'Crop is already lost', false, 4),
  ('c0000000-0000-4000-8000-0000000000a5', 'b0000000-0000-4000-8000-00000000002a', 'Protecting and promoting existing natural enemies', true, 1),
  ('c0000000-0000-4000-8000-0000000000a6', 'b0000000-0000-4000-8000-00000000002a', 'Importing exotic predators every season', false, 2),
  ('c0000000-0000-4000-8000-0000000000a7', 'b0000000-0000-4000-8000-00000000002a', 'Spraying preservative chemicals', false, 3),
  ('c0000000-0000-4000-8000-0000000000a8', 'b0000000-0000-4000-8000-00000000002a', 'Eliminating all insects except pests', false, 4),
  ('c0000000-0000-4000-8000-0000000000a9', 'b0000000-0000-4000-8000-00000000002b', 'Bacillus thuringiensis (Bt)', true, 1),
  ('c0000000-0000-4000-8000-0000000000aa', 'b0000000-0000-4000-8000-00000000002b', 'Chlorpyrifos', false, 2),
  ('c0000000-0000-4000-8000-0000000000ab', 'b0000000-0000-4000-8000-00000000002b', 'Gramoxone (paraquat)', false, 3),
  ('c0000000-0000-4000-8000-0000000000ac', 'b0000000-0000-4000-8000-00000000002b', 'Glyphosate', false, 4),
  ('c0000000-0000-4000-8000-0000000000ad', 'b0000000-0000-4000-8000-00000000002c', 'Weekly (or more often in hot weather)', true, 1),
  ('c0000000-0000-4000-8000-0000000000ae', 'b0000000-0000-4000-8000-00000000002c', 'Only at harvest', false, 2),
  ('c0000000-0000-4000-8000-0000000000af', 'b0000000-0000-4000-8000-00000000002c', 'Once a month', false, 3),
  ('c0000000-0000-4000-8000-0000000000b0', 'b0000000-0000-4000-8000-00000000002c', 'Never once pest is seen once', false, 4);

-- Quiz 12: Cotton IPM Challenge (q45–q48)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-00000000002d', 'a0000000-0000-4000-8000-00000000000c',
   'The early-season cotton sucking-pest complex includes…',
   'Jassid, whitefly, aphid and thrips make up the early sucking-pest complex.', 1),
  ('b0000000-0000-4000-8000-00000000002e', 'a0000000-0000-4000-8000-00000000000c',
   'High whitefly pressure in cotton is especially dangerous because of its role in transmitting…',
   'Whiteflies vector Cotton Leaf Curl Virus (CLCuV), a major yield constraint.', 2),
  ('b0000000-0000-4000-8000-00000000002f', 'a0000000-0000-4000-8000-00000000000c',
   'Which predator is a key whitefly regulator in cotton fields?',
   'Green lacewing larvae and adults are important predators of whitefly and thrips.', 3),
  ('b0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-00000000000c',
   'A non-chemical pillar of pink-bollworm management in cotton is…',
   'Pheromone-based mating disruption and timely sowing/harvest reduce bollworm carryover.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-00000000002d', 'Jassid, whitefly, aphid and thrips', true, 1),
  ('c0000000-0000-4000-8000-0000000000b2', 'b0000000-0000-4000-8000-00000000002d', 'Bollworm, cutworm, armyworm', false, 2),
  ('c0000000-0000-4000-8000-0000000000b3', 'b0000000-0000-4000-8000-00000000002d', 'Ladybirds, lacewings, hoverflies', false, 3),
  ('c0000000-0000-4000-8000-0000000000b4', 'b0000000-0000-4000-8000-00000000002d', 'Grasshoppers, crickets, locusts', false, 4),
  ('c0000000-0000-4000-8000-0000000000b5', 'b0000000-0000-4000-8000-00000000002e', 'Cotton Leaf Curl Virus', true, 1),
  ('c0000000-0000-4000-8000-0000000000b6', 'b0000000-0000-4000-8000-00000000002e', 'Papaya ringspot virus', false, 2),
  ('c0000000-0000-4000-8000-0000000000b7', 'b0000000-0000-4000-8000-00000000002e', 'Tomato yellow leaf curl only', false, 3),
  ('c0000000-0000-4000-8000-0000000000b8', 'b0000000-0000-4000-8000-00000000002e', 'Rice grassy stunt virus', false, 4),
  ('c0000000-0000-4000-8000-0000000000b9', 'b0000000-0000-4000-8000-00000000002f', 'Green lacewing (Chrysoperla)', true, 1),
  ('c0000000-0000-4000-8000-0000000000ba', 'b0000000-0000-4000-8000-00000000002f', 'Praying mantis', false, 2),
  ('c0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-00000000002f', 'Dragonfly', false, 3),
  ('c0000000-0000-4000-8000-0000000000bc', 'b0000000-0000-4000-8000-00000000002f', 'House cricket', false, 4),
  ('c0000000-0000-4000-8000-0000000000bd', 'b0000000-0000-4000-8000-000000000030', 'Pheromone mating disruption with timely crop management', true, 1),
  ('c0000000-0000-4000-8000-0000000000be', 'b0000000-0000-4000-8000-000000000030', 'Broad-spectrum fortnightly sprays', false, 2),
  ('c0000000-0000-4000-8000-0000000000bf', 'b0000000-0000-4000-8000-000000000030', 'Leaving bolls on the plant over winter', false, 3),
  ('c0000000-0000-4000-8000-0000000000c0', 'b0000000-0000-4000-8000-000000000030', 'Fertilising more heavily at boll stage', false, 4);

-- -------------------------------------------------------------
-- Migration: 00010_admin_moderation.sql
-- -------------------------------------------------------------
-- 00010_admin_moderation.sql
-- Adds observation moderation support for admins.

alter table public.observations
  add column if not exists moderation_status text not null default 'pending'
  check (moderation_status in ('pending', 'approved', 'rejected'));

create index if not exists observations_moderation_idx
  on public.observations (moderation_status);

-- Allow admins to moderate (approve/reject/update) any observation.
create policy "observations_admin_update" on public.observations
  for update to authenticated using (public.is_admin());

NOTIFY pgrst, 'reload schema';
