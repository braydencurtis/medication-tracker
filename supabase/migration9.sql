-- Migration 9: User profile avatars

-- Add avatar_path to family_members
alter table public.family_members
  add column if not exists avatar_path text;

-- Allow users to update their own family_members row
-- (needed for avatar upload and future profile edits)
drop policy if exists "Members can update own row" on public.family_members;
create policy "Members can update own row"
  on public.family_members
  for update
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Storage bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own avatar"   on storage.objects;
drop policy if exists "Anyone can view avatars"        on storage.objects;
drop policy if exists "Users can update own avatar"   on storage.objects;
drop policy if exists "Users can delete own avatar"   on storage.objects;

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');
