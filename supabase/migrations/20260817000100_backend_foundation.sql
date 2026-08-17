-- UVAlert backend foundation
--
-- Client-facing writes are performed by Edge Functions after contract
-- validation.  RLS remains enabled on every table so a leaked publishable key
-- cannot turn these tables into a direct data API.

create extension if not exists pgcrypto;

create table if not exists public.sync_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_kind text not null check (
    record_kind in (
      'active_session',
      'product_catalog',
      'region_preference',
      'user_preferences'
    )
  ),
  record_id text not null check (length(btrim(record_id)) between 1 and 200),
  schema_version text not null check (schema_version = 'sync-v1'),
  revision bigint not null check (revision > 0),
  payload_fingerprint text not null check (length(btrim(payload_fingerprint)) > 0),
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, record_kind, record_id)
);

create table if not exists public.sync_tombstones (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_kind text not null check (
    record_kind in (
      'active_session',
      'product_catalog',
      'region_preference',
      'user_preferences'
    )
  ),
  record_id text not null check (length(btrim(record_id)) between 1 and 200),
  schema_version text not null check (schema_version = 'sync-v1'),
  revision bigint not null check (revision > 0),
  deleted_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, record_kind, record_id)
);

-- Durable replay protection for commit/delete requests.  It is intentionally
-- separate from user data: the response is retained only long enough for a
-- safe idempotent retry and is never returned by the manifest endpoint.
create table if not exists public.sync_idempotency_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(btrim(idempotency_key)) between 1 and 160),
  operation text not null check (operation in ('commit', 'delete')),
  response jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, operation, idempotency_key)
);

create table if not exists public.uv_forecast_cache (
  region_code text primary key check (length(btrim(region_code)) between 1 and 200),
  schema_version text not null,
  source_dataset text not null,
  payload jsonb not null,
  fetched_at timestamptz not null,
  usable_until timestamptz not null,
  etag text null,
  updated_at timestamptz not null default timezone('utc', now()),
  check (usable_until > fetched_at)
);

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  feedback_type text not null check (
    feedback_type in ('bug', 'feature_request', 'content_correction')
  ),
  message text not null check (length(btrim(message)) between 1 and 4000),
  contact_email text null check (contact_email is null or length(btrim(contact_email)) between 1 and 320),
  app_version text not null check (length(btrim(app_version)) between 1 and 64),
  route text not null check (length(btrim(route)) between 1 and 256),
  user_agent_summary text null check (user_agent_summary is null or length(btrim(user_agent_summary)) <= 256),
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists sync_records_user_updated_at_idx
  on public.sync_records (user_id, updated_at desc);
create index if not exists sync_tombstones_user_deleted_at_idx
  on public.sync_tombstones (user_id, deleted_at desc);
create index if not exists sync_idempotency_receipts_created_at_idx
  on public.sync_idempotency_receipts (created_at);
create index if not exists feedback_submissions_created_status_idx
  on public.feedback_submissions (created_at desc, status);
create index if not exists uv_forecast_cache_usable_until_idx
  on public.uv_forecast_cache (usable_until);

alter table public.sync_records enable row level security;
alter table public.sync_tombstones enable row level security;
alter table public.sync_idempotency_receipts enable row level security;
alter table public.uv_forecast_cache enable row level security;
alter table public.feedback_submissions enable row level security;

-- A permanent Auth user may access only its own sync rows.  Supabase's
-- anonymous JWT sets is_anonymous=true; those tokens are explicitly rejected.
create policy sync_records_select_own on public.sync_records
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_records_insert_own on public.sync_records
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_records_update_own on public.sync_records
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  )
  with check (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_records_delete_own on public.sync_records
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

create policy sync_tombstones_select_own on public.sync_tombstones
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_tombstones_insert_own on public.sync_tombstones
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_tombstones_update_own on public.sync_tombstones
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  )
  with check (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_tombstones_delete_own on public.sync_tombstones
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

create policy sync_idempotency_receipts_select_own on public.sync_idempotency_receipts
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_idempotency_receipts_insert_own on public.sync_idempotency_receipts
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_idempotency_receipts_update_own on public.sync_idempotency_receipts
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  )
  with check (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy sync_idempotency_receipts_delete_own on public.sync_idempotency_receipts
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

-- No anon/authenticated policy is intentionally provided for cache or feedback.
-- Edge Functions use a controlled server client; browser clients cannot query
-- private cache rows or insert arbitrary feedback directly.
revoke all on table public.uv_forecast_cache from anon, authenticated;
revoke all on table public.feedback_submissions from anon, authenticated;

comment on table public.sync_records is
  'Validated UVAlert cross-device records; payload shape is enforced by Edge Functions.';
comment on table public.sync_tombstones is
  'Validated deletion markers preventing stale devices from resurrecting data.';
comment on table public.uv_forecast_cache is
  'Server-side CWA forecast cache; never exposed through PostgREST.';
comment on table public.feedback_submissions is
  'Anonymous text feedback written only by the feedback Edge Function.';
