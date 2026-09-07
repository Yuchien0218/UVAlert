begin;

select plan(85);

select has_table('public', 'privacy_digest_batches', 'private digest batch exists');
select has_table('public', 'privacy_digest_items', 'private digest item exists');
select has_function(
  'public',
  'claim_privacy_digest',
  array['timestamp with time zone'],
  'claim RPC exists'
);
select has_function(
  'public',
  'settle_privacy_digest',
  array['uuid', 'uuid', 'text', 'timestamp with time zone', 'text', 'text'],
  'settle RPC exists'
);
select has_function(
  'public',
  'cleanup_private_privacy_digest',
  array['timestamp with time zone'],
  'cleanup RPC exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.privacy_digest_batches'::regclass),
  'digest batches use RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.privacy_digest_items'::regclass),
  'digest items use RLS'
);

select table_privs_are(
  'public',
  'privacy_digest_batches',
  'anon',
  array[]::text[],
  'anon has no digest batch privilege'
);
select table_privs_are(
  'public',
  'privacy_digest_batches',
  'authenticated',
  array[]::text[],
  'authenticated has no digest batch privilege'
);
select table_privs_are(
  'public',
  'privacy_digest_items',
  'anon',
  array[]::text[],
  'anon has no digest item privilege'
);
select table_privs_are(
  'public',
  'privacy_digest_items',
  'authenticated',
  array[]::text[],
  'authenticated has no digest item privilege'
);

select function_privs_are(
  'public',
  'claim_privacy_digest',
  array['timestamp with time zone'],
  'service_role',
  array['EXECUTE'],
  'only service role executes claim'
);
select function_privs_are(
  'public',
  'settle_privacy_digest',
  array['uuid', 'uuid', 'text', 'timestamp with time zone', 'text', 'text'],
  'service_role',
  array['EXECUTE'],
  'only service role executes settlement'
);
select function_privs_are(
  'public',
  'cleanup_private_privacy_digest',
  array['timestamp with time zone'],
  'service_role',
  array['EXECUTE'],
  'only service role executes cleanup'
);

select ok(
  not has_function_privilege('anon', 'public.claim_privacy_digest(timestamptz)', 'execute'),
  'anon cannot claim digest'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_privacy_digest(timestamptz)', 'execute'),
  'authenticated cannot claim digest'
);
select ok(
  not has_function_privilege('anon', 'public.settle_privacy_digest(uuid,uuid,text,timestamptz,text,text)', 'execute'),
  'anon cannot settle digest'
);
select ok(
  not has_function_privilege('authenticated', 'public.settle_privacy_digest(uuid,uuid,text,timestamptz,text,text)', 'execute'),
  'authenticated cannot settle digest'
);
select ok(
  not has_function_privilege('anon', 'public.cleanup_private_privacy_digest(timestamptz)', 'execute'),
  'anon cannot clean up digest data'
);
select ok(
  not has_function_privilege('authenticated', 'public.cleanup_private_privacy_digest(timestamptz)', 'execute'),
  'authenticated cannot clean up digest data'
);

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values
  (
    '41000000-0000-4000-8000-000000000001', 'privacy_request',
    'Please remove my anonymous submission.', null, '1.0.0', '/privacy',
    null, 'new', '2026-09-07 00:30Z', '2026-09-07 00:30Z'
  ),
  (
    '41000000-0000-4000-8000-000000000002', 'bug',
    'A non-privacy report must never enter the digest.', 'bug@example.test', '1.0.0', '/feedback',
    null, 'new', '2026-09-07 00:31Z', '2026-09-07 00:31Z'
  );

create temporary table first_privacy_claim as
select * from public.claim_privacy_digest('2026-09-07 01:00Z');

select is((select count(*) from first_privacy_claim), 1::bigint, 'claim returns one privacy request');
select is(
  (select feedback_id from first_privacy_claim),
  '41000000-0000-4000-8000-000000000001'::uuid,
  'claim excludes non-privacy feedback'
);
select is(
  (select message from first_privacy_claim),
  'Please remove my anonymous submission.',
  'claim returns the privacy request message'
);
select is((select contact_email from first_privacy_claim), null::text, 'claim preserves a missing contact email');
select is((select digest_date from first_privacy_claim), '2026-09-07'::date, 'claim uses the Taiwan calendar date');
select ok((select claim_token is not null from first_privacy_claim), 'claim returns a token');

