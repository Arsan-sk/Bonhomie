-- FUNCTION: get_my_chats_summary
-- Drop first to be sure
drop function if exists public.get_my_chats_summary();

create or replace function public.get_my_chats_summary()
returns table (
  chat_id uuid,
  event_id uuid,
  event_name text,
  event_category text,
  unread_count bigint,
  last_message_content text,
  last_message_time timestamp with time zone
) language plpgsql security definer as $$
begin
  return query
  with user_chats as (
    select cm.chat_id, coalesce(cm.last_read_at, '1970-01-01'::timestamp) as last_read
    from public.chat_members cm
    where cm.user_id = auth.uid()
  ),
  chat_stats as (
    select 
      m.chat_id,
      count(*) as unread
    from public.chat_messages m
    join user_chats uc on m.chat_id = uc.chat_id
    where m.created_at > uc.last_read
    group by m.chat_id
  ),
  last_msgs as (
    select distinct on (m.chat_id) 
      m.chat_id, 
      m.content, 
      m.created_at
    from public.chat_messages m
    join user_chats uc on m.chat_id = uc.chat_id
    order by m.chat_id, m.created_at desc
  )
  select 
    cr.id as chat_id,
    e.id as event_id,
    e.name as event_name,
    e.category as event_category,
    coalesce(cs.unread, 0) as unread_count,
    coalesce(lm.content, '') as last_message_content,
    lm.created_at as last_message_time
  from public.chat_rooms cr
  join public.events e on cr.event_id = e.id
  join user_chats uc on cr.id = uc.chat_id
  left join chat_stats cs on cr.id = cs.chat_id
  left join last_msgs lm on cr.id = lm.chat_id
  order by lm.created_at desc nulls last;
end;
$$;

-- FUNCTION: Mark Read
create or replace function public.mark_chat_read(p_chat_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.chat_members
  set last_read_at = now()
  where chat_id = p_chat_id
  and user_id = auth.uid();
end;
$$;

-- REALTIME FIX: Simplify RLS so Insert/Select is fast and visible
-- Allow any member to see messages (simple check)
drop policy if exists "View chat messages" on public.chat_messages;
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

-- Ensure Realtime is enabled
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_rooms;
