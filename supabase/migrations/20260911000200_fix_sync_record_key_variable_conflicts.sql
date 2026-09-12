-- The sync functions also compare local record key variables with columns that
-- have the same names. Rename those locals in the deployed definitions so a
-- non-empty sync batch can execute without PL/pgSQL ambiguity errors.

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

    corrected_definition := replace(original_definition, 'record_kind text;', 'v_record_kind text;');
    corrected_definition := replace(corrected_definition, 'record_id text;', 'v_record_id text;');
    corrected_definition := replace(corrected_definition, 'record_kind :=', 'v_record_kind :=');
    corrected_definition := replace(corrected_definition, 'record_id :=', 'v_record_id :=');
    corrected_definition := replace(corrected_definition, '= record_kind', '= v_record_kind');
    corrected_definition := replace(corrected_definition, '= record_id', '= v_record_id');
    corrected_definition := replace(corrected_definition, E'      record_kind,\n      record_id,', E'      v_record_kind,\n      v_record_id,');
    corrected_definition := replace(corrected_definition, E'p_user_id, record_kind, record_id,', E'p_user_id, v_record_kind, v_record_id,');
    corrected_definition := replace(corrected_definition, E'''recordKind'', record_kind', E'''recordKind'', v_record_kind');
    corrected_definition := replace(corrected_definition, E'''recordId'', record_id', E'''recordId'', v_record_id');

    if corrected_definition = original_definition then
      raise exception 'Expected sync record key variables were not found in %', target_function;
    end if;

    execute corrected_definition;
  end loop;
end;
$$;
