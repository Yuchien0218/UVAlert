begin;

select plan(88);

select has_table('public', 'push_subscriptions', 'push subscriptions table exists');
select has_table('public', 'push_schedules', 'push schedules table exists');
select has_table('public', 'push_rate_limits', 'push rate limits table exists');

select has_column('public', 'push_subscriptions', 'device_id', 'subscription device id exists');
select has_column('public', 'push_subscriptions', 'device_secret_hash', 'subscription secret hash exists');
select has_column('public', 'push_subscriptions', 'endpoint', 'subscription endpoint exists');
select has_column('public', 'push_subscriptions', 'last_active_at', 'subscription activity timestamp exists');
select has_column('public', 'push_schedules', 'due_at', 'schedule due timestamp exists');
select has_column('public', 'push_schedules', 'next_attempt_at', 'schedule retry timestamp exists');
select has_column('public', 'push_schedules', 'claim_token', 'schedule claim token exists');
select has_column('public', 'push_schedules', 'last_operation_id', 'schedule operation id exists');

select has_index(
  'public',
  'push_schedules',
  'push_schedules_status_next_attempt_at_idx',
  'dispatcher status and retry index exists'
);

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.push_subscriptions'::regclass),
  'subscriptions force RLS'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.push_schedules'::regclass),
  'schedules force RLS'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.push_rate_limits'::regclass),
  'rate limits force RLS'
);

select ok(
  not has_table_privilege('anon', 'public.push_subscriptions', 'select,insert,update,delete'),
  'anon has no subscription table privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.push_subscriptions', 'select,insert,update,delete'),
  'authenticated has no subscription table privileges'
);
select ok(
  not has_table_privilege('anon', 'public.push_schedules', 'select,insert,update,delete'),
  'anon has no schedule table privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.push_schedules', 'select,insert,update,delete'),
  'authenticated has no schedule table privileges'
);
select ok(
  not has_table_privilege('anon', 'public.push_rate_limits', 'select,insert,update,delete'),
  'anon has no rate limit table privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.push_rate_limits', 'select,insert,update,delete'),
  'authenticated has no rate limit table privileges'
);
select ok(
  has_table_privilege('service_role', 'public.push_subscriptions', 'select,insert,update,delete'),
  'service role can manage subscriptions'
);
select ok(
  has_table_privilege('service_role', 'public.push_schedules', 'select,insert,update,delete'),
  'service role can manage schedules'
);
select ok(
  has_table_privilege('service_role', 'public.push_rate_limits', 'select,insert,update,delete'),
  'service role can manage rate limits'
);

select function_privs_are(
  'public',
  'claim_due_push_schedules',
  array['integer', 'timestamp with time zone', 'interval'],
  'service_role',
  array['EXECUTE'],
  'only service role executes claim'
);
select function_privs_are(
  'public',
  'cleanup_push_data',
  array['timestamp with time zone'],
  'service_role',
  array['EXECUTE'],
  'only service role executes cleanup'
);
select function_privs_are(
  'public',
  'settle_claimed_push_schedule',
  array['uuid', 'uuid', 'text', 'text', 'text', 'text', 'timestamp with time zone', 'text', 'timestamp with time zone'],
  'service_role',
  array['EXECUTE'],
  'only service role executes settlement'
);
select function_privs_are(
  'public',
  'consume_push_rate_limit',
  array['text', 'text', 'integer', 'interval', 'timestamp with time zone'],
  'service_role',
  array['EXECUTE'],
  'only service role executes rate limiting'
);