select is(
  (select count(*) from public.claim_privacy_digest('2026-09-07 01:01Z')),
  0::bigint,
  'an active claim cannot be claimed concurrently'
);

create temporary table reclaimed_privacy as
select * from public.claim_privacy_digest('2026-09-07 01:30:01Z');

select is((select count(*) from reclaimed_privacy), 1::bigint, 'a claim older than 30 minutes is reclaimed');
select isnt(
  (select claim_token from reclaimed_privacy),
  (select claim_token from first_privacy_claim),
  'a reclaimed batch receives a new token'
);
select ok(
  not public.settle_privacy_digest(
    (select batch_id from first_privacy_claim),
    (select claim_token from first_privacy_claim),
    'sent',
    '2026-09-07 01:30:02Z',
    'provider-stale',
    null
  ),
  'a stale claim token cannot settle the batch'
);
select ok(
  public.settle_privacy_digest(
    (select batch_id from reclaimed_privacy),
    (select claim_token from reclaimed_privacy),
    'retry',
    '2026-09-07 01:30:03Z',
    null,
    'PROVIDER_TEMPORARY'
  ),
  'the current claim can be returned for retry'
);
select ok(
  (select status = 'pending' and claim_token is null
   from public.privacy_digest_batches
   where id = (select batch_id from reclaimed_privacy)),
  'retry clears claim ownership and restores pending status'
);

create temporary table retried_privacy as
select * from public.claim_privacy_digest('2026-09-07 01:31Z');

select is((select count(*) from retried_privacy), 1::bigint, 'a retry batch can be claimed again');
select throws_ok(
  format(
    'select public.settle_privacy_digest(%L::uuid, %L::uuid, ''sent'', ''2026-09-07 01:31:01Z'', ''   '', null)',
    (select batch_id from retried_privacy),
    (select claim_token from retried_privacy)
  ),
  '22023',
  'sent outcome requires p_provider_message_id',
  'sent rejects a blank provider message id'
);
select ok(
  public.settle_privacy_digest(
    (select batch_id from retried_privacy),
    (select claim_token from retried_privacy),
    'sent',
    '2026-09-07 01:31:02Z',
    'provider-message-1',
    null
  ),
  'the current claim can be settled as sent'
);
select is(
  (select provider_message_id from public.privacy_digest_batches where id = (select batch_id from retried_privacy)),
  'provider-message-1',
  'sent settlement stores the provider message id'
);
select is(
  (select count(*) from public.claim_privacy_digest('2026-09-07 01:32Z')),
  0::bigint,
  'a sent batch cannot be claimed again'
);
select ok(
  not public.settle_privacy_digest(
    (select batch_id from retried_privacy),
    (select claim_token from retried_privacy),
    'sent',
    '2026-09-07 01:32:01Z',
    'provider-message-duplicate',
    null
  ),
  'a settled token cannot settle twice'
);

create temporary table empty_privacy_claim as
select * from public.claim_privacy_digest('2026-09-08 01:00Z');

select is((select count(*) from empty_privacy_claim), 0::bigint, 'an empty privacy queue returns no rows');
select is(
  (select count(*) from public.privacy_digest_batches),
  1::bigint,
  'an empty privacy queue does not create a batch'
);

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values
  (
    '41000000-0000-4000-8000-000000000003', 'privacy_request',
    'Old privacy request.', 'old@example.test', '1.0.0', '/privacy',
    null, 'new', '2026-06-07 00:00Z', '2026-06-07 00:00Z'
  ),
  (
    '41000000-0000-4000-8000-000000000004', 'bug',
    'Old bug report.', null, '1.0.0', '/feedback',
    null, 'new', '2026-06-07 00:00Z', '2026-06-07 00:00Z'
  ),
  (
    '41000000-0000-4000-8000-000000000005', 'privacy_request',
    'Privacy request exactly at the retention boundary.', null, '1.0.0', '/privacy',
    null, 'new', '2026-06-09 01:00Z', '2026-06-09 01:00Z'
  );
