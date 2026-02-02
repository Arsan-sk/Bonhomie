-- Function to get chat summary for the current user
-- Returns: chat_id, event details, unread count, last message snippet
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
    select cm.chat_id, cm.last_read_at
    from public.chat_members cm
    where cm.user_id = auth.uid()
  ),
  chat_stats as (
    select 
      m.chat_id,
      count(*) filter (where m.created_at > coalesce(uc.last_read_at, '1970-01-01')) as unread,
      max(m.created_at) as last_msg_time
    from public.chat_messages m
    join user_chats uc on m.chat_id = uc.chat_id
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
    lm.content as last_message_content,
    lm.created_at as last_message_time
  from public.chat_rooms cr
  join public.events e on cr.event_id = e.id
  join user_chats uc on cr.id = uc.chat_id
  left join chat_stats cs on cr.id = cs.chat_id
  left join last_msgs lm on cr.id = lm.chat_id
  order by lm.created_at desc nulls last;
end;
$$;
