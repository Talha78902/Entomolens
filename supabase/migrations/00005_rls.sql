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