select ok(
  not has_function_privilege('anon', 'public.claim_due_push_schedules(integer,timestamptz,interval)', 'execute'),
  'anon cannot execute claim'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_due_push_schedules(integer,timestamptz,interval)', 'execute'),
  'authenticated cannot execute claim'
);
select ok(
  not has_function_privilege('anon', 'public.settle_claimed_push_schedule(uuid,uuid,text,text,text,text,timestamptz,text,timestamptz)', 'execute'),
  'anon cannot execute settlement'
);
select ok(
  not has_function_privilege('authenticated', 'public.settle_claimed_push_schedule(uuid,uuid,text,text,text,text,timestamptz,text,timestamptz)', 'execute'),
  'authenticated cannot execute settlement'
);
select ok(
  not has_function_privilege('anon', 'public.consume_push_rate_limit(text,text,integer,interval,timestamptz)', 'execute'),
  'anon cannot execute rate limiting'
);
select ok(
  not has_function_privilege('authenticated', 'public.consume_push_rate_limit(text,text,integer,interval,timestamptz)', 'execute'),
  'authenticated cannot execute rate limiting'
);
select ok(
  not has_function_privilege('anon', 'public.cleanup_push_data(timestamptz)', 'execute'),
  'anon cannot execute cleanup'
);
select ok(
  not has_function_privilege('authenticated', 'public.cleanup_push_data(timestamptz)', 'execute'),
  'authenticated cannot execute cleanup'
);

insert into public.push_subscriptions (
  device_id, device_secret_hash, endpoint, p256dh, auth, status,
  created_at, updated_at, last_active_at
) values
  ('10000000-0000-0000-0000-000000000001', 'hash-1', 'https://push.example/1', 'key-1', 'auth-1', 'active', '2026-08-30 08:00Z', '2026-08-30 08:00Z', '2026-08-30 08:00Z'),
  ('10000000-0000-0000-0000-000000000002', 'hash-2', 'https://push.example/2', 'key-2', 'auth-2', 'active', '2026-08-30 08:00Z', '2026-08-30 08:00Z', '2026-08-30 08:00Z'),
  ('10000000-0000-0000-0000-000000000003', 'hash-3', 'https://push.example/3', 'key-3', 'auth-3', 'active', '2026-08-30 08:00Z', '2026-08-30 08:00Z', '2026-08-30 08:00Z');

select throws_ok(
  $$insert into public.push_subscriptions (device_id, device_secret_hash, endpoint, p256dh, auth, status) values ('10000000-0000-0000-0000-000000000004', 'hash-4', 'https://push.example/4', 'key-4', 'auth-4', 'unknown')$$,
  '23514',
  null,
  'unknown subscription state is rejected'
);

insert into public.push_schedules (
  device_id, due_at, status, attempt_count, next_attempt_at, last_operation_id,
  created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '2026-08-30 09:59Z', 'pending', 0, '2026-08-30 09:59Z', '20000000-0000-0000-0000-000000000001', '2026-08-30 09:00Z', '2026-08-30 09:00Z'),
  ('10000000-0000-0000-0000-000000000002', '2026-08-30 10:05Z', 'pending', 0, '2026-08-30 10:05Z', '20000000-0000-0000-0000-000000000002', '2026-08-30 09:00Z', '2026-08-30 09:00Z'),
  ('10000000-0000-0000-0000-000000000003', '2026-08-30 09:58Z', 'cancelled', 0, '2026-08-30 09:58Z', '20000000-0000-0000-0000-000000000003', '2026-08-30 09:00Z', '2026-08-30 09:58Z');

select throws_ok(
  $$update public.push_schedules set status = 'unknown' where device_id = '10000000-0000-0000-0000-000000000003'$$,
  '23514',
  null,
  'unknown schedule state is rejected'
);
select throws_ok(
  $$update public.push_schedules set attempt_count = -1 where device_id = '10000000-0000-0000-0000-000000000003'$$,
  '23514',
  null,
  'negative attempts are rejected'
);

create temporary table first_claim as
select * from public.claim_due_push_schedules(100, '2026-08-30 10:00Z', interval '2 minutes');

select is((select count(*) from first_claim), 1::bigint, 'only due pending schedules are claimed');
select is((select device_id from first_claim), '10000000-0000-0000-0000-000000000001'::uuid, 'claim returns the due device');
select ok((select claim_token is not null from first_claim), 'claim returns a fresh token');
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000001'),
  'claimed',
  'claim atomically changes schedule state'
);
select is(
  (select count(*) from public.claim_due_push_schedules(100, '2026-08-30 10:01Z', interval '2 minutes')),
  0::bigint,
  'active lease prevents a duplicate claim'
);

create temporary table reclaimed as
select * from public.claim_due_push_schedules(100, '2026-08-30 10:02:01Z', interval '2 minutes');

select is((select count(*) from reclaimed), 1::bigint, 'abandoned schedule is reclaimed after lease expiry');
select isnt((select claim_token from reclaimed), (select claim_token from first_claim), 'reclaim uses a new token');

