-- Run this in your Supabase SQL editor at supabase.com/dashboard

-- Medications
create table if not exists medications (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  pet_name text not null default '',
  dosage text,
  frequency int not null default 1 check (frequency between 1 and 4),
  reminder_times text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Dose logs (one row per medication × dose number × date)
create table if not exists dose_logs (
  id uuid default gen_random_uuid() primary key,
  medication_id uuid not null references medications(id) on delete cascade,
  dose_number int not null default 1,
  dose_date date not null default current_date,
  given_at timestamptz,
  given_by text,
  created_at timestamptz not null default now(),
  constraint dose_logs_unique_dose unique (medication_id, dose_number, dose_date)
);

-- Open RLS policies (personal app — no multi-tenant data)
alter table medications enable row level security;
alter table dose_logs enable row level security;

create policy "allow_all_medications" on medications for all using (true) with check (true);
create policy "allow_all_dose_logs" on dose_logs for all using (true) with check (true);

-- Enable realtime so both phones update instantly
alter publication supabase_realtime add table medications;
alter publication supabase_realtime add table dose_logs;

-- Insert Penny's Senvelgo as the first medication
insert into medications (name, pet_name, dosage, frequency, reminder_times)
values ('Senvelgo', 'Penny', '2.5ml', 1, array['08:00']);
