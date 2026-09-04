begin;

select plan(40);

select has_function(
  'public',
  'apply_push_schedule_operation',
  array['uuid', 'uuid', 'text', 'timestamp with time zone', 'timestamp with time zone', 'bigint'],
  'atomic push schedule operation exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.apply_push_schedule_operation(uuid,uuid,text,timestamptz,timestamptz,bigint)',
    'execute'
  ),
  'anon cannot apply schedule operations'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.apply_push_schedule_operation(uuid,uuid,text,timestamptz,timestamptz,bigint)',
    'execute'
  ),
  'authenticated cannot apply schedule operations'
);
select function_privs_are(
  'public',
  'apply_push_schedule_operation',
  array['uuid', 'uuid', 'text', 'timestamp with time zone', 'timestamp with time zone', 'bigint'],
  'service_role',
  array['EXECUTE'],
  'service role executes schedule operations'
);
select has_function(
  'public',
  'apply_push_schedule_operation',
  array['uuid', 'uuid', 'text', 'timestamp with time zone', 'timestamp with time zone'],
  'pre-revision compatibility operation remains available during rollout'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.apply_push_schedule_operation(uuid,uuid,text,timestamptz,timestamptz)',
    'execute'
  ),
  'anon cannot execute the compatibility operation'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.apply_push_schedule_operation(uuid,uuid,text,timestamptz,timestamptz)',
    'execute'
  ),
  'authenticated cannot execute the compatibility operation'
);
select function_privs_are(
  'public',
  'apply_push_schedule_operation',
  array['uuid', 'uuid', 'text', 'timestamp with time zone', 'timestamp with time zone'],
  'service_role',
  array['EXECUTE'],
  'service role executes the compatibility operation'
);

insert into public.push_subscriptions (
  device_id, device_secret_hash, endpoint, p256dh, auth, status,
  created_at, updated_at, last_active_at
) values
  ('10000000-0000-4000-8000-000000000021', 'hash-21', 'https://push.example/21', 'key-21', 'auth-21', 'active', '2026-08-30 09:00Z', '2026-08-30 09:00Z', '2026-08-30 09:00Z'),
  ('10000000-0000-4000-8000-000000000022', 'hash-22', 'https://push.example/22', 'key-22', 'auth-22', 'active', '2026-08-30 09:00Z', '2026-08-30 09:00Z', '2026-08-30 09:00Z'),
  ('10000000-0000-4000-8000-000000000023', 'hash-23', 'https://push.example/23', 'key-23', 'auth-23', 'revoked', '2026-08-30 09:00Z', '2026-08-30 09:00Z', '2026-08-30 09:00Z');

create temporary table first_schedule as
select * from public.apply_push_schedule_operation(
  '10000000-0000-4000-8000-000000000021',
  '20000000-0000-4000-8000-000000000021',
  'schedule',
  '2026-08-30 10:30Z',
  '2026-08-30 10:00Z',
  1
);

select is((select state from first_schedule), 'scheduled', 'schedule operation returns scheduled');
select is((select due_at from first_schedule), '2026-08-30 10:30Z'::timestamptz, 'schedule operation returns due time');
select ok(not (select replayed from first_schedule), 'first schedule operation is not a replay');
select is(
  (select count(*) from public.push_schedules where device_id = '10000000-0000-4000-8000-000000000021'),
  1::bigint,
  'device has exactly one schedule row'
);
select ok(
  (
    select status = 'pending'
      and attempt_count = 0
      and next_attempt_at = due_at
      and claimed_at is null
      and claim_token is null
      and sent_at is null
      and cancelled_at is null
    from public.push_schedules
    where device_id = '10000000-0000-4000-8000-000000000021'
  ),
  'schedule operation initializes all delivery fields'
);
select is(
  (select last_active_at from public.push_subscriptions where device_id = '10000000-0000-4000-8000-000000000021'),
  '2026-08-30 10:00Z'::timestamptz,
  'authenticated schedule atomically records device activity'
);

create temporary table replayed_schedule as
select * from public.apply_push_schedule_operation(
  '10000000-0000-4000-8000-000000000021',
  '20000000-0000-4000-8000-000000000021',
  'schedule',
  '2026-08-30 10:30Z',
  '2026-08-30 10:05Z',
  1
);

select ok((select replayed from replayed_schedule), 'same schedule operation is replayed');
select is(
  (select updated_at from public.push_schedules where device_id = '10000000-0000-4000-8000-000000000021'),
  '2026-08-30 10:00Z'::timestamptz,
  'schedule replay does not rewrite the row'
);

