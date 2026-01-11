
-- Admin Module Schema Updates

-- 1. Events Table Updates
-- prp: events(id, title, type, mode, price, upi_id, day, venue, rounds, status)
-- existing: id, name, description, category, subcategory, day, start_time, end_time, venue, fee, day_order, faculty_coordinators, image_url
-- Mapping: title->name, price->fee, type->category/subcategory.
-- Missing: mode, upi_id, rules, banner (use image_url?), status, min_team_size, max_team_size.

alter table public.events add column if not exists mode text default 'Offline'; -- Offline/Online
alter table public.events add column if not exists upi_id text;
alter table public.events add column if not exists rules text; -- Markdown or plain text
alter table public.events add column if not exists status text default 'open'; -- open, closed, completed
alter table public.events add column if not exists min_team_size int default 1;
alter table public.events add column if not exists max_team_size int default 1;

-- 2. Event Assignments Table (Many-to-Many for Coordinators)
-- Replaces JSONB faculty_coordinators for better relational management
create table if not exists public.event_assignments (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  coordinator_id uuid references public.profiles(id) on delete cascade not null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, coordinator_id)
);

alter table public.event_assignments enable row level security;

create policy "Admins can manage assignments"
  on public.event_assignments for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

create policy "Coordinators can view own assignments"
  on public.event_assignments for select
  using ( coordinator_id = auth.uid() );

-- 3. Payments Table
-- payments(id, user_id, event_id, amount, status, txn_note)
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  event_id uuid references public.events(id), -- Optional if payment is general? Usually linked to event.
  amount numeric not null,
  status text default 'pending', -- pending, confirmed, failed, refunded
  txn_id text, -- Transaction ID from UPI/Gateway
  txn_note text,
  screenshot_url text, -- For manual verification
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using ( auth.uid() = user_id );

create policy "Users can create payments"
  on public.payments for insert
  with check ( auth.uid() = user_id );

create policy "Admins can view and manage all payments"
  on public.payments for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- 4. Settings Table (Global Config)
create table if not exists public.settings (
  key text primary key,
  value jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.settings enable row level security;

create policy "Everyone can view settings"
  on public.settings for select
  using ( true );

create policy "Admins can manage settings"
  on public.settings for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- Initial Settings Seed
insert into public.settings (key, value)
values 
  ('fest_config', '{"name": "Bonhomie 2026", "dates": "Feb 10-15", "registration_enabled": true}'::jsonb)
on conflict (key) do nothing;
