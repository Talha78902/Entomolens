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