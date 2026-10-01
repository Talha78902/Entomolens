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