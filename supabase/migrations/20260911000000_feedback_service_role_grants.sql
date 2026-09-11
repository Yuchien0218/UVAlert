-- The public feedback Edge Function uses the service role to deduplicate and
-- insert anonymous submissions. Keep browsers blocked while granting only the
-- two table operations that the Function performs.
grant select, insert on table public.feedback_submissions to service_role;
revoke update, delete on table public.feedback_submissions from service_role;
