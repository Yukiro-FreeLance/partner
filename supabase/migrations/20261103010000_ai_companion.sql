create table public.ai_conversations (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  couple_id text references public.couples(id) on delete set null,
  title text not null default 'New conversation',
  opencode_session_id text,
  created_at text not null,
  updated_at text not null
);
create index ai_conversations_user_updated on public.ai_conversations(user_id, updated_at desc);

create table public.ai_messages (
  id text primary key,
  conversation_id text not null references public.ai_conversations(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb,
  created_at text not null
);
create index ai_messages_conversation_created on public.ai_messages(conversation_id, created_at);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
grant select, insert, update, delete on public.ai_conversations, public.ai_messages to authenticated;
create policy "ai owners manage conversations" on public.ai_conversations for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "ai owners manage messages" on public.ai_messages for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
