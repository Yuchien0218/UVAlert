-- Atomic sync writes used by the four sync Edge Functions.
-- The Edge layer validates the full versioned payload before calling these
-- functions; this layer is still responsible for ownership, revision checks,
-- idempotent replay and all-or-nothing writes.

create or replace function public.commit_sync_batch(
  p_user_id uuid,
  p_idempotency_key text,
  p_records jsonb,
  p_tombstones jsonb,
  p_now timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  receipt_response jsonb;
  item jsonb;
  record_json jsonb;
  tombstone_json jsonb;
  record_kind text;
  record_id text;
  expected_revision bigint;
  current_revision bigint;
  incoming_revision bigint;
  committed_records jsonb := '[]'::jsonb;
  committed_tombstones jsonb := '[]'::jsonb;
  response jsonb;
begin
  if auth.uid() is null
     or auth.uid() <> p_user_id
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if jsonb_typeof(p_records) <> 'array'
     or jsonb_typeof(p_tombstones) <> 'array' then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;

  select response
    into receipt_response
    from public.sync_idempotency_receipts
   where user_id = p_user_id
     and operation = 'commit'
     and idempotency_key = p_idempotency_key;
  if receipt_response is not null then
    return receipt_response;
  end if;

  -- Preflight every revision before modifying either table.  This function is
  -- a single transaction, so a conflict aborts the entire batch.
  for item in select value from jsonb_array_elements(p_records)
  loop
    record_json := item -> 'record';
    record_kind := record_json ->> 'recordKind';
    record_id := record_json ->> 'recordId';
    incoming_revision := (record_json ->> 'revision')::bigint;
    expected_revision := nullif(item ->> 'expectedRevision', '')::bigint;

    select revision
      into current_revision
      from public.sync_records
     where user_id = p_user_id
       and sync_records.record_kind = record_kind
       and sync_records.record_id = record_id
     for update;
    if current_revision is null then
      select revision
        into current_revision
        from public.sync_tombstones
       where user_id = p_user_id
         and sync_tombstones.record_kind = record_kind
         and sync_tombstones.record_id = record_id
       for update;
    end if;

    if (expected_revision is null and current_revision is not null)
       or (expected_revision is not null
           and coalesce(expected_revision, 0) <> coalesce(current_revision, 0)) then
      raise exception 'SYNC_CONFLICT' using errcode = '40001';
    end if;
    if incoming_revision is null
       or incoming_revision <= coalesce(current_revision, 0) then
      raise exception 'SYNC_CONFLICT' using errcode = '40001';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_tombstones)
  loop
    tombstone_json := item -> 'tombstone';
    record_kind := tombstone_json ->> 'recordKind';
    record_id := tombstone_json ->> 'recordId';
    incoming_revision := (tombstone_json ->> 'revision')::bigint;
    expected_revision := nullif(item ->> 'expectedRevision', '')::bigint;

    select revision
      into current_revision
      from public.sync_records
     where user_id = p_user_id
       and sync_records.record_kind = record_kind
       and sync_records.record_id = record_id
     for update;
    if current_revision is null then
      select revision
        into current_revision
        from public.sync_tombstones
       where user_id = p_user_id
         and sync_tombstones.record_kind = record_kind
         and sync_tombstones.record_id = record_id
       for update;
    end if;

    if (expected_revision is null and current_revision is not null)
       or (expected_revision is not null
           and coalesce(expected_revision, 0) <> coalesce(current_revision, 0)) then
      raise exception 'SYNC_CONFLICT' using errcode = '40001';
    end if;
    if incoming_revision is null
       or incoming_revision <= coalesce(current_revision, 0) then
      raise exception 'SYNC_CONFLICT' using errcode = '40001';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_records)
  loop
    record_json := item -> 'record';
    record_kind := record_json ->> 'recordKind';
    record_id := record_json ->> 'recordId';
    delete from public.sync_tombstones
     where user_id = p_user_id
       and sync_tombstones.record_kind = record_kind
       and sync_tombstones.record_id = record_id;

    insert into public.sync_records (
      user_id, record_kind, record_id, schema_version, revision,
      payload_fingerprint, payload, created_at, updated_at
    ) values (
      p_user_id,
      record_kind,
      record_id,
      record_json ->> 'schemaVersion',
      (record_json ->> 'revision')::bigint,
      record_json ->> 'payloadFingerprint',
      record_json -> 'payload',
      p_now,
      p_now
    )
    on conflict (user_id, record_kind, record_id) do update set
      schema_version = excluded.schema_version,
      revision = excluded.revision,
      payload_fingerprint = excluded.payload_fingerprint,
      payload = excluded.payload,
      updated_at = excluded.updated_at;

    committed_records := committed_records || jsonb_build_array(
      jsonb_build_object(
        'recordKind', record_kind,
        'recordId', record_id,
        'schemaVersion', 'sync-v1',
        'revision', (record_json ->> 'revision')::bigint,
        'payloadFingerprint', record_json ->> 'payloadFingerprint',
        'updatedAt', to_char(p_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
    );
  end loop;

  for item in select value from jsonb_array_elements(p_tombstones)
  loop
    tombstone_json := item -> 'tombstone';
    record_kind := tombstone_json ->> 'recordKind';
    record_id := tombstone_json ->> 'recordId';
    delete from public.sync_records
     where user_id = p_user_id
       and sync_records.record_kind = record_kind
       and sync_records.record_id = record_id;

    insert into public.sync_tombstones (
      user_id, record_kind, record_id, schema_version, revision,
      deleted_at, created_at, updated_at
    ) values (
      p_user_id,
      record_kind,
      record_id,
      tombstone_json ->> 'schemaVersion',
      (tombstone_json ->> 'revision')::bigint,
      (tombstone_json ->> 'deletedAt')::timestamptz,
      p_now,
      p_now
    )
    on conflict (user_id, record_kind, record_id) do update set
      schema_version = excluded.schema_version,
      revision = excluded.revision,
      deleted_at = excluded.deleted_at,
      updated_at = excluded.updated_at;

    committed_tombstones := committed_tombstones || jsonb_build_array(
      jsonb_build_object(
        'recordKind', record_kind,
        'recordId', record_id,
        'schemaVersion', 'sync-v1',
        'revision', (tombstone_json ->> 'revision')::bigint,
        'deletedAt', tombstone_json ->> 'deletedAt'
      )
    );
  end loop;

  response := jsonb_build_object(
    'schemaVersion', 'sync-v1',
    'committedRecords', committed_records,
    'committedTombstones', committed_tombstones,
    'committedAt', to_char(p_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  insert into public.sync_idempotency_receipts (
    user_id, operation, idempotency_key, response, created_at
  ) values (p_user_id, 'commit', p_idempotency_key, response, p_now);
  return response;
end;
$$;

create or replace function public.delete_sync_batch(
  p_user_id uuid,
  p_idempotency_key text,
  p_records jsonb,
  p_now timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  receipt_response jsonb;
  item jsonb;
  key_json jsonb;
  record_kind text;
  record_id text;
  expected_revision bigint;
  current_revision bigint;
  next_revision bigint;
  committed_tombstones jsonb := '[]'::jsonb;
  response jsonb;
begin
  if auth.uid() is null
     or auth.uid() <> p_user_id
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_records) <> 'array' then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;

  select response
    into receipt_response
    from public.sync_idempotency_receipts
   where user_id = p_user_id
     and operation = 'delete'
     and idempotency_key = p_idempotency_key;
  if receipt_response is not null then
    return receipt_response;
  end if;

  for item in select value from jsonb_array_elements(p_records)
  loop
    key_json := item -> 'key';
    record_kind := key_json ->> 'recordKind';
    record_id := key_json ->> 'recordId';
    expected_revision := (item ->> 'expectedRevision')::bigint;
    select revision
      into current_revision
      from public.sync_records
     where user_id = p_user_id
       and sync_records.record_kind = record_kind
       and sync_records.record_id = record_id
     for update;
    if current_revision is null or current_revision <> expected_revision then
      raise exception 'SYNC_CONFLICT' using errcode = '40001';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_records)
  loop
    key_json := item -> 'key';
    record_kind := key_json ->> 'recordKind';
    record_id := key_json ->> 'recordId';
    expected_revision := (item ->> 'expectedRevision')::bigint;
    next_revision := expected_revision + 1;
    delete from public.sync_records
     where user_id = p_user_id
       and sync_records.record_kind = record_kind
       and sync_records.record_id = record_id;
    insert into public.sync_tombstones (
      user_id, record_kind, record_id, schema_version, revision,
      deleted_at, created_at, updated_at
    ) values (
      p_user_id, record_kind, record_id, 'sync-v1', next_revision,
      p_now, p_now, p_now
    )
    on conflict (user_id, record_kind, record_id) do update set
      schema_version = excluded.schema_version,
      revision = excluded.revision,
      deleted_at = excluded.deleted_at,
      updated_at = excluded.updated_at;
    committed_tombstones := committed_tombstones || jsonb_build_array(
      jsonb_build_object(
        'recordKind', record_kind,
        'recordId', record_id,
        'schemaVersion', 'sync-v1',
        'revision', next_revision,
        'deletedAt', to_char(p_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
    );
  end loop;

  response := jsonb_build_object(
    'schemaVersion', 'sync-v1',
    'committedTombstones', committed_tombstones,
    'committedAt', to_char(p_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  insert into public.sync_idempotency_receipts (
    user_id, operation, idempotency_key, response, created_at
  ) values (p_user_id, 'delete', p_idempotency_key, response, p_now);
  return response;
end;
$$;

grant execute on function public.commit_sync_batch(uuid, text, jsonb, jsonb, timestamptz)
  to authenticated;
grant execute on function public.delete_sync_batch(uuid, text, jsonb, timestamptz)
  to authenticated;
