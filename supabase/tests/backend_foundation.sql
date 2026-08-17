begin;

select plan(23);

select has_table('public', 'sync_records', 'sync_records exists');
select has_table('public', 'sync_tombstones', 'sync_tombstones exists');
select has_table('public', 'sync_idempotency_receipts', 'idempotency receipts exist');
select has_table('public', 'uv_forecast_cache', 'uv_forecast_cache exists');
select has_table('public', 'feedback_submissions', 'feedback_submissions exists');

select has_column('public', 'sync_records', 'payload', 'sync_records payload exists');
select has_column('public', 'sync_records', 'revision', 'sync_records revision exists');
select has_column('public', 'sync_tombstones', 'deleted_at', 'tombstone deleted_at exists');
select has_column('public', 'feedback_submissions', 'contact_email', 'feedback contact email exists');

select has_index('public', 'sync_records', 'sync_records_user_updated_at_idx', 'sync records updated index exists');
select has_index('public', 'sync_tombstones', 'sync_tombstones_user_deleted_at_idx', 'tombstones deleted index exists');
select has_index('public', 'feedback_submissions', 'feedback_submissions_created_status_idx', 'feedback created/status index exists');

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sync_records'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) like '%user_id, record_kind, record_id%'
  ),
  'sync_records has composite primary key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sync_tombstones'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) like '%user_id, record_kind, record_id%'
  ),
  'sync_tombstones has composite primary key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sync_records'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like '%REFERENCES auth.users%'
  ),
  'sync_records references auth.users'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sync_tombstones'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like '%REFERENCES auth.users%'
  ),
  'sync_tombstones references auth.users'
);

select ok((select relrowsecurity from pg_class where oid = 'public.sync_records'::regclass), 'sync_records RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.sync_tombstones'::regclass), 'sync_tombstones RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.uv_forecast_cache'::regclass), 'forecast cache RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.feedback_submissions'::regclass), 'feedback RLS enabled');

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sync_records' and policyname = 'sync_records_select_own'),
  'sync_records own-row select policy exists'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sync_tombstones' and policyname = 'sync_tombstones_select_own'),
  'sync_tombstones own-row select policy exists'
);
select ok(
  not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'feedback_submissions' and roles @> array['anon'::name]),
  'feedback has no anon RLS policy'
);

select * from finish();
rollback;
