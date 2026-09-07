-- Private batching and delivery bookkeeping for privacy-request digests.
-- Browser roles receive no table access; only service_role may execute the
-- security-definer RPC boundary below.

create table public.privacy_digest_batches (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null unique,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'sent')),
  claim_token uuid null,
  claimed_at timestamptz null,
  sent_at timestamptz null,
  provider_message_id text null,
  last_error_code text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.privacy_digest_items (
  batch_id uuid not null references public.privacy_digest_batches(id) on delete cascade,
  feedback_id uuid not null references public.feedback_submissions(id) on delete cascade,
  primary key (batch_id, feedback_id),
  unique (feedback_id)
);

alter table public.privacy_digest_batches enable row level security;
alter table public.privacy_digest_items enable row level security;

revoke all on table public.privacy_digest_batches, public.privacy_digest_items
  from public, anon, authenticated;

create or replace function public.claim_privacy_digest(p_now timestamptz)
returns table (
  batch_id uuid,
  claim_token uuid,
  digest_date date,
  feedback_id uuid,
  message text,
  contact_email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_batch_id uuid;
  v_claim_token uuid;
  v_digest_date date;
  v_item_count integer;
begin
  if p_now is null then
    raise exception 'p_now is required' using errcode = '22004';
  end if;

  v_digest_date := (p_now at time zone 'Asia/Taipei')::date;

  select batch.id
  into v_batch_id
  from public.privacy_digest_batches as batch
  where batch.status = 'pending'
    or (
      batch.status = 'claimed'
      and batch.claimed_at <= p_now - interval '30 minutes'
    )
  order by batch.digest_date, batch.created_at, batch.id
  for update of batch skip locked
  limit 1;

  if v_batch_id is null then
    if not exists (
      select 1
      from public.feedback_submissions as feedback
      where feedback.feedback_type = 'privacy_request'
        and not exists (
          select 1
          from public.privacy_digest_items as item
          where item.feedback_id = feedback.id
        )
    ) then
      return;
    end if;

    insert into public.privacy_digest_batches (digest_date, created_at, updated_at)
    values (v_digest_date, p_now, p_now)
    on conflict on constraint privacy_digest_batches_digest_date_key do nothing
    returning id into v_batch_id;

    -- A same-date batch can already be actively claimed or sent. In that case
    -- the remaining requests wait for the next Taiwan-calendar digest.
    if v_batch_id is null then
      return;
    end if;

    insert into public.privacy_digest_items (batch_id, feedback_id)
    select v_batch_id, feedback.id
    from public.feedback_submissions as feedback
    where feedback.feedback_type = 'privacy_request'
      and not exists (
        select 1
        from public.privacy_digest_items as item
        where item.feedback_id = feedback.id
      )
    order by feedback.created_at, feedback.id
    for update of feedback skip locked;

    get diagnostics v_item_count = row_count;
    if v_item_count = 0 then
      delete from public.privacy_digest_batches as batch
      where batch.id = v_batch_id;
      return;
    end if;
  end if;

  v_claim_token := gen_random_uuid();

  update public.privacy_digest_batches as batch
  set
    status = 'claimed',
    claim_token = v_claim_token,
    claimed_at = p_now,
    updated_at = p_now
  where batch.id = v_batch_id
    and (
      batch.status = 'pending'
      or (
        batch.status = 'claimed'
        and batch.claimed_at <= p_now - interval '30 minutes'
      )
    );

  if not found then
    return;
  end if;

  return query
  select
    batch.id,
    batch.claim_token,
    batch.digest_date,
    feedback.id,
    feedback.message,
    feedback.contact_email,
    feedback.created_at
  from public.privacy_digest_batches as batch
  join public.privacy_digest_items as item on item.batch_id = batch.id
  join public.feedback_submissions as feedback on feedback.id = item.feedback_id
  where batch.id = v_batch_id
    and batch.status = 'claimed'
    and batch.claim_token = v_claim_token
    and feedback.feedback_type = 'privacy_request'
  order by feedback.created_at, feedback.id;
end;
$$;

create or replace function public.settle_privacy_digest(
  p_batch_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_now timestamptz,
  p_provider_message_id text,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_now is null then
    raise exception 'p_now is required' using errcode = '22004';
  end if;

  if p_outcome is null or p_outcome not in ('sent', 'retry') then
    raise exception 'unsupported settlement outcome' using errcode = '22023';
  end if;

  if p_outcome = 'sent' and nullif(btrim(p_provider_message_id), '') is null then
    raise exception 'sent outcome requires p_provider_message_id' using errcode = '22023';
  end if;

  update public.privacy_digest_batches as batch
  set
    status = case when p_outcome = 'sent' then 'sent' else 'pending' end,
    claim_token = null,
    claimed_at = null,
    sent_at = case when p_outcome = 'sent' then p_now else null end,
    provider_message_id = case when p_outcome = 'sent' then p_provider_message_id else null end,
    last_error_code = case when p_outcome = 'retry' then p_error_code else null end,
    updated_at = p_now
  where batch.id = p_batch_id
    and batch.status = 'claimed'
    and batch.claim_token = p_claim_token;

  return found;
end;
$$;

create or replace function public.cleanup_private_privacy_digest(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted_feedback integer;
begin
  if p_now is null then
    raise exception 'p_now is required' using errcode = '22004';
  end if;

  delete from public.feedback_submissions as feedback
  where feedback.feedback_type = 'privacy_request'
    and feedback.created_at < p_now - interval '90 days';

  get diagnostics v_deleted_feedback = row_count;

  delete from public.privacy_digest_batches as batch
  where batch.created_at < p_now - interval '90 days'
    and not exists (
      select 1
      from public.privacy_digest_items as item
      where item.batch_id = batch.id
    );

  return v_deleted_feedback;
end;
$$;

revoke all on function public.claim_privacy_digest(timestamptz)
  from public, anon, authenticated;
revoke all on function public.settle_privacy_digest(uuid, uuid, text, timestamptz, text, text)
  from public, anon, authenticated;
revoke all on function public.cleanup_private_privacy_digest(timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_privacy_digest(timestamptz) to service_role;
grant execute on function public.settle_privacy_digest(uuid, uuid, text, timestamptz, text, text) to service_role;
grant execute on function public.cleanup_private_privacy_digest(timestamptz) to service_role;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname in ('uvalert-privacy-digest', 'uvalert-privacy-digest-cleanup')
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule('uvalert-privacy-digest', '0 1 * * *', $digest$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'uvalert_project_url') || '/functions/v1/privacy-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Privacy-Digest-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'uvalert_privacy_digest_secret')
    ), body := '{}'::jsonb
  );
$digest$);

select cron.schedule(
  'uvalert-privacy-digest-cleanup',
  '17 1 * * *',
  $$select public.cleanup_private_privacy_digest(now());$$
);

comment on table public.privacy_digest_batches is
  'Private service-role delivery state for daily privacy-request digests.';
comment on table public.privacy_digest_items is
  'Private links from privacy feedback to exactly one digest batch.';
