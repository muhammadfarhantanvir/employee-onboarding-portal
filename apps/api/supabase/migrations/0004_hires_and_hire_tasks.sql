-- ═══════════════════════════════════════════════════════════════
-- Migration 0004: Hires & Hire Tasks
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.hires (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  user_id           uuid references public.users(id) on delete set null,
  manager_id        uuid references public.users(id) on delete set null,
  template_id       uuid references public.onboarding_templates(id) on delete set null,
  full_name         varchar(200) not null,
  email             varchar(255) not null,
  job_title         varchar(200),
  department        varchar(100),
  start_date        date not null,
  status            varchar(30) not null default 'pending_invite',
  completion_pct    integer not null default 0,
  invited_at        timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  notes             text,
  created_by        uuid references public.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint hires_status_check check (
    status in ('pending_invite', 'in_progress', 'at_risk', 'completed', 'cancelled')
  ),
  constraint hires_completion_pct_check check (
    completion_pct >= 0 and completion_pct <= 100
  ),
  constraint hires_company_email_unique unique (company_id, email)
);

create table if not exists public.hire_tasks (
  id              uuid primary key default gen_random_uuid(),
  hire_id         uuid not null references public.hires(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  template_task_id uuid references public.template_tasks(id) on delete set null,
  title           varchar(300) not null,
  description     text,
  task_type       varchar(30) not null default 'checkbox',
  phase           varchar(30) not null default 'week_1',
  assigned_role   varchar(30) not null default 'new_hire',
  assigned_to     uuid references public.users(id) on delete set null,
  due_date        date,
  status          varchar(30) not null default 'pending',
  is_required     boolean not null default true,
  sort_order      integer not null default 0,
  note            text,
  completed_at    timestamptz,
  skipped_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint hire_tasks_task_type_check check (
    task_type in ('checkbox', 'document_upload', 'form_submission', 'acknowledgement', 'meeting')
  ),
  constraint hire_tasks_phase_check check (
    phase in ('pre_boarding', 'week_1', 'month_1', 'month_3')
  ),
  constraint hire_tasks_assigned_role_check check (
    assigned_role in ('hr_admin', 'manager', 'it_admin', 'new_hire')
  ),
  constraint hire_tasks_status_check check (
    status in ('pending', 'in_progress', 'completed', 'skipped', 'blocked')
  )
);

-- Indexes
create index if not exists idx_hires_company        on public.hires(company_id);
create index if not exists idx_hires_status         on public.hires(company_id, status);
create index if not exists idx_hires_manager        on public.hires(manager_id);
create index if not exists idx_hires_start_date     on public.hires(company_id, start_date);
create index if not exists idx_hire_tasks_hire      on public.hire_tasks(hire_id);
create index if not exists idx_hire_tasks_company   on public.hire_tasks(company_id);
create index if not exists idx_hire_tasks_assigned  on public.hire_tasks(assigned_to);
create index if not exists idx_hire_tasks_status    on public.hire_tasks(hire_id, status);
create index if not exists idx_hire_tasks_phase     on public.hire_tasks(hire_id, phase);

-- RLS
alter table public.hires      enable row level security;
alter table public.hire_tasks enable row level security;
