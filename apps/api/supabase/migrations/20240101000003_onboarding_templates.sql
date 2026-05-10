-- ═══════════════════════════════════════════════════════════════
-- Migration 0003: Onboarding Templates & Template Tasks
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name varchar(200) not null,
  description text,
  department varchar(100),
  is_default boolean not null default false,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.onboarding_templates(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title varchar(300) not null,
  description text,
  task_type varchar(30) not null default 'checkbox',
  phase varchar(30) not null default 'week_1',
  assigned_role varchar(30) not null default 'new_hire',
  due_day_offset integer not null default 0,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_tasks_task_type_check check (
    task_type in ('checkbox', 'document_upload', 'form_submission', 'acknowledgement', 'meeting')
  ),
  constraint template_tasks_phase_check check (
    phase in ('pre_boarding', 'week_1', 'month_1', 'month_3')
  ),
  constraint template_tasks_assigned_role_check check (
    assigned_role in ('hr_admin', 'manager', 'it_admin', 'new_hire')
  )
);

create index if not exists idx_onboarding_templates_company
  on public.onboarding_templates(company_id);

create index if not exists idx_template_tasks_template
  on public.template_tasks(template_id);

create index if not exists idx_template_tasks_company
  on public.template_tasks(company_id);

create index if not exists idx_template_tasks_sort
  on public.template_tasks(template_id, sort_order);

alter table public.onboarding_templates enable row level security;
alter table public.template_tasks enable row level security;
