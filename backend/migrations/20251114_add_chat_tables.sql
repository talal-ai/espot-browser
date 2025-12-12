create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  assigned_admin uuid,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_conversations_status on public.chat_conversations(status);
create index if not exists idx_chat_conversations_created_at on public.chat_conversations(created_at);
create index if not exists idx_chat_conversations_assigned_admin on public.chat_conversations(assigned_admin);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid not null,
  sender_role text not null,
  ciphertext text not null,
  nonce text not null,
  content_type text not null default 'text',
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_chat_messages_conversation_created on public.chat_messages(conversation_id, created_at);
create index if not exists idx_chat_messages_sender_created on public.chat_messages(sender_id, created_at);

create table if not exists public.message_reads (
  message_id uuid not null,
  reader_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (message_id, reader_id)
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null,
  user_id uuid not null,
  role text not null,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists idx_message_reads_read_at on public.message_reads(read_at);
create index if not exists idx_conv_participants_conv_user on public.conversation_participants(conversation_id, user_id);
