-- Private persistence and atomic queue primitives for anonymous Web Push.
-- Browser roles never access these tables directly; validated Edge Functions
-- use the service role and the narrowly granted server-side functions below.

create table public.push_subscriptions (
  device_id uuid primary key default gen_random_uuid(),
  device_secret_hash text not null check (length(btrim(device_secret_hash)) between 1 and 256),
  endpoint text not null unique check (length(btrim(endpoint)) between 1 and 4096),
  p256dh text not null check (length(btrim(p256dh)) between 1 and 512),
  auth text not null check (length(btrim(auth)) between 1 and 256),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz not null default timezone('utc', now()),
  last_push_succeeded_at timestamptz null
);

create table public.push_schedules (
  device_id uuid primary key references public.push_subscriptions(device_id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'pending' check (
    status in ('pending', 'claimed', 'sent', 'cancelled', 'expired', 'failed')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null,
  claimed_at timestamptz null,
  claim_token uuid null,
  sent_at timestamptz null,
  cancelled_at timestamptz null,
  last_error_code text null check (
    last_error_code is null or length(btrim(last_error_code)) between 1 and 128
  ),
  last_operation_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index push_schedules_status_next_attempt_at_idx
  on public.push_schedules (status, next_attempt_at);

create table public.push_rate_limits (
  scope text not null check (length(btrim(scope)) between 1 and 64),
  key_hash text not null check (length(btrim(key_hash)) between 1 and 256),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, key_hash)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
alter table public.push_schedules enable row level security;
alter table public.push_schedules force row level security;
alter table public.push_rate_limits enable row level security;
alter table public.push_rate_limits force row level security;

revoke all on table public.push_subscriptions from public, anon, authenticated;
revoke all on table public.push_schedules from public, anon, authenticated;
revoke all on table public.push_rate_limits from public, anon, authenticated;

grant select, insert, update, delete on table public.push_subscriptions to service_role;
grant select, insert, update, delete on table public.push_schedules to service_role;
grant select, insert, update, delete on table public.push_rate_limits to service_role;

create or replace function public.claim_due_push_schedules(
  p_limit integer,
  p_now timestamptz,
  p_lease interval
)
returns table (
  device_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  due_at timestamptz,
  attempt_count integer,
  claim_token uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 100));
  v_lease interval := coalesce(p_lease, interval '2 minutes');
begin
  if p_now is null then
    raise exception 'p_now is required' using errcode = '22004';
  end if;

  if v_lease <= interval '0 seconds' then
    raise exception 'p_lease must be positive' using errcode = '22023';
  end if;

  update public.push_schedules as stale
  set
    status = 'expired',
    claimed_at = null,
    claim_token = null,
    updated_at = p_now
  where stale.status in ('pending', 'claimed')
    and stale.due_at < p_now - interval '10 minutes';

  return query
  with candidates as (
    select schedule.device_id
    from public.push_schedules as schedule
    join public.push_subscriptions as subscription
      on subscription.device_id = schedule.device_id
    where subscription.status = 'active'
      and schedule.due_at <= p_now
      and schedule.due_at >= p_now - interval '10 minutes'
      and (
        (
          schedule.status = 'pending'
          and schedule.next_attempt_at <= p_now
        )
        or (
          schedule.status = 'claimed'
          and schedule.claimed_at <= p_now - v_lease
        )
      )
    order by schedule.next_attempt_at, schedule.due_at, schedule.device_id
    for update of schedule skip locked
    limit v_limit
  ), claimed as (
    update public.push_schedules as schedule
    set
      status = 'claimed',
      claimed_at = p_now,
      claim_token = gen_random_uuid(),
      updated_at = p_now
    from candidates
    where schedule.device_id = candidates.device_id
    returning
      schedule.device_id,
      schedule.due_at,
      schedule.attempt_count,
      schedule.claim_token
  )
  select
    claimed.device_id,
    subscription.endpoint,
    subscription.p256dh,
    subscription.auth,
    claimed.due_at,
    claimed.attempt_count,
    claimed.claim_token
  from claimed
  join public.push_subscriptions as subscription
    on subscription.device_id = claimed.device_id
  order by claimed.due_at, claimed.device_id;
end;
$$;

create or replace function public.settle_push_schedule(
  p_device_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_now timestamptz,
  p_error_code text,
  p_retry_at timestamptz
)
returns setof public.push_schedules
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_outcome not in ('sent', 'retry', 'expired', 'failed', 'cancelled') then
    raise exception 'unsupported settlement outcome' using errcode = '22023';
  end if;

  if p_outcome = 'retry' and p_retry_at is null then
    raise exception 'retry outcome requires p_retry_at' using errcode = '22004';
  end if;

  return query
  update public.push_schedules as schedule
  set
    status = case when p_outcome = 'retry' then 'pending' else p_outcome end,
    attempt_count = schedule.attempt_count + case when p_outcome = 'retry' then 1 else 0 end,
    next_attempt_at = case when p_outcome = 'retry' then p_retry_at else schedule.next_attempt_at end,
    claimed_at = null,
    claim_token = null,
    sent_at = case when p_outcome = 'sent' then p_now else schedule.sent_at end,
    cancelled_at = case when p_outcome = 'cancelled' then p_now else schedule.cancelled_at end,
    last_error_code = p_error_code,
    updated_at = p_now
  where schedule.device_id = p_device_id
    and schedule.status = 'claimed'
    and schedule.claim_token = p_claim_token
  returning schedule.*;
end;
$$;

create or replace function public.consume_push_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window interval,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_limit public.push_rate_limits%rowtype;
begin
  if p_limit < 1 or p_window <= interval '0 seconds' then
    raise exception 'rate limit and window must be positive' using errcode = '22023';
  end if;

  insert into public.push_rate_limits as rate_limit (
    scope,
    key_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_scope,
    p_key_hash,
    p_now,
    0,
    p_now
  )
  on conflict (scope, key_hash) do nothing;

  select *
  into current_limit
  from public.push_rate_limits as rate_limit
  where rate_limit.scope = p_scope
    and rate_limit.key_hash = p_key_hash
  for update;

  if current_limit.window_started_at + p_window <= p_now then
    update public.push_rate_limits as rate_limit
    set
      window_started_at = p_now,
      request_count = 1,
      updated_at = p_now
    where rate_limit.scope = p_scope
      and rate_limit.key_hash = p_key_hash;
    return true;
  end if;

  if current_limit.request_count >= p_limit then
    return false;
  end if;

  update public.push_rate_limits as rate_limit
  set
    request_count = rate_limit.request_count + 1,
    updated_at = p_now
  where rate_limit.scope = p_scope
    and rate_limit.key_hash = p_key_hash;

  return true;
end;
$$;

create or replace function public.cleanup_push_data(p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.push_schedules as schedule
  where schedule.status in ('sent', 'cancelled', 'expired', 'failed')
    and coalesce(schedule.sent_at, schedule.cancelled_at, schedule.updated_at) < p_now - interval '7 days';

  delete from public.push_subscriptions as subscription
  where subscription.last_active_at < p_now - interval '90 days';

  delete from public.push_rate_limits as rate_limit
  where rate_limit.updated_at < p_now - interval '2 days';
end;
$$;

revoke all on function public.claim_due_push_schedules(integer, timestamptz, interval) from public, anon, authenticated;
revoke all on function public.settle_push_schedule(uuid, uuid, text, timestamptz, text, timestamptz) from public, anon, authenticated;
revoke all on function public.consume_push_rate_limit(text, text, integer, interval, timestamptz) from public, anon, authenticated;
revoke all on function public.cleanup_push_data(timestamptz) from public, anon, authenticated;

grant execute on function public.claim_due_push_schedules(integer, timestamptz, interval) to service_role;
grant execute on function public.settle_push_schedule(uuid, uuid, text, timestamptz, text, timestamptz) to service_role;
grant execute on function public.consume_push_rate_limit(text, text, integer, interval, timestamptz) to service_role;
grant execute on function public.cleanup_push_data(timestamptz) to service_role;

comment on table public.push_subscriptions is
  'Private anonymous Web Push subscriptions managed only by validated Edge Functions.';
comment on table public.push_schedules is
  'One current anonymous reminder schedule per device; contains no Session or notification content.';
comment on table public.push_rate_limits is
  'Short-lived server-side counters keyed only by minimized hashes or device identifiers.';
