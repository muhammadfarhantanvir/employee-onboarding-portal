-- ═══════════════════════════════════════════════════════════════
-- Migration 0006: Workflow Jobs, Notifications & Email Log
-- ═══════════════════════════════════════════════════════════════

-- ── Notifications ────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  type        varchar(60) not null,
  title       varchar(300) not null,
  body        text,
  link        text,
  metadata    jsonb not null default '{}',
  is_read     boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  constraint notifications_type_check check (
    type in (
      'hire_invited',
      'hire_started',
      'hire_completed',
      'hire_at_risk',
      'hire_cancelled',
      'task_assigned',
      'task_due_soon',
      'task_overdue',
      'task_completed',
      'task_blocked',
      'doc_uploaded',
      'doc_approved',
      'doc_rejected',
      'approval_needed',
      'checkin_30_day',
      'checkin_90_day',
      'it_provisioning_needed',
      'reminder_sent'
    )
  )
);

-- ── Workflow jobs (scheduled / event-driven) ─────────────────────
create table if not exists public.workflow_jobs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  type          varchar(60) not null,
  status        varchar(20) not null default 'pending',
  payload       jsonb not null default '{}',
  scheduled_at  timestamptz not null,
  started_at    timestamptz,
  completed_at  timestamptz,
  failed_at     timestamptz,
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  last_error    text,
  created_at    timestamptz not null default now(),
  constraint workflow_jobs_status_check check (
    status in ('pending', 'running', 'completed', 'failed', 'cancelled')
  )
);

-- ── Email delivery log ───────────────────────────────────────────
create table if not exists public.email_log (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  recipient     varchar(255) not null,
  subject       varchar(500) not null,
  template      varchar(100) not null,
  status        varchar(20) not null default 'queued',
  provider_id   text,
  error         text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint email_log_status_check check (
    status in ('queued', 'sent', 'failed', 'bounced')
  )
);

-- Indexes
create index if not exists idx_notifications_user      on public.notifications(user_id, is_read);
create index if not exists idx_notifications_company   on public.notifications(company_id, created_at desc);
create index if not exists idx_workflow_jobs_scheduled on public.workflow_jobs(scheduled_at, status);
create index if not exists idx_workflow_jobs_company   on public.workflow_jobs(company_id, type);
create index if not exists idx_email_log_company       on public.email_log(company_id, created_at desc);

-- RLS
alter table public.notifications   enable row level security;
alter table public.workflow_jobs   enable row level security;
alter table public.email_log       enable row level security;
