-- Prevent a repeated browser submission from creating duplicate feedback rows.
-- The value is a SHA-256 digest of a hashed client fingerprint plus the
-- normalized public feedback fields; no raw IP or full user-agent is stored.
alter table public.feedback_submissions
  add column if not exists dedupe_hash text null
  check (dedupe_hash is null or length(btrim(dedupe_hash)) = 64);

create unique index if not exists feedback_submissions_dedupe_hash_idx
  on public.feedback_submissions (dedupe_hash)
  where dedupe_hash is not null;