update public.push_schedules
set
  status = 'failed',
  attempt_count = 2,
  claimed_at = '2026-08-30 10:01Z',
  claim_token = '30000000-0000-4000-8000-000000000021',
  sent_at = '2026-08-30 10:02Z',
  cancelled_at = '2026-08-30 10:03Z'
where device_id = '10000000-0000-4000-8000-000000000021';

select is(
  (
    select due_at
    from public.apply_push_schedule_operation(
      '10000000-0000-4000-8000-000000000021',
      '20000000-0000-4000-8000-000000000022',
      'schedule',
      '2026-08-30 11:00Z',
      '2026-08-30 10:10Z',
      2
    )
  ),
  '2026-08-30 11:00Z'::timestamptz,
  'new operation replaces the due time'
);
select ok(
  (
    select status = 'pending'
      and attempt_count = 0
      and claimed_at is null
      and claim_token is null
      and sent_at is null
      and cancelled_at is null
    from public.push_schedules
    where device_id = '10000000-0000-4000-8000-000000000021'
  ),
  'replacement resets delivery state'
);

update public.push_schedules
set
  status = 'sent',
  claimed_at = '2026-08-30 10:11Z',
  claim_token = '30000000-0000-4000-8000-000000000022',
  sent_at = '2026-08-30 10:12Z'
where device_id = '10000000-0000-4000-8000-000000000021';

create temporary table first_cancel as
select * from public.apply_push_schedule_operation(
  '10000000-0000-4000-8000-000000000021',
  '20000000-0000-4000-8000-000000000023',
  'cancel',
  null,
  '2026-08-30 10:15Z',
  3
);

select is((select state from first_cancel), 'cancelled', 'cancel returns cancelled');
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-4000-8000-000000000021'),
  'cancelled',
  'cancel marks the current row cancelled'
);
select ok(
  (
    select sent_at is null
      and claimed_at is null
      and claim_token is null
      and cancelled_at = '2026-08-30 10:15Z'::timestamptz
    from public.push_schedules
    where device_id = '10000000-0000-4000-8000-000000000021'
  ),
  'cancel clears old delivery timestamps and records the new cancellation time'
);
select ok(
  exists (select 1 from public.push_subscriptions where device_id = '10000000-0000-4000-8000-000000000021'),
  'cancel preserves the subscription'
);
select is(
  (select last_active_at from public.push_subscriptions where device_id = '10000000-0000-4000-8000-000000000021'),
  '2026-08-30 10:15Z'::timestamptz,
  'authenticated cancel atomically records device activity'
);
select ok(
  (
    select replayed
    from public.apply_push_schedule_operation(
      '10000000-0000-4000-8000-000000000021',
      '20000000-0000-4000-8000-000000000023',
      'cancel',
      null,
      '2026-08-30 10:20Z',
      3
    )
  ),
  'same cancel operation is replayed'
);
select is(
  (select updated_at from public.push_schedules where device_id = '10000000-0000-4000-8000-000000000021'),
  '2026-08-30 10:15Z'::timestamptz,
  'cancel replay does not rewrite the row'
);

select is(
  (
    select state
    from public.apply_push_schedule_operation(
      '10000000-0000-4000-8000-000000000022',
      '20000000-0000-4000-8000-000000000024',
      'cancel',
      null,
      '2026-08-30 10:20Z',
      1
    )
  ),
  'cancelled',
  'cancel without an existing schedule is successful'
);
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-4000-8000-000000000022'),
  'cancelled',
  'cancel without an existing schedule persists replay state'
);
select is(
  (select last_active_at from public.push_subscriptions where device_id = '10000000-0000-4000-8000-000000000022'),
  '2026-08-30 10:20Z'::timestamptz,
  'cancel without a prior schedule still records authenticated device activity'
);

select is(
  (
    select count(*)
    from public.apply_push_schedule_operation(
      '10000000-0000-4000-8000-000000000023',
      '20000000-0000-4000-8000-000000000025',
      'schedule',
      '2026-08-30 10:30Z',
      '2026-08-30 10:00Z',
      1
    )
  ),
  0::bigint,
  'revoked subscription cannot schedule'
);
select throws_ok(
  $$select public.apply_push_schedule_operation('10000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000026', 'unknown', null, '2026-08-30 10:00Z', 4)$$,
  '22023',
  null,
  'unknown schedule action is rejected'
);
select throws_ok(
  $$select public.apply_push_schedule_operation('10000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000027', 'schedule', '2026-08-31 10:00:01Z', '2026-08-30 10:00Z', 4)$$,
  '22023',
  null,
  'database rejects due time outside the server window'
);