insert into public.privacy_digest_batches (
  id, digest_date, status, created_at, updated_at
) values (
  '42000000-0000-4000-8000-000000000001', '2026-06-07', 'sent',
  '2026-06-07 01:00Z', '2026-06-07 01:00Z'
);
insert into public.privacy_digest_items (batch_id, feedback_id) values (
  '42000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000003'
);

select is(
  public.cleanup_private_privacy_digest('2026-09-07 01:00Z'),
  1,
  'cleanup reports one privacy request removed after 90 days'
);
select ok(
  not exists (select 1 from public.feedback_submissions where id = '41000000-0000-4000-8000-000000000003'),
  'cleanup removes privacy requests older than 90 days'
);
select ok(
  exists (select 1 from public.feedback_submissions where id = '41000000-0000-4000-8000-000000000004'),
  'cleanup preserves old non-privacy feedback'
);
select ok(
  exists (select 1 from public.feedback_submissions where id = '41000000-0000-4000-8000-000000000005'),
  'cleanup preserves privacy requests exactly 90 days old'
);
select ok(
  not exists (select 1 from public.privacy_digest_items where feedback_id = '41000000-0000-4000-8000-000000000003'),
  'feedback cleanup cascades to digest items'
);
select ok(
  not exists (select 1 from public.privacy_digest_batches where id = '42000000-0000-4000-8000-000000000001'),
  'cleanup removes an empty expired digest batch'
);
select is(
  public.cleanup_private_privacy_digest('2026-09-07 01:00Z'),
  0,
  'cleanup is idempotent'
);

select is(
  (select count(*) from cron.job where jobname = 'uvalert-privacy-digest'),
  1::bigint,
  'privacy digest Cron exists exactly once'
);
select is(
  (select count(*) from cron.job where jobname = 'uvalert-privacy-digest-cleanup'),
  1::bigint,
  'privacy digest cleanup Cron exists exactly once'
);
select is(
  (select schedule from cron.job where jobname = 'uvalert-privacy-digest'),
  '0 1 * * *',
  'privacy digest Cron runs daily at 09:00 Taiwan time'
);
select is(
  (select schedule from cron.job where jobname = 'uvalert-privacy-digest-cleanup'),
  '17 1 * * *',
  'privacy digest cleanup Cron runs daily at 09:17 Taiwan time'
);
select ok(
  (select command like '%vault.decrypted_secrets%'
      and command like '%uvalert_project_url%'
      and command like '%uvalert_privacy_digest_secret%'
      and command like '%X-Privacy-Digest-Secret%'
      and command like '%/functions/v1/privacy-digest%'
   from cron.job where jobname = 'uvalert-privacy-digest'),
  'privacy digest Cron reads URL and secret from Vault at execution time'
);
select ok(
  (select command like '%cleanup_private_privacy_digest(now())%'
   from cron.job where jobname = 'uvalert-privacy-digest-cleanup'),
  'cleanup Cron calls private privacy digest cleanup'
);

select throws_ok(
  $$select public.claim_privacy_digest(null)$$,
  '22004',
  'p_now is required',
  'claim requires p_now'
);
select throws_ok(
  $$select public.cleanup_private_privacy_digest(null)$$,
  '22004',
  'p_now is required',
  'cleanup requires p_now'
);
select throws_ok(
  format(
    'select public.settle_privacy_digest(%L::uuid, %L::uuid, ''unknown'', ''2026-09-07 01:33Z'', null, null)',
    (select batch_id from retried_privacy),
    (select claim_token from retried_privacy)
  ),
  '22023',
  'unsupported settlement outcome',
  'settlement rejects an unsupported outcome'
);
select throws_ok(
  format(
    'select public.settle_privacy_digest(%L::uuid, %L::uuid, null, ''2026-09-07 01:33Z'', null, null)',
    (select batch_id from retried_privacy),
    (select claim_token from retried_privacy)
  ),
  '22023',
  'unsupported settlement outcome',
  'settlement rejects a missing outcome'
);

