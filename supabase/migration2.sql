-- Run in Supabase SQL Editor after migration.sql

-- Track who created the family
alter table families add column if not exists owner_id uuid references auth.users(id);

-- Track approval status per member
alter table family_members
  add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));

-- Backfill: set owner from the earliest member of each family
update families f
set owner_id = (
  select user_id from family_members
  where family_id = f.id
  order by created_at
  limit 1
)
where owner_id is null;

-- Update create_family: record owner, mark as approved
create or replace function create_family(p_display_name text)
returns uuid language plpgsql security definer as $$
declare v_family_id uuid;
begin
  insert into families (owner_id) values (auth.uid()) returning id into v_family_id;
  insert into family_members (family_id, user_id, display_name, status)
  values (v_family_id, auth.uid(), p_display_name, 'approved');
  return v_family_id;
end;
$$;

-- Update join_family: new members start as pending
create or replace function join_family(p_invite_code text, p_display_name text)
returns uuid language plpgsql security definer as $$
declare v_family_id uuid;
begin
  select id into v_family_id from families where invite_code = upper(p_invite_code);
  if v_family_id is null then
    raise exception 'Invalid invite code';
  end if;
  insert into family_members (family_id, user_id, display_name, status)
  values (v_family_id, auth.uid(), p_display_name, 'pending')
  on conflict (family_id, user_id) do nothing;
  return v_family_id;
end;
$$;

-- get_my_family_id only works for approved members
create or replace function get_my_family_id()
returns uuid language sql security definer stable as $$
  select family_id from family_members
  where user_id = auth.uid() and status = 'approved'
  limit 1;
$$;

-- Rebuild family_members policies
drop policy if exists "family_members_select" on family_members;
drop policy if exists "family_members_family_select" on family_members;
drop policy if exists "family_members_own_select" on family_members;

-- Approved members see everyone in their family (including pending requests)
create policy "family_members_family_select" on family_members
  for select using (family_id = get_my_family_id());

-- Any user can always see their own row (so pending members can poll status)
create policy "family_members_own_select" on family_members
  for select using (user_id = auth.uid());

-- Approve a pending member (owner only)
create or replace function approve_member(p_member_id uuid)
returns void language plpgsql security definer as $$
begin
  update family_members
  set status = 'approved'
  where id = p_member_id
    and status = 'pending'
    and family_id in (select id from families where owner_id = auth.uid());
end;
$$;

-- Remove a member (owner only, can't remove self)
create or replace function reject_member(p_member_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from family_members
  where id = p_member_id
    and user_id != auth.uid()
    and family_id in (select id from families where owner_id = auth.uid());
end;
$$;

grant execute on function approve_member(uuid) to authenticated;
grant execute on function reject_member(uuid) to authenticated;