select ok(
  not public.settle_claimed_push_schedule(
      '10000000-0000-0000-0000-000000000001',
      (select claim_token from first_claim),
      'https://push.example/1',
      'key-1',
      'auth-1',
      'sent',
      '2026-08-30 10:02:02Z',
      null,
      null
    ),
  'stale claim token cannot settle a reclaimed schedule'
);
select ok(
  public.settle_claimed_push_schedule(
      '10000000-0000-0000-0000-000000000001',
      (select claim_token from reclaimed),
      'https://push.example/1',
      'key-1',
      'auth-1',
      'sent',
      '2026-08-30 10:02:02Z',
      null,
      null
    ),
  'current claim token settles the schedule'
);
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000001'),
  'sent',
  'successful settlement records terminal state'
);
select is(
  (select last_push_succeeded_at from public.push_subscriptions where device_id = '10000000-0000-0000-0000-000000000001'),
  '2026-08-30 10:02:02+00'::timestamptz,
  'successful settlement records subscription delivery time'
);

select ok(public.consume_push_rate_limit('register', 'client-a', 2, interval '1 hour', '2026-08-30 10:00Z'), 'first rate limited action is allowed');
select ok(public.consume_push_rate_limit('register', 'client-a', 2, interval '1 hour', '2026-08-30 10:01Z'), 'action at the limit is allowed');
select ok(not public.consume_push_rate_limit('register', 'client-a', 2, interval '1 hour', '2026-08-30 10:02Z'), 'action beyond the limit is rejected');
select ok(public.consume_push_rate_limit('register', 'client-a', 2, interval '1 hour', '2026-08-30 11:00:01Z'), 'new rate limit window is allowed');

insert into public.push_subscriptions (
  device_id, device_secret_hash, endpoint, p256dh, auth, status,
  created_at, updated_at, last_active_at
) values
  ('10000000-0000-0000-0000-000000000011', 'old-hash', 'https://push.example/old', 'old-key', 'old-auth', 'active', '2026-05-01Z', '2026-05-01Z', '2026-05-01Z'),
  ('10000000-0000-0000-0000-000000000012', 'young-hash', 'https://push.example/young', 'young-key', 'young-auth', 'active', '2026-08-29Z', '2026-08-29Z', '2026-08-29Z');

insert into public.push_schedules (
  device_id, due_at, status, attempt_count, next_attempt_at, last_operation_id,
  created_at, updated_at, sent_at
) values
  ('10000000-0000-0000-0000-000000000011', '2026-05-01Z', 'sent', 1, '2026-05-01Z', '20000000-0000-0000-0000-000000000011', '2026-05-01Z', '2026-05-01Z', '2026-05-01Z'),
  ('10000000-0000-0000-0000-000000000012', '2026-08-29Z', 'sent', 1, '2026-08-29Z', '20000000-0000-0000-0000-000000000012', '2026-08-29Z', '2026-08-29Z', '2026-08-29Z');