-- A retry keeps its batch identity across days, but the next claim reserves
-- the actual Taiwan send day so another digest cannot be sent that day.
delete from public.privacy_digest_batches;
delete from public.feedback_submissions where feedback_type = 'privacy_request';

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values (
  '43000000-0000-4000-8000-000000000001', 'privacy_request',
  'Cross-day retry request.', null, '1.0.0', '/privacy',
  null, 'new', '2026-10-01 00:30Z', '2026-10-01 00:30Z'
);

create temporary table cross_day_first_claim as
select * from public.claim_privacy_digest('2026-10-01 01:00Z');

select is((select count(*) from cross_day_first_claim), 1::bigint, 'cross-day fixture is initially claimed');
select ok(
  public.settle_privacy_digest(
    (select batch_id from cross_day_first_claim),
    (select claim_token from cross_day_first_claim),
    'retry',
    '2026-10-01 01:01Z',
    null,
    'PROVIDER_TEMPORARY'
  ),
  'cross-day fixture is returned for retry'
);

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values (
  '43000000-0000-4000-8000-000000000002', 'privacy_request',
  'Wait for the next daily digest.', null, '1.0.0', '/privacy',
  null, 'new', '2026-10-02 00:30Z', '2026-10-02 00:30Z'
);

create temporary table cross_day_retry_claim as
select * from public.claim_privacy_digest('2026-10-02 01:00Z');

select is((select count(*) from cross_day_retry_claim), 1::bigint, 'the historical retry is claimed on the next day');
select is(
  (select batch_id from cross_day_retry_claim),
  (select batch_id from cross_day_first_claim),
  'a cross-day retry preserves its batch identity'
);
select is(
  (select digest_date from cross_day_retry_claim),
  '2026-10-02'::date,
  'a cross-day retry reserves its actual Taiwan send day'
);
select ok(
  public.settle_privacy_digest(
    (select batch_id from cross_day_retry_claim),
    (select claim_token from cross_day_retry_claim),
    'sent',
    '2026-10-02 01:01Z',
    'provider-cross-day',
    null
  ),
  'the cross-day retry settles on its reserved send day'
);

create temporary table cross_day_second_claim as
select * from public.claim_privacy_digest('2026-10-02 01:02Z');

select is((select count(*) from cross_day_second_claim), 0::bigint, 'a sent cross-day retry blocks another digest that day');
select ok(
  not exists (
    select 1
    from public.privacy_digest_items
    where feedback_id = '43000000-0000-4000-8000-000000000002'
  ),
  'new privacy feedback remains unbatched after the daily send is used'
);

create temporary table next_day_waiting_claim as
select * from public.claim_privacy_digest('2026-10-03 01:00Z');

select is((select count(*) from next_day_waiting_claim), 1::bigint, 'waiting privacy feedback is claimable the following day');
select is(
  (select feedback_id from next_day_waiting_claim),
  '43000000-0000-4000-8000-000000000002'::uuid,
  'the following day claims the feedback that waited'
);

-- A historical retry and today's new work cannot both be claimed, including
-- the path that previously skipped the locked historical row.
delete from public.privacy_digest_batches;
delete from public.feedback_submissions where feedback_type = 'privacy_request';

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values
  (
    '43000000-0000-4000-8000-000000000003', 'privacy_request',
    'Historical retry wins today.', null, '1.0.0', '/privacy',
    null, 'new', '2026-10-01 00:30Z', '2026-10-01 00:30Z'
  ),
  (
    '43000000-0000-4000-8000-000000000004', 'privacy_request',
    'New work must wait.', null, '1.0.0', '/privacy',
    null, 'new', '2026-10-02 00:30Z', '2026-10-02 00:30Z'
  );
insert into public.privacy_digest_batches (
  id, digest_date, status, created_at, updated_at
) values (
  '44000000-0000-4000-8000-000000000001', '2026-10-01', 'pending',
  '2026-10-01 01:00Z', '2026-10-01 01:00Z'
);
insert into public.privacy_digest_items (batch_id, feedback_id) values (
  '44000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000003'
);

create temporary table historical_competing_claim as
select * from public.claim_privacy_digest('2026-10-02 01:00Z');

