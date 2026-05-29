-- Run this in your Supabase SQL Editor (after schema.sql)

-- Helper to generate short invite codes
create or replace function generate_invite_code()
returns text language sql as $$
  select upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

-- Families
create table if not exists families (
  id uuid default gen_random_uuid() primary key,
  invite_code text unique not null default generate_invite_code(),
  created_at timestamptz not null default now()
);

-- Family members (links auth.users to a family with a display name)
create table if not exists family_members (
  id uuid default gen_random_uuid() primary key,
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

-- Add family_id to medications
alter table medications add column if not exists family_id uuid references families(id) on delete cascade;

-- Drop old open RLS policies
drop policy if exists "allow_all_medications" on medications;
drop policy if exists "allow_all_dose_logs" on dose_logs;

-- Medications: scoped to the user's family
create policy "medications_family" on medications
  for all using (
    family_id in (select family_id from family_members where user_id = auth.uid())
  ) with check (
    family_id in (select family_id from family_members where user_id = auth.uid())
  );

-- Dose logs: scoped via medication → family
create policy "dose_logs_family" on dose_logs
  for all using (
    medication_id in (
      select id from medications
      where family_id in (
        select family_id from family_members where user_id = auth.uid()
      )
    )
  ) with check (
    medication_id in (
      select id from medications
      where family_id in (
        select family_id from family_members where user_id = auth.uid()
      )
    )
  );

-- Families: visible only to members
alter table families enable row level security;
create policy "families_select" on families
  for select using (
    id in (select family_id from family_members where user_id = auth.uid())
  );

-- Family members: visible to members of the same family
alter table family_members enable row level security;
create policy "family_members_select" on family_members
  for select using (
    family_id in (select family_id from family_members where user_id = auth.uid())
  );

-- Realtime for new tables
alter publication supabase_realtime add table families;
alter publication supabase_realtime add table family_members;

-- Function: create a new family and add the caller as a member
create or replace function create_family(p_display_name text)
returns uuid language plpgsql security definer as $$
declare
  v_family_id uuid;
begin
  insert into families default values returning id into v_family_id;
  insert into family_members (family_id, user_id, display_name)
  values (v_family_id, auth.uid(), p_display_name);
  return v_family_id;
end;
$$;

-- Function: join an existing family by invite code
create or replace function join_family(p_invite_code text, p_display_name text)
returns uuid language plpgsql security definer as $$
declare
  v_family_id uuid;
begin
  select id into v_family_id from families where invite_code = upper(p_invite_code);
  if v_family_id is null then
    raise exception 'Invalid invite code';
  end if;
  insert into family_members (family_id, user_id, display_name)
  values (v_family_id, auth.uid(), p_display_name)
  on conflict (family_id, user_id) do nothing;
  return v_family_id;
end;
$$;
