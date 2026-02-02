-- Chat System Schema Setup

-- 1. Create Enum Types
create type chat_member_role as enum ('admin', 'member');
create type message_delivery_status as enum ('sent', 'delivered', 'read');

-- 2. Create Tables

-- Chat Rooms (One per Event)
create table if not exists public.chat_rooms (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id)
);

-- Chat Members (Participants in the chat)
create table if not exists public.chat_members (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chat_rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role chat_member_role default 'member'::chat_member_role,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_read_at timestamp with time zone default timezone('utc'::text, now()),
  unique(chat_id, user_id)
);

-- Chat Messages
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chat_rooms(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null, -- Null if user deleted, but message remains
  content text not null,
  is_system_message boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Message Status (For read receipts)
-- This table can grow large, so we only track 'delivered' and 'read'. 'sent' is default.
create table if not exists public.message_status (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.chat_messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null, -- The recipient
  status message_delivery_status default 'delivered'::message_delivery_status,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(message_id, user_id)
);


-- 3. Enable RLS

alter table public.chat_rooms enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.message_status enable row level security;


-- 4. RLS Policies

-- Chat Rooms
-- Everyone can see chat rooms (metadata), but access to messages depends on membership
create policy "Chat rooms viewable by everyone" 
  on public.chat_rooms for select 
  using (true);

-- Chat Members
-- Users can see members of chats they are part of, OR if they are admin/faculty
create policy "View chat members"
  on public.chat_members for select
  using (
    -- User is a member of this chat
    exists (
      select 1 from public.chat_members cm 
      where cm.chat_id = chat_members.chat_id and cm.user_id = auth.uid()
    )
    OR
    -- User is global Admin or Faculty (who are chat admins usually)
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'faculty')
    )
  );

-- Chat Messages
-- Visible only to members of the chat
create policy "View chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_members 
      where chat_id = chat_messages.chat_id and user_id = auth.uid()
    )
    OR
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Send chat messages"
  on public.chat_messages for insert
  with check (
    -- Must be a member
    exists (
      select 1 from public.chat_members 
      where chat_id = chat_messages.chat_id and user_id = auth.uid()
    )
    OR
    -- Or Global Admin
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Message Status
-- Users can see status of messages they sent
create policy "View message status"
  on public.message_status for select
  using (
    -- I sent the message
    exists (
      select 1 from public.chat_messages 
      where id = message_status.message_id and sender_id = auth.uid()
    )
    OR
    -- OR I am the recipient (so I can update it)
    user_id = auth.uid()
  );

create policy "Update message status"
  on public.message_status for insert
  with check ( user_id = auth.uid() );

create policy "Update own message status"
  on public.message_status for update
  using ( user_id = auth.uid() );


-- 5. Helper Functions & Triggers

-- Trigger: Auto-create Chat Room when Event is created
create or replace function public.handle_new_event_chat()
returns trigger as $$
begin
  insert into public.chat_rooms (event_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_event_created_create_chat
  after insert on public.events
  for each row execute procedure public.handle_new_event_chat();


-- Trigger: Auto-add Student to Chat when Registration is CONFIRMED
create or replace function public.handle_new_registration_chat_member()
returns trigger as $$
declare
  chat_room_id uuid;
begin
  -- Only act if status is confirmed
  if new.status = 'confirmed' and (old.status is null or old.status != 'confirmed') then
    -- Find chat room for this event
    select id into chat_room_id from public.chat_rooms where event_id = new.event_id;
    
    if chat_room_id is not null then
      -- Add user to chat members
      insert into public.chat_members (chat_id, user_id, role)
      values (chat_room_id, new.profile_id, 'member')
      on conflict (chat_id, user_id) do nothing;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_registration_confirmed_add_to_chat
  after insert or update on public.registrations
  for each row execute procedure public.handle_new_registration_chat_member();


-- Function to Sync Existing Data (For initial setup)
-- This function can be called once to populate chat rooms and members for existing events/registrations
create or replace function public.sync_chat_system()
returns void as $$
declare
  evt record;
  reg record;
  room_id uuid;
begin
  -- 1. Create rooms for all existing events
  for evt in select id from public.events loop
    insert into public.chat_rooms (event_id)
    values (evt.id)
    on conflict (event_id) do nothing;
  end loop;

  -- 2. Add confirmed participants
  for reg in select * from public.registrations where status = 'confirmed' loop
    select id into room_id from public.chat_rooms where event_id = reg.event_id;
    if room_id is not null then
      insert into public.chat_members (chat_id, user_id, role)
      values (room_id, reg.profile_id, 'member')
      on conflict (chat_id, user_id) do nothing;
    end if;
  end loop;
end;
$$ language plpgsql security definer;
