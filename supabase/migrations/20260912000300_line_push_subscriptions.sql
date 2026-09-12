-- Private persistence for LINE push reminder subscriptions.
-- Browser roles never access these tables directly; validated Edge Functions
-- use the service role to read/write.

create table if not exists public.line_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  local_visitor_id text not null check (length(btrim(local_visitor_id)) between 1 and 256),
  device_id text null check (device_id is null or length(btrim(device_id)) between 1 and 256),
  user_id uuid null references auth.users(id) on delete cascade,
  line_user_id text not null check (length(btrim(line_user_id)) between 1 and 128),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists line_push_subscriptions_visitor_active_idx
  on public.line_push_subscriptions (local_visitor_id)
  where status = 'active';

create index if not exists line_push_subscriptions_device_id_idx
  on public.line_push_subscriptions (device_id)
  where status = 'active';

create index if not exists line_push_subscriptions_line_user_idx
  on public.line_push_subscriptions (line_user_id);

alter table public.line_push_subscriptions enable row level security;
alter table public.line_push_subscriptions force row level security;

revoke all on table public.line_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.line_push_subscriptions to service_role;