select is((select count(*) from historical_competing_claim), 1::bigint, 'historical retry is claimed before new work');
select is(
  (select feedback_id from historical_competing_claim),
  '43000000-0000-4000-8000-000000000003'::uuid,
  'historical retry keeps its original item'
);
select is(
  (select digest_date from historical_competing_claim),
  '2026-10-02'::date,
  'historical retry reserves today before returning'
);
select is(
  (select count(*) from public.claim_privacy_digest('2026-10-02 01:00:01Z')),
  0::bigint,
  'a competing invocation cannot create another batch today'
);
select ok(
  not exists (
    select 1
    from public.privacy_digest_items
    where feedback_id = '43000000-0000-4000-8000-000000000004'
  ),
  'competing new work remains unbatched'
);

-- Retention can remove the last item from a recently-created retry batch.
-- Cleanup and claim both prevent that empty batch from blocking new work.
delete from public.privacy_digest_batches;
delete from public.feedback_submissions where feedback_type = 'privacy_request';

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values
  (
    '43000000-0000-4000-8000-000000000005', 'privacy_request',
    'Expired item in a recent failed batch.', null, '1.0.0', '/privacy',
    null, 'new', '2026-06-01 00:00Z', '2026-06-01 00:00Z'
  ),
  (
    '43000000-0000-4000-8000-000000000006', 'privacy_request',
    'New request after retention.', null, '1.0.0', '/privacy',
    null, 'new', '2026-10-02 00:30Z', '2026-10-02 00:30Z'
  );
insert into public.privacy_digest_batches (
  id, digest_date, status, created_at, updated_at
) values (
  '44000000-0000-4000-8000-000000000002', '2026-10-01', 'pending',
  '2026-10-02 00:45Z', '2026-10-02 00:45Z'
);
insert into public.privacy_digest_items (batch_id, feedback_id) values (
  '44000000-0000-4000-8000-000000000002',
  '43000000-0000-4000-8000-000000000005'
);

select is(
  public.cleanup_private_privacy_digest('2026-10-02 01:00Z'),
  1,
  'retention removes the expired item from the recent failed batch'
);
select ok(
  not exists (
    select 1 from public.privacy_digest_batches
    where id = '44000000-0000-4000-8000-000000000002'
  ),
  'retention removes a recent pending batch after its last item is deleted'
);

create temporary table post_retention_claim as
select * from public.claim_privacy_digest('2026-10-02 01:01Z');

select is((select count(*) from post_retention_claim), 1::bigint, 'new privacy feedback remains claimable after retention');
select is(
  (select feedback_id from post_retention_claim),
  '43000000-0000-4000-8000-000000000006'::uuid,
  'claim returns the new privacy feedback after retention'
);

delete from public.privacy_digest_batches;
delete from public.feedback_submissions where feedback_type = 'privacy_request';

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values (
  '43000000-0000-4000-8000-000000000007', 'privacy_request',
  'Claim past empty batches.', null, '1.0.0', '/privacy',
  null, 'new', '2026-10-02 00:30Z', '2026-10-02 00:30Z'
);
insert into public.privacy_digest_batches (
  id, digest_date, status, claim_token, claimed_at, created_at, updated_at
) values
  (
    '44000000-0000-4000-8000-000000000003', '2026-09-30', 'pending',
    null, null, '2026-10-02 00:40Z', '2026-10-02 00:40Z'
  ),
  (
    '44000000-0000-4000-8000-000000000004', '2026-10-01', 'claimed',
    '45000000-0000-4000-8000-000000000001', '2026-10-02 00:20Z',
    '2026-10-02 00:40Z', '2026-10-02 00:40Z'
  );

create temporary table claim_past_empty_batches as
select * from public.claim_privacy_digest('2026-10-02 01:00Z');