select lives_ok(
  $$select public.cleanup_push_data('2026-08-30 12:00Z')$$,
  'cleanup completes'
);
select ok(
  not exists (select 1 from public.push_subscriptions where device_id = '10000000-0000-0000-0000-000000000011'),
  'subscription inactive for more than 90 days is deleted'
);
select ok(
  not exists (select 1 from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000011'),
  'inactive subscription cleanup cascades to its schedule'
);
select ok(
  exists (select 1 from public.push_subscriptions where device_id = '10000000-0000-0000-0000-000000000012'),
  'younger subscription is preserved'
);
select ok(
  exists (select 1 from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000012'),
  'terminal schedule younger than seven days is preserved'
);

update public.push_schedules
set updated_at = '2026-08-20Z', sent_at = '2026-08-20Z'
where device_id = '10000000-0000-0000-0000-000000000012';

select lives_ok(
  $$select public.cleanup_push_data('2026-08-30 12:00Z')$$,
  'cleanup can run repeatedly'
);
select ok(
  not exists (select 1 from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000012'),
  'terminal schedule older than seven days is deleted'
);
select ok(
  exists (select 1 from public.push_subscriptions where device_id = '10000000-0000-0000-0000-000000000012'),
  'terminal schedule cleanup keeps an active subscription'
);

insert into public.push_schedules (
  device_id, due_at, status, attempt_count, next_attempt_at, last_operation_id,
  created_at, updated_at
) values (
  '10000000-0000-0000-0000-000000000012', '2026-08-30 09:00Z', 'pending', 0,
  '2026-08-30 09:00Z', '20000000-0000-0000-0000-000000000013', '2026-08-30 08:00Z', '2026-08-30 08:00Z'
);

select is(
  (select count(*) from public.claim_due_push_schedules(100, '2026-08-30 09:10:01Z', interval '2 minutes')),
  0::bigint,
  'schedule older than ten minutes is not claimed'
);
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000012'),
  'expired',
  'stale due schedule is expired atomically'
);

select has_function(
  'public',
  'expire_claimed_push_subscription',
  array['uuid', 'uuid', 'text', 'text', 'text', 'timestamp with time zone'],
  'gone cleanup function exists'
);
select has_function(
  'public',
  'renew_push_schedule_claim',
  array['uuid', 'uuid', 'text', 'text', 'text', 'timestamp with time zone'],
  'claim renewal function exists'
);
select has_function(
  'public',
  'settle_claimed_push_schedule',
  array['uuid', 'uuid', 'text', 'text', 'text', 'text', 'timestamp with time zone', 'text', 'timestamp with time zone'],
  'endpoint-aware settlement function exists'
);
select ok(
  not has_function_privilege('anon', 'public.expire_claimed_push_subscription(uuid,uuid,text,text,text,timestamptz)', 'execute'),
  'anon cannot expire a claimed subscription'
);
select ok(
  not has_function_privilege('authenticated', 'public.expire_claimed_push_subscription(uuid,uuid,text,text,text,timestamptz)', 'execute'),
  'authenticated cannot expire a claimed subscription'
);

insert into public.push_subscriptions (
  device_id, device_secret_hash, endpoint, p256dh, auth, status,
  created_at, updated_at, last_active_at
) values (
  '10000000-0000-0000-0000-000000000020', 'gone-hash',
  'https://push.example/old-endpoint', 'gone-key', 'gone-auth', 'active',
  '2026-08-30 09:00Z', '2026-08-30 09:00Z', '2026-08-30 09:00Z'
);
insert into public.push_schedules (
  device_id, due_at, status, attempt_count, next_attempt_at, claimed_at,
  claim_token, last_operation_id, created_at, updated_at
) values (
  '10000000-0000-0000-0000-000000000020', '2026-08-30 10:00Z', 'claimed', 0,
  '2026-08-30 10:00Z', '2026-08-30 10:00Z',
  '30000000-0000-4000-8000-000000000020',
  '20000000-0000-0000-0000-000000000020', '2026-08-30 09:00Z', '2026-08-30 10:00Z'
);
update public.push_subscriptions
set endpoint = 'https://push.example/new-endpoint', updated_at = '2026-08-30 10:00:01Z'
where device_id = '10000000-0000-0000-0000-000000000020';

select ok(
  not public.settle_claimed_push_schedule(
    '10000000-0000-0000-0000-000000000020',
    '30000000-0000-4000-8000-000000000020',
    'https://push.example/old-endpoint',
    'gone-key',
    'gone-auth',
    'sent', '2026-08-30 10:00:02Z', null, null
  ),
  'stale endpoint cannot settle a replacement subscription schedule'
);
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000020'),
  'claimed',
  'stale endpoint settlement preserves claim state'
);
update public.push_subscriptions
set p256dh = 'new-key', auth = 'new-auth', updated_at = '2026-08-30 10:00:02Z'
where device_id = '10000000-0000-0000-0000-000000000020';
select ok(
  not public.renew_push_schedule_claim(
    '10000000-0000-0000-0000-000000000020',
    '30000000-0000-4000-8000-000000000020',
    'https://push.example/new-endpoint',
    'gone-key', 'gone-auth', '2026-08-30 10:00:02Z'
  ),
  'rotated keys invalidate an old claim snapshot'
);
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000020'),
  'claimed',
  'stale key renewal preserves the current claim for a fresh worker'
);

