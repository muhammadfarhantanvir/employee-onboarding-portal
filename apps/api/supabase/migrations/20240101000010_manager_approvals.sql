-- ═══════════════════════════════════════════════════════════════
-- Migration 0010: Manager Approval Workflow
-- ═══════════════════════════════════════════════════════════════

-- ── Phase approvals (manager signs off per phase) ────────────────
create table if not exists public.phase_approvals (
  id            uuid primary key default gen_random_uuid(),
  hire_id       uuid not null references public.hires(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  manager_id    uuid not null references public.users(id) on delete cascade,
  phase         varchar(30) not null,
  approved_at   timestamptz not null default now(),
  note          text,
  constraint phase_approvals_phase_check check (
    phase in ('pre_boarding', 'week_1', 'month_1', 'month_3')
  ),
  constraint phase_approvals_hire_phase_unique unique (hire_id, phase)
);

-- ── Manager notes on hires (private, not visible to new hire) ────
create table if not exists public.manager_notes (
  id          uuid primary key default gen_random_uuid(),
  hire_id     uuid not null references public.hires(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  manager_id  uuid not null references public.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Document re-upload requests ───────────────────────────────────
create table if not exists public.document_reupload_requests (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  hire_id      uuid not null references public.hires(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  requested_by uuid not null references public.users(id) on delete cascade,
  reason       text not null,
  status       varchar(20) not null default 'pending',
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint reupload_status_check check (
    status in ('pending', 'fulfilled', 'cancelled')
  )
);

-- Indexes
create index if not exists idx_phase_approvals_hire     on public.phase_approvals(hire_id);
create index if not exists idx_phase_approvals_manager  on public.phase_approvals(manager_id);
create index if not exists idx_manager_notes_hire       on public.manager_notes(hire_id);
create index if not exists idx_manager_notes_manager    on public.manager_notes(manager_id);
create index if not exists idx_reupload_requests_hire   on public.document_reupload_requests(hire_id);
create index if not exists idx_reupload_requests_doc    on public.document_reupload_requests(document_id);

-- RLS
alter table public.phase_approvals             enable row level security;
alter table public.manager_notes               enable row level security;
alter table public.document_reupload_requests  enable row level security;

-- Policies
create policy "phase_approvals_manager_all" on public.phase_approvals for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role in ('manager','hr_admin'))
  );

create policy "manager_notes_manager_all" on public.manager_notes for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role in ('manager','hr_admin'))
  );

create policy "reupload_requests_manager_all" on public.document_reupload_requests for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role in ('manager','hr_admin'))
  );
