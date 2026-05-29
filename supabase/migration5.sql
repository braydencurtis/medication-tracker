-- Migration 5: Allow owner to regenerate their family's invite code

create or replace function public.refresh_invite_code()
returns text
language plpgsql
security definer
as $$
declare
  v_family_id uuid;
  v_new_code  text;
begin
  -- Resolve caller's approved family
  select family_id into v_family_id
  from public.family_members
  where user_id = auth.uid() and status = 'approved'
  limit 1;

  if v_family_id is null then
    raise exception 'Not a member of any family';
  end if;

  -- Only the owner may rotate the code
  if not exists (
    select 1 from public.families
    where id = v_family_id and owner_id = auth.uid()
  ) then
    raise exception 'Only the family owner can refresh the invite code';
  end if;

  -- Generate a unique 6-character code (reuse the existing helper)
  loop
    v_new_code := generate_invite_code();
    exit when not exists (
      select 1 from public.families where invite_code = v_new_code
    );
  end loop;

  update public.families
  set invite_code = v_new_code
  where id = v_family_id;

  return v_new_code;
end;
$$;
