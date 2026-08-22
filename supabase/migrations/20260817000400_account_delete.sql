-- The Edge Function calls this with the service role after validating the
-- permanent user's bearer token.  Keeping all UVAlert-owned deletes in one
-- database transaction prevents a partial sync-data purge.
create or replace function public.delete_uvalert_sync_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.sync_records where user_id = p_user_id;
  delete from public.sync_tombstones where user_id = p_user_id;
  delete from public.sync_idempotency_receipts where user_id = p_user_id;
end;
$$;

revoke all on function public.delete_uvalert_sync_data(uuid) from public;
grant execute on function public.delete_uvalert_sync_data(uuid) to service_role;
