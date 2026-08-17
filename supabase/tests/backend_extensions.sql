begin;

select plan(7);

select has_column(
  'public',
  'feedback_submissions',
  'dedupe_hash',
  'feedback dedupe hash exists'
);
select has_index(
  'public',
  'feedback_submissions',
  'feedback_submissions_dedupe_hash_idx',
  'feedback dedupe unique index exists'
);
select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'commit_sync_batch'
      and pronargs = 5
  ),
  'atomic sync commit function exists'
);
select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'delete_sync_batch'
      and pronargs = 4
  ),
  'atomic sync delete function exists'
);
select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'delete_uvalert_sync_data'
      and prosecdef
  ),
  'account data delete function is security definer'
);
select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'uv_forecast_cache'
      and roles && array['anon'::name, 'authenticated'::name]
  ),
  'forecast cache has no browser policies'
);
select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_submissions'
      and roles && array['anon'::name, 'authenticated'::name]
  ),
  'feedback has no browser policies'
);

select * from finish();
rollback;
