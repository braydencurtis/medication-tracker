-- Migration 11: Days of the week for medications
-- Default to every day so existing medications are unaffected.

alter table public.medications
  add column if not exists days_of_week integer[]
    not null default '{0,1,2,3,4,5,6}';
