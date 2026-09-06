-- Sync tables are queried by authenticated Edge Function requests through
-- PostgREST. RLS controls which rows are visible; these grants provide the
-- separate table-level capability required before RLS can be evaluated.

revoke all on table public.sync_records from public, anon, authenticated;
revoke all on table public.sync_tombstones from public, anon, authenticated;
revoke all on table public.sync_idempotency_receipts from public, anon, authenticated;

grant select, insert, update, delete on table public.sync_records to authenticated;
grant select, insert, update, delete on table public.sync_tombstones to authenticated;
grant select, insert, update, delete on table public.sync_idempotency_receipts to authenticated;
