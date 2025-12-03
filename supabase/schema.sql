-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Enum Types
create type user_role as enum ('user', 'faculty', 'admin');
create type event_category as enum ('Cultural', 'Technical', 'Sports');
create type event_subcategory as enum ('Individual', 'Group');
create type registration_status as enum ('pending', 'confirmed', 'rejected');

-- Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  college_email text,
  roll_number text,
  school text,
  department text,
  program text,
  year_of_study text,
  admission_year text,
  expected_passout_year text,
  phone text,
  gender text,
  role user_role default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Events Table
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category event_category not null,
  subcategory event_subcategory not null,
  day text not null, -- 'Day 1', 'Day 2', etc.
  day_order integer not null, -- 1, 2, 3...
  event_date date,
  start_time time,
  end_time time,
  venue text,
  venue_details text,
  faculty_coordinators jsonb default '[]'::jsonb, -- Array of objects
  student_coordinators jsonb default '[]'::jsonb, -- Array of objects
  rules jsonb default '[]'::jsonb, -- Array of strings or objects
  description text,
  image_path text,
  fee numeric default 0,
  min_team_size integer default 1,
  max_team_size integer default 1,
  allowed_genders text[], -- ['Male', 'Female'] or null for all
  allowed_schools text[],
  allowed_departments text[],
  prize jsonb, -- { "first": "1000", "second": "500" }
  winner_profile_id uuid references public.profiles(id),
  runnerup_profile_id uuid references public.profiles(id),
  registration_deadline timestamp with time zone,
  capacity integer,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Registrations Table
create table public.registrations (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) not null,
  event_id uuid references public.events(id) not null,
  team_members jsonb default '[]'::jsonb, -- Array of member details
  transaction_id text,
  payment_screenshot_path text,
  status registration_status default 'pending',
  registered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(profile_id, event_id)
);

-- Audit Logs Table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies

-- Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Events
alter table public.events enable row level security;

create policy "Events are viewable by everyone"
  on public.events for select
  using ( true );

create policy "Admins can insert events"
  on public.events for insert
  with check ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

create policy "Admins can update events"
  on public.events for update
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

create policy "Faculty can update assigned events"
  on public.events for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'faculty')
    AND
    (
      -- Check if faculty ID is in the faculty_coordinators jsonb array
      -- Assuming faculty_coordinators is array of objects like [{"id": "uuid", ...}]
      -- This is complex in SQL with JSONB, simplified check:
      auth.uid()::text = ANY (
        select jsonb_array_elements(faculty_coordinators)->>'id'
      )
    )
  );

-- Registrations
alter table public.registrations enable row level security;

create policy "Users can view own registrations"
  on public.registrations for select
  using ( auth.uid() = profile_id );

create policy "Admins and Faculty can view all registrations"
  on public.registrations for select
  using ( exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'faculty')) );

create policy "Users can insert own registration"
  on public.registrations for insert
  with check ( auth.uid() = profile_id );

create policy "Admins can update registrations"
  on public.registrations for update
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- Storage Policies (Conceptual - apply in Supabase Dashboard)
-- Bucket: 'payment_proofs' (private)
-- Policy: Insert by auth users. Select by owner, admin, faculty.

-- Bucket: 'event_images' (public)
-- Policy: Select public. Insert/Update by admin/faculty.

-- Trigger to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, college_email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
