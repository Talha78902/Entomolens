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
  user_id       uuid not null references public.profiles (id) on delete cascade,
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
  user_id       uuid not null references public.profiles (id) on delete cascade,
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