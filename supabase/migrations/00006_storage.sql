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