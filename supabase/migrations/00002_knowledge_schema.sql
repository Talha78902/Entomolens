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