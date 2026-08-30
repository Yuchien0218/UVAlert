-- Serialize anonymous reminder changes per device and make operation replay
-- durable across Edge Function instances.

create or replace function public.apply_push_schedule_operation(
  p_device_id uuid,
  p_operation_id uuid,
  p_action text,
  p_due_at timestamptz,
  p_now timestamptz
)
returns table (
  state text,
  due_at timestamptz,
  operation_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing_schedule public.push_schedules%rowtype;
  existing_state text;
begin
  if p_device_id is null or p_operation_id is null or p_now is null then
    raise exception 'device, operation and server time are required' using errcode = '22004';
  end if;
  if p_action not in ('schedule', 'cancel') then
    raise exception 'unsupported schedule action' using errcode = '22023';
  end if;
  if p_action = 'schedule' and (
    p_due_at is null
    or p_due_at < p_now - interval '10 minutes'
    or p_due_at > p_now + interval '24 hours'
  ) then
    raise exception 'schedule due time is outside the allowed window' using errcode = '22023';
  end if;

  -- A hash collision only serializes unrelated devices; it cannot mix rows.
  perform pg_advisory_xact_lock(hashtextextended(p_device_id::text, 0));

  if not exists (
    select 1
    from public.push_subscriptions as subscription
    where subscription.device_id = p_device_id
      and subscription.status = 'active'
  ) then
    return;
  end if;

  select schedule.*
  into existing_schedule
  from public.push_schedules as schedule
  where schedule.device_id = p_device_id
  for update;

  if found and existing_schedule.last_operation_id = p_operation_id then
    existing_state := case
      when existing_schedule.status = 'cancelled' then 'cancelled'
      else 'scheduled'
    end;
    if existing_state <> (case when p_action = 'cancel' then 'cancelled' else 'scheduled' end) then
      raise exception 'operation id was used for another action' using errcode = '22023';
    end if;
    return query select
      existing_state,
      case when existing_state = 'scheduled' then existing_schedule.due_at else null end,
      existing_schedule.last_operation_id,
      true;
    return;
  end if;

  if p_action = 'schedule' then
    insert into public.push_schedules as schedule (
      device_id,
      due_at,
      status,
      attempt_count,
      next_attempt_at,
      claimed_at,
      claim_token,
      sent_at,
      cancelled_at,
      last_error_code,
      last_operation_id,
      created_at,
      updated_at
    ) values (
      p_device_id,
      p_due_at,
      'pending',
      0,
      p_due_at,
      null,
      null,
      null,
      null,
      null,
      p_operation_id,
      p_now,
      p_now
    )
    on conflict (device_id) do update
    set
      due_at = excluded.due_at,
      status = 'pending',
      attempt_count = 0,
      next_attempt_at = excluded.next_attempt_at,
      claimed_at = null,
      claim_token = null,
      sent_at = null,
      cancelled_at = null,
      last_error_code = null,
      last_operation_id = excluded.last_operation_id,
      updated_at = excluded.updated_at;

    return query select 'scheduled'::text, p_due_at, p_operation_id, false;
    return;
  end if;

  insert into public.push_schedules as schedule (
    device_id,
    due_at,
    status,
    attempt_count,
    next_attempt_at,
    claimed_at,
    claim_token,
    sent_at,
    cancelled_at,
    last_error_code,
    last_operation_id,
    created_at,
    updated_at
  ) values (
    p_device_id,
    p_now,
    'cancelled',
    0,
    p_now,
    null,
    null,
    null,
    p_now,
    null,
    p_operation_id,
    p_now,
    p_now
  )
  on conflict (device_id) do update
  set
    status = 'cancelled',
    claimed_at = null,
    claim_token = null,
    sent_at = null,
    cancelled_at = excluded.cancelled_at,
    last_error_code = null,
    last_operation_id = excluded.last_operation_id,
    updated_at = excluded.updated_at;

  return query select 'cancelled'::text, null::timestamptz, p_operation_id, false;
end;
$$;

revoke all on function public.apply_push_schedule_operation(uuid, uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_push_schedule_operation(uuid, uuid, text, timestamptz, timestamptz)
  to service_role;