select ok(
  not public.expire_claimed_push_subscription(
    '10000000-0000-0000-0000-000000000020',
    '30000000-0000-4000-8000-000000000020',
    'https://push.example/old-endpoint',
    'gone-key',
    'gone-auth',
    '2026-08-30 10:00:02Z'
  ),
  'stale endpoint cannot expire a replacement subscription'
);
select is(
  (select status from public.push_subscriptions where device_id = '10000000-0000-0000-0000-000000000020'),
  'active',
  'replacement subscription remains active'
);
select ok(
  exists (select 1 from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000020'),
  'stale gone result keeps the current schedule'
);
select ok(
  public.expire_claimed_push_subscription(
    '10000000-0000-0000-0000-000000000020',
    '30000000-0000-4000-8000-000000000020',
    'https://push.example/new-endpoint',
    'new-key',
    'new-auth',
    '2026-08-30 10:00:03Z'
  ),
  'current endpoint and claim token expire the subscription'
);
select is(
  (select status from public.push_subscriptions where device_id = '10000000-0000-0000-0000-000000000020'),
  'expired',
  'current gone result marks the subscription expired'
);
select ok(
  not exists (select 1 from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000020'),
  'current gone result removes the claimed schedule'
);

insert into public.push_subscriptions (
  device_id, device_secret_hash, endpoint, p256dh, auth, status,
  created_at, updated_at, last_active_at
) values (
  '10000000-0000-0000-0000-000000000021', 'retry-hash',
  'https://push.example/retry', 'retry-key', 'retry-auth', 'active',
  '2026-08-30 09:00Z', '2026-08-30 09:00Z', '2026-08-30 09:00Z'
);
insert into public.push_schedules (
  device_id, due_at, status, attempt_count, next_attempt_at, claimed_at,
  claim_token, last_operation_id, created_at, updated_at
) values (
  '10000000-0000-0000-0000-000000000021', '2026-08-30 10:00Z', 'claimed', 2,
  '2026-08-30 10:00Z', '2026-08-30 10:00Z',
  '30000000-0000-4000-8000-000000000021',
  '20000000-0000-0000-0000-000000000021', '2026-08-30 09:00Z', '2026-08-30 10:00Z'
);
select ok(
  public.settle_claimed_push_schedule(
    '10000000-0000-0000-0000-000000000021',
    '30000000-0000-4000-8000-000000000021',
    'https://push.example/retry',
    'retry-key',
    'retry-auth',
    'failed', '2026-08-30 10:00:01Z', 'PUSH_503', null
  ),
  'third transient failure settles terminally'
);
select is(
  (select attempt_count from public.push_schedules where device_id = '10000000-0000-0000-0000-000000000021'),
  3,
  'third transient failure records attempt three'
);

select is(
  (select count(*) from cron.job where jobname = 'uvalert-push-dispatch'),
  1::bigint,
  'dispatcher Cron exists exactly once'
);
select is(
  (select count(*) from cron.job where jobname = 'uvalert-push-cleanup'),
  1::bigint,
  'cleanup Cron exists exactly once'
);
select is(
  (select schedule from cron.job where jobname = 'uvalert-push-dispatch'),
  '* * * * *',
  'dispatcher Cron runs every minute'
);
select ok(
  (select command like '%vault.decrypted_secrets%'
      and command like '%uvalert_project_url%'
      and command like '%uvalert_push_dispatch_secret%'
      and command like '%X-Dispatch-Secret%'
      and command like '%/functions/v1/push-dispatch%'
   from cron.job where jobname = 'uvalert-push-dispatch'),
  'dispatcher Cron reads URL and secret from Vault at execution time'
);
select is(
  (select schedule from cron.job where jobname = 'uvalert-push-cleanup'),
  '17 3 * * *',
  'cleanup Cron runs daily at 03:17 UTC'
);
select ok(
  (select command like '%cleanup_push_data(now())%' from cron.job where jobname = 'uvalert-push-cleanup'),
  'cleanup Cron calls the bounded cleanup function'
);
select hasnt_function(
  'public',
  'settle_push_schedule',
  array['uuid', 'uuid', 'text', 'timestamp with time zone', 'text', 'timestamp with time zone'],
  'endpoint-unaware settlement function is removed'
);

select * from finish();
rollback;
