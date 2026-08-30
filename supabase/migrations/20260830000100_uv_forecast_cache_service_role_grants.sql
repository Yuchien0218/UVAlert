-- The public UV forecast Edge Function owns this private cache through its
-- server-side key. RLS bypass alone does not grant table privileges.
grant select, insert, update on table public.uv_forecast_cache to service_role;
