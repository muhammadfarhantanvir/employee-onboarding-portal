-- ═══════════════════════════════════════════════════════════════
-- Migration 0011: GDPR Compliance
-- ═══════════════════════════════════════════════════════════════

-- ── Data access log (every document/hire access recorded) ────────
create table if not exists public.data_access_log (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  user_id       uuid references public.users(id) on delete set null,
  action        varchar(100) not null,
  entity_type   varchar(50) not null,
  entity_id     uuid,
  ip_address    inet,
  user_agent    text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  constraint data_access_log_action_check check (
    action in (
      'document.viewed', 'document.downloaded', 'document.uploaded',
      'document.approved', 'document.rejected', 'document.deleted',
      'hire.viewed', 'hire.exported', 'hire.anonymised',
      'data.exported', 'data.erasure_requested', 'data.erased'
    )
  )
);

-- ── Data erasure requests (right to erasure / right to be forgotten) ──
create table if not exists public.erasure_requests (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  hire_id         uuid references public.hires(id) on delete set null,
  requested_by    uuid references public.users(id) on delete set null,
  reason          text,
  status          varchar(20) not null default 'pending',
  processed_by    uuid references public.users(id) on delete set null,
  processed_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  constraint erasure_status_check check (
    status in ('pending', 'in_progress', 'completed', 'rejected')
  )
);

-- ── Privacy policy versions ───────────────────────────────────────
create table if not exists public.privacy_policy_versions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  version       varchar(20) not null,
  effective_at  date not null,
  content_url   text,
  is_current    boolean not null default false,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ── Privacy policy acknowledgements ──────────────────────────────
create table if not exists public.privacy_policy_acks (
  id          uuid primary key default gen_random_uuid(),
  policy_id   uuid not null references public.privacy_policy_versions(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  acked_at    timestamptz not null default now(),
  ip_address  inet,
  constraint privacy_policy_acks_unique unique (policy_id, user_id)
);

-- Indexes
create index if not exists idx_data_access_log_company  on public.data_access_log(company_id, created_at desc);
create index if not exists idx_data_access_log_user     on public.data_access_log(user_id);
create index if not exists idx_data_access_log_entity   on public.data_access_log(entity_type, entity_id);
create index if not exists idx_erasure_requests_company on public.erasure_requests(company_id, status);
create index if not exists idx_erasure_requests_hire    on public.erasure_requests(hire_id);
create index if not exists idx_privacy_policy_company   on public.privacy_policy_versions(company_id);
create index if not exists idx_privacy_policy_acks_user on public.privacy_policy_acks(user_id);

-- RLS
alter table public.data_access_log          enable row level security;
alter table public.erasure_requests         enable row level security;
alter table public.privacy_policy_versions  enable row level security;
alter table public.privacy_policy_acks      enable row level security;

-- Policies
create policy "data_access_log_hr_admin_read" on public.data_access_log for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "data_access_log_system_insert" on public.data_access_log for insert
  with check (true);

create policy "erasure_requests_hr_admin_all" on public.erasure_requests for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "erasure_requests_self_insert" on public.erasure_requests for insert
  with check (requested_by = auth.uid());

create policy "privacy_policy_company_read" on public.privacy_policy_versions for select
  using (company_id = (select company_id from public.users where id = auth.uid()));

create policy "privacy_policy_hr_admin_write" on public.privacy_policy_versions for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "privacy_policy_acks_self" on public.privacy_policy_acks for all
  using (user_id = auth.uid());
