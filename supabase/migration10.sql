-- Migration 10: Transfer family ownership to another approved member

create or replace function public.transfer_ownership(p_new_owner_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_family_id uuid;
begin
  -- Caller must be the current owner
  select id into v_family_id
  from public.families
  where owner_id = auth.uid();

  if v_family_id is null then
    raise exception 'You are not the owner of any family';
  end if;

  -- New owner must be an approved member of the same family
  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id
      and user_id   = p_new_owner_user_id
      and status    = 'approved'
  ) then
    raise exception 'The new owner must be an approved family member';
  end if;

  update public.families
  set owner_id = p_new_owner_user_id
  where id = v_family_id;
end;
$$;
