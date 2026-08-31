-- Keep the minute-by-minute dispatcher bounded. Expiring stale reminders is
-- maintenance work, so it belongs to the independent daily cleanup job.

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

create or replace function public.cleanup_push_data(p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.push_schedules as stale
  set
    status = 'expired',
    claimed_at = null,
    claim_token = null,
    updated_at = p_now
  where stale.status in ('pending', 'claimed')
    and stale.due_at < p_now - interval '10 minutes';

  delete from public.push_schedules as schedule
  where schedule.status in ('sent', 'cancelled', 'expired', 'failed')
    and coalesce(schedule.sent_at, schedule.cancelled_at, schedule.updated_at) < p_now - interval '7 days';

  delete from public.push_subscriptions as subscription
  where subscription.last_active_at < p_now - interval '90 days';

  delete from public.push_rate_limits as rate_limit
  where rate_limit.updated_at < p_now - interval '2 days';
end;
$$;
