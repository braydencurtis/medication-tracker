-- Migration 7: Allow family members to read each other's push tokens
-- (required so the giving device can look up the other person's token and send a push)

drop policy if exists "Family members can read push tokens" on public.push_tokens;
create policy "Family members can read push tokens"
  on public.push_tokens
  for select
  using (
    user_id in (
      select user_id from public.family_members
      where family_id = get_my_family_id() and status = 'approved'
    )
  );
