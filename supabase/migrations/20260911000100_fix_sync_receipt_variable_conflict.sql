-- Qualify the idempotency receipt lookup in the already-deployed atomic sync
-- functions. Their local `response` variable otherwise conflicts with the
-- table column of the same name and PostgreSQL rejects the first sync write.

do $$
declare
  target_function regprocedure;
  original_definition text;
  corrected_definition text;
begin
  foreach target_function in array array[
    'public.commit_sync_batch(uuid,text,jsonb,jsonb,timestamptz)'::regprocedure,
    'public.delete_sync_batch(uuid,text,jsonb,timestamptz)'::regprocedure
  ]
  loop
    select pg_get_functiondef(target_function)
      into original_definition;

    corrected_definition := replace(
      original_definition,
      E'  select response\n    into receipt_response\n    from public.sync_idempotency_receipts\n   where user_id = p_user_id\n     and operation = ',
      E'  select sync_receipt.response\n    into receipt_response\n    from public.sync_idempotency_receipts as sync_receipt\n   where sync_receipt.user_id = p_user_id\n     and sync_receipt.operation = '
    );
    corrected_definition := replace(
      corrected_definition,
      E'\n     and idempotency_key = p_idempotency_key;',
      E'\n     and sync_receipt.idempotency_key = p_idempotency_key;'
    );

    if corrected_definition = original_definition then
      raise exception 'Expected sync receipt lookup was not found in %', target_function;
    end if;

    execute corrected_definition;
  end loop;
end;
$$;
