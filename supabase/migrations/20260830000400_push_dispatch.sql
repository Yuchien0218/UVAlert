-- Dispatcher ownership, terminal delivery bookkeeping and scheduled jobs.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.renew_push_schedule_claim(
  p_device_id uuid,
  p_claim_token uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform 1
  from public.push_schedules as schedule
  join public.push_subscriptions as subscription on subscription.device_id = schedule.device_id
  where schedule.device_id = p_device_id
    and schedule.status = 'claimed'
    and schedule.claim_token = p_claim_token
    and schedule.due_at > p_now - interval '10 minutes'
    and subscription.status = 'active'
    and subscription.endpoint = p_endpoint
    and subscription.p256dh = p_p256dh
    and subscription.auth = p_auth
  for update of schedule, subscription;
  if not found then return false; end if;

  update public.push_schedules as schedule
  set claimed_at = p_now, updated_at = p_now
  where schedule.device_id = p_device_id
    and schedule.status = 'claimed'
    and schedule.claim_token = p_claim_token;
  return found;
end;
$$;

create or replace function public.settle_claimed_push_schedule(
  p_device_id uuid,
  p_claim_token uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_outcome text,
  p_now timestamptz,
  p_error_code text,
  p_retry_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_settled boolean := false;
begin
  if p_outcome not in ('sent', 'retry', 'expired', 'failed') then
    raise exception 'unsupported settlement outcome' using errcode = '22023';
  end if;
  if p_outcome = 'retry' and p_retry_at is null then
    raise exception 'retry outcome requires p_retry_at' using errcode = '22004';
  end if;

  perform 1
  from public.push_schedules as schedule
  join public.push_subscriptions as subscription on subscription.device_id = schedule.device_id
  where schedule.device_id = p_device_id
    and schedule.status = 'claimed'
    and schedule.claim_token = p_claim_token
    and subscription.endpoint = p_endpoint
    and subscription.p256dh = p_p256dh
    and subscription.auth = p_auth
  for update of schedule, subscription;
  if not found then return false; end if;

  with settled as (
    update public.push_schedules as schedule
    set
      status = case when p_outcome = 'retry' then 'pending' else p_outcome end,
      attempt_count = schedule.attempt_count + case
        when p_outcome = 'retry' or (
          p_outcome = 'failed' and p_error_code in ('PUSH_429', 'PUSH_500', 'PUSH_502', 'PUSH_503', 'PUSH_504')
        ) then 1 else 0 end,
      next_attempt_at = case when p_outcome = 'retry' then p_retry_at else schedule.next_attempt_at end,
      claimed_at = null,
      claim_token = null,
      sent_at = case when p_outcome = 'sent' then p_now else schedule.sent_at end,
      last_error_code = p_error_code,
      updated_at = p_now
    where schedule.device_id = p_device_id
      and schedule.status = 'claimed'
      and schedule.claim_token = p_claim_token
    returning schedule.device_id
  ), touched as (
    update public.push_subscriptions as subscription
    set last_push_succeeded_at = p_now, updated_at = p_now
    where p_outcome = 'sent'
      and subscription.device_id in (select device_id from settled)
    returning subscription.device_id
  )
  select exists(select 1 from settled) into v_settled;
  return v_settled;
end;
$$;

create or replace function public.expire_claimed_push_subscription(
  p_device_id uuid,
  p_claim_token uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform 1
  from public.push_schedules as schedule
  join public.push_subscriptions as subscription on subscription.device_id = schedule.device_id
  where schedule.device_id = p_device_id
    and schedule.status = 'claimed'
    and schedule.claim_token = p_claim_token
    and subscription.status = 'active'
    and subscription.endpoint = p_endpoint
    and subscription.p256dh = p_p256dh
    and subscription.auth = p_auth
  for update of schedule, subscription;
  if not found then return false; end if;

  update public.push_subscriptions
  set status = 'expired', updated_at = p_now
  where device_id = p_device_id and endpoint = p_endpoint;
  delete from public.push_schedules
  where device_id = p_device_id and status = 'claimed' and claim_token = p_claim_token;
  return found;
end;
$$;

drop function public.settle_push_schedule(uuid, uuid, text, timestamptz, text, timestamptz);

revoke all on function public.renew_push_schedule_claim(uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.settle_claimed_push_schedule(uuid, uuid, text, text, text, text, timestamptz, text, timestamptz) from public, anon, authenticated;
revoke all on function public.expire_claimed_push_subscription(uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.renew_push_schedule_claim(uuid, uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.settle_claimed_push_schedule(uuid, uuid, text, text, text, text, timestamptz, text, timestamptz) to service_role;
grant execute on function public.expire_claimed_push_subscription(uuid, uuid, text, text, text, timestamptz) to service_role;

do $$
declare existing_job record;
begin
  for existing_job in select jobid from cron.job where jobname in ('uvalert-push-dispatch', 'uvalert-push-cleanup') loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule('uvalert-push-dispatch', '* * * * *', $dispatch$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'uvalert_project_url') || '/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Dispatch-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'uvalert_push_dispatch_secret')
    ),
    body := '{}'::jsonb
  );
$dispatch$);

select cron.schedule(
  'uvalert-push-cleanup',
  '17 3 * * *',
  $cleanup$select public.cleanup_push_data(now());$cleanup$
);
