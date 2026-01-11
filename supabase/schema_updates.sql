-- Add image_url to events if it doesn't exist
alter table public.events add column if not exists image_url text;

-- Certificates Table
create table if not exists public.certificates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  event_id uuid references public.events(id) not null,
  issue_date timestamp with time zone default timezone('utc'::text, now()) not null,
  unique_hash text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Rounds Table
create table if not exists public.rounds (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) not null,
  round_name text not null,
  status text default 'pending', -- pending, active, completed
  qualifiers_list jsonb default '[]'::jsonb, -- Array of profile_ids or team_ids
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Results Table
create table if not exists public.results (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) not null,
  winner_id uuid, -- Can reference profile or team, storing as UUID for now
  runner_up_id uuid,
  position text, -- '1st', '2nd', '3rd'
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications Table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  message text not null,
  type text default 'info', -- info, success, warning, error
  read_status boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies

-- Certificates
alter table public.certificates enable row level security;

create policy "Certificates are viewable by everyone"
  on public.certificates for select
  using ( true );

create policy "Admins can insert certificates"
  on public.certificates for insert
  with check ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- Rounds
alter table public.rounds enable row level security;

create policy "Rounds viewable by everyone"
  on public.rounds for select
  using ( true );

create policy "Faculty and Admin can manage rounds"
  on public.rounds for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'faculty')) );

-- Results
alter table public.results enable row level security;

create policy "Results viewable by everyone"
  on public.results for select
  using ( true );

create policy "Faculty and Admin can manage results"
  on public.results for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'faculty')) );

-- Notifications
alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using ( auth.uid() = user_id );

-- Only system/admin typically inserts, but for now allow Admin/Faculty to insert notifications for users
create policy "Admins and Faculty can send notifications"
  on public.notifications for insert
  with check ( exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'faculty')) );
