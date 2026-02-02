-- Function to mark a chat as read
create or replace function public.mark_chat_read(p_chat_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.chat_members
  set last_read_at = now()
  where chat_id = p_chat_id
  and user_id = auth.uid();
end;
$$;
