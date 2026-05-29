-- ============================================================
-- Migration 3: Pets as first-class objects
-- ============================================================

-- Pets table
create table if not exists public.pets (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references public.families(id) on delete cascade,
  name                text not null,
  species             text,
  breed               text,
  profile_photo_path  text,
  created_at          timestamptz default now()
);

-- Pet photos table (scalable for future pre/post-medication photo types)
create table if not exists public.pet_photos (
  id            uuid primary key default gen_random_uuid(),
  pet_id        uuid not null references public.pets(id) on delete cascade,
  storage_path  text not null,
  photo_type    text not null default 'other',
    -- allowed values: 'profile', 'pre_medication', 'post_medication', 'other'
  display_order integer not null default 0,
  caption       text,
  created_at    timestamptz default now()
);

-- Add pet_id FK to medications (nullable so existing rows keep working)
alter table public.medications
  add column if not exists pet_id uuid references public.pets(id) on delete set null;

-- Make pet_name nullable (new medications will use pet_id; old rows keep their value)
alter table public.medications
  alter column pet_name drop not null;

-- ── RLS: pets ────────────────────────────────────────────────
alter table public.pets enable row level security;

drop policy if exists "Family members can manage their pets" on public.pets;
create policy "Family members can manage their pets"
  on public.pets
  for all
  using  (family_id = get_my_family_id())
  with check (family_id = get_my_family_id());

-- ── RLS: pet_photos ──────────────────────────────────────────
alter table public.pet_photos enable row level security;

drop policy if exists "Family members can manage pet photos" on public.pet_photos;
create policy "Family members can manage pet photos"
  on public.pet_photos
  for all
  using (
    pet_id in (
      select id from public.pets where family_id = get_my_family_id()
    )
  )
  with check (
    pet_id in (
      select id from public.pets where family_id = get_my_family_id()
    )
  );

-- ── Grants ────────────────────────────────────────────────────
grant all on public.pets       to anon, authenticated;
grant all on public.pet_photos to anon, authenticated;

-- ── Realtime ──────────────────────────────────────────────────
alter publication supabase_realtime add table public.pets;

-- ── Storage bucket for pet photos ────────────────────────────
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

-- Storage RLS policies
drop policy if exists "Family members can upload pet photos"   on storage.objects;
drop policy if exists "Anyone can view pet photos"             on storage.objects;
drop policy if exists "Family members can update pet photos"   on storage.objects;
drop policy if exists "Family members can delete pet photos"   on storage.objects;

create policy "Family members can upload pet photos"
  on storage.objects for insert
  with check (
    bucket_id = 'pet-photos'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can view pet photos"
  on storage.objects for select
  using (bucket_id = 'pet-photos');

create policy "Family members can update pet photos"
  on storage.objects for update
  using (
    bucket_id = 'pet-photos'
    and auth.role() = 'authenticated'
  );

create policy "Family members can delete pet photos"
  on storage.objects for delete
  using (
    bucket_id = 'pet-photos'
    and auth.role() = 'authenticated'
  );