select is((select count(*) from claim_past_empty_batches), 1::bigint, 'claim skips empty pending and stale batches');
select is(
  (select feedback_id from claim_past_empty_batches),
  '43000000-0000-4000-8000-000000000007'::uuid,
  'claim continues to eligible privacy feedback after empty batches'
);
select ok(
  not exists (
    select 1 from public.privacy_digest_batches
    where id = '44000000-0000-4000-8000-000000000003'
  ),
  'claim removes an empty pending batch'
);
select ok(
  not exists (
    select 1 from public.privacy_digest_batches
    where id = '44000000-0000-4000-8000-000000000004'
  ),
  'claim removes an empty stale claimed batch'
);

-- A claim that crosses midnight reserves the day on which it settles, and an
-- active historical lease blocks new work until it settles or becomes stale.
delete from public.privacy_digest_batches;
delete from public.feedback_submissions where feedback_type = 'privacy_request';

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values
  (
    '43000000-0000-4000-8000-000000000008', 'privacy_request',
    'Claimed before midnight.', null, '1.0.0', '/privacy',
    null, 'new', '2026-10-01 15:50Z', '2026-10-01 15:50Z'
  ),
  (
    '43000000-0000-4000-8000-000000000009', 'privacy_request',
    'Must wait after midnight settlement.', null, '1.0.0', '/privacy',
    null, 'new', '2026-10-01 16:01Z', '2026-10-01 16:01Z'
  );
insert into public.privacy_digest_batches (
  id, digest_date, status, claim_token, claimed_at, created_at, updated_at
) values (
  '44000000-0000-4000-8000-000000000005', '2026-10-01', 'claimed',
  '45000000-0000-4000-8000-000000000002', '2026-10-01 15:55Z',
  '2026-10-01 15:50Z', '2026-10-01 15:55Z'
);
insert into public.privacy_digest_items (batch_id, feedback_id) values (
  '44000000-0000-4000-8000-000000000005',
  '43000000-0000-4000-8000-000000000008'
);

select ok(
  public.settle_privacy_digest(
    '44000000-0000-4000-8000-000000000005',
    '45000000-0000-4000-8000-000000000002',
    'sent',
    '2026-10-01 16:05Z',
    'provider-after-midnight',
    null
  ),
  'a historical active claim can settle after Taiwan midnight'
);
select is(
  (select digest_date from public.privacy_digest_batches where id = '44000000-0000-4000-8000-000000000005'),
  '2026-10-02'::date,
  'settlement reserves its actual Taiwan send day'
);
select is(
  (select count(*) from public.claim_privacy_digest('2026-10-01 16:06Z')),
  0::bigint,
  'midnight settlement blocks another digest on its actual send day'
);

delete from public.privacy_digest_batches;
delete from public.feedback_submissions where feedback_type = 'privacy_request';

insert into public.feedback_submissions (
  id, feedback_type, message, contact_email, app_version, route,
  user_agent_summary, status, created_at, updated_at
) values
  (
    '43000000-0000-4000-8000-000000000010', 'privacy_request',
    'Active across Taiwan midnight.', null, '1.0.0', '/privacy',
    null, 'new', '2026-10-01 15:50Z', '2026-10-01 15:50Z'
  ),
  (
    '43000000-0000-4000-8000-000000000011', 'privacy_request',
    'Wait for the active historical lease.', null, '1.0.0', '/privacy',
    null, 'new', '2026-10-01 16:01Z', '2026-10-01 16:01Z'
  );
insert into public.privacy_digest_batches (
  id, digest_date, status, claim_token, claimed_at, created_at, updated_at
) values (
  '44000000-0000-4000-8000-000000000006', '2026-10-01', 'claimed',
  '45000000-0000-4000-8000-000000000003', '2026-10-01 15:55Z',
  '2026-10-01 15:50Z', '2026-10-01 15:55Z'
);
insert into public.privacy_digest_items (batch_id, feedback_id) values (
  '44000000-0000-4000-8000-000000000006',
  '43000000-0000-4000-8000-000000000010'
);

select is(
  (select count(*) from public.claim_privacy_digest('2026-10-01 16:05Z')),
  0::bigint,
  'an active historical lease blocks a new-day claim'
);
select ok(
  not exists (
    select 1
    from public.privacy_digest_items
    where feedback_id = '43000000-0000-4000-8000-000000000011'
  ),
  'new-day work remains unbatched while the historical lease is active'
);

select * from finish();
rollback;
