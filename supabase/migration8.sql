-- Migration 8: Allow users to update their own display name

create or replace function public.update_display_name(p_display_name text)
returns void
language plpgsql
security definer
as $$
begin
  update public.family_members
  set display_name = trim(p_display_name)
  where user_id = auth.uid()
    and status = 'approved';
end;
$$;