insert into public.push_subscriptions (
  device_id, device_secret_hash, endpoint, p256dh, auth, status,
  created_at, updated_at, last_active_at
) values (
  '10000000-0000-4000-8000-000000000024', 'hash-24', 'https://push.example/24', 'key-24', 'auth-24', 'active',
  '2026-05-01Z', '2026-05-01Z', '2026-05-01Z'
), (
  '10000000-0000-4000-8000-000000000025', 'hash-25', 'https://push.example/25', 'key-25', 'auth-25', 'active',
  '2026-08-30 09:00Z', '2026-08-30 09:00Z', '2026-08-30 09:00Z'
), (
  '10000000-0000-4000-8000-000000000026', 'hash-26', 'https://push.example/26', 'key-26', 'auth-26', 'active',
  '2026-08-30 09:00Z', '2026-08-30 09:00Z', '2026-08-30 09:00Z'
);
select is(
  (
    select state
    from public.apply_push_schedule_operation(
      '10000000-0000-4000-8000-000000000024',
      '20000000-0000-4000-8000-000000000028',
      'schedule',
      '2026-08-30 10:30Z',
      '2026-08-30 10:00Z',
      1
    )
  ),
  'scheduled',
  'active device operation renews a previously stale subscription'
);
select public.cleanup_push_data('2026-08-30 12:00Z');
select ok(
  exists (select 1 from public.push_subscriptions where device_id = '10000000-0000-4000-8000-000000000024'),
  '90-day cleanup preserves a subscription that used authenticated scheduling'
);

-- A delayed write from another tab must never recreate a reminder after the
-- shared device has persisted a newer cancellation intent.
select is(
  (
    select state
    from public.apply_push_schedule_operation(
      '10000000-0000-4000-8000-000000000025',
      '20000000-0000-4000-8000-000000000029',
      'schedule',
      '2026-08-30 10:30Z',
      '2026-08-30 10:00Z',
      1
    )
  ),
  'scheduled',
  'first device intent is scheduled'
);
create temporary table newer_cancel as
select * from public.apply_push_schedule_operation(
  '10000000-0000-4000-8000-000000000025',
  '20000000-0000-4000-8000-000000000030',
  'cancel',
  null,
  '2026-08-30 10:05Z',
  2
);
select is(
  (select state from newer_cancel),
  'cancelled',
  'a newer device intent cancels the schedule'
);
create temporary table delayed_schedule as
select * from public.apply_push_schedule_operation(
  '10000000-0000-4000-8000-000000000025',
  '20000000-0000-4000-8000-000000000031',
  'schedule',
  '2026-08-30 11:00Z',
  '2026-08-30 10:06Z',
  1
);
select ok(
  not (select applied from delayed_schedule),
  'the atomic gate rejects a delayed older revision'
);
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-4000-8000-000000000025'),
  'cancelled',
  'an older revision arriving after cancellation cannot recreate the schedule'
);

-- A database-first rollout must keep the old Edge Function operational, but
-- once a revision-aware request has arrived the compatibility path may only
-- return the authoritative state and must never overwrite it.
select lives_ok(
  $$select * from public.apply_push_schedule_operation(
    '10000000-0000-4000-8000-000000000026',
    '20000000-0000-4000-8000-000000000032',
    'schedule',
    '2026-08-30 10:30Z',
    '2026-08-30 10:00Z'
  )$$,
  'the pre-revision Edge Function can schedule after the migration lands'
);
create temporary table transition_cancel as
select * from public.apply_push_schedule_operation(
  '10000000-0000-4000-8000-000000000026',
  '20000000-0000-4000-8000-000000000033',
  'cancel',
  null,
  '2026-08-30 10:05Z',
  1
);
select results_eq(
  $$select state from public.apply_push_schedule_operation(
    '10000000-0000-4000-8000-000000000026',
    '20000000-0000-4000-8000-000000000034',
    'schedule',
    '2026-08-30 11:00Z',
    '2026-08-30 10:06Z'
  )$$,
  array['cancelled'::text],
  'a delayed compatibility write returns the revision-aware authoritative state'
);
select is(
  (select status from public.push_schedules where device_id = '10000000-0000-4000-8000-000000000026'),
  'cancelled',
  'a delayed compatibility write cannot overwrite revision-aware state'
);

select * from finish();
rollback;
