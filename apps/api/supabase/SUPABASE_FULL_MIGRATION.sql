-- ═══════════════════════════════════════════════════════════════
-- EMPLOYEE ONBOARDING PORTAL — FULL SUPABASE MIGRATION
-- Paste this entire file into Supabase SQL Editor and click Run.
-- This creates all 18 tables, indexes, RLS policies, and demo data.
-- ═══════════════════════════════════════════════════════════════

-- ═══ 0001_company_workspaces.sql ═══
create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null,
  slug varchar(100) not null unique,
  domain varchar(255) not null unique,
  domain_verified_at timestamptz,
  pending_domain varchar(255),
  domain_verification_token_hash text,
  domain_verification_expires_at timestamptz,
  logo_url text,
  brand_color varchar(7) not null default '#0F172A',
  timezone varchar(100) not null default 'Europe/Berlin',
  locale varchar(10) not null default 'de-DE',
  plan varchar(20) not null default 'free',
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_plan_check check (plan in ('free', 'pro', 'enterprise')),
  constraint companies_locale_check check (locale in ('de-DE', 'en-GB'))
);

create table if not exists public.users (
  id uuid primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  email varchar(255) not null,
  full_name varchar(200) not null,
  role varchar(30) not null default 'new_hire',
  avatar_url text,
  department varchar(100),
  job_title varchar(200),
  phone varchar(50),
  is_active boolean not null default true,
  invited_by_user_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (
    role in ('hr_admin', 'manager', 'it_admin', 'new_hire', 'viewer')
  ),
  constraint users_company_email_unique unique (company_id, email)
);

create table if not exists public.company_invitations (
  token_hash text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  email varchar(255) not null,
  role varchar(30) not null,
  invited_by_user_id uuid not null references public.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint company_invitations_role_check check (
    role in ('hr_admin', 'manager', 'it_admin', 'new_hire', 'viewer')
  )
);

create table if not exists public.refresh_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.companies
  add constraint companies_owner_user_fk
  foreign key (owner_user_id)
  references public.users(id)
  deferrable initially deferred;

comment on table public.companies is
  'Tenant root table. companies.id is the company_id used by child tenant tables.';

create index if not exists idx_companies_slug on public.companies(slug);
create index if not exists idx_users_company on public.users(company_id);
create index if not exists idx_users_company_role on public.users(company_id, role);
create index if not exists idx_company_invitations_company
  on public.company_invitations(company_id);
create index if not exists idx_company_invitations_user
  on public.company_invitations(company_id, user_id);
create index if not exists idx_refresh_sessions_company
  on public.refresh_sessions(company_id);
create index if not exists idx_refresh_sessions_user
  on public.refresh_sessions(company_id, user_id);

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.company_invitations enable row level security;
alter table public.refresh_sessions enable row level security;

create or replace function public.jwt_company_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'company_id', '')::uuid
$$;

drop policy if exists companies_tenant_select on public.companies;
create policy companies_tenant_select on public.companies
  for select
  using (id = public.jwt_company_id());

drop policy if exists companies_tenant_update on public.companies;
create policy companies_tenant_update on public.companies
  for update
  using (id = public.jwt_company_id())
  with check (id = public.jwt_company_id());

drop policy if exists users_tenant_select on public.users;
create policy users_tenant_select on public.users
  for select
  using (company_id = public.jwt_company_id());

drop policy if exists users_tenant_insert on public.users;
create policy users_tenant_insert on public.users
  for insert
  with check (company_id = public.jwt_company_id());

drop policy if exists users_tenant_update on public.users;
create policy users_tenant_update on public.users
  for update
  using (company_id = public.jwt_company_id())
  with check (company_id = public.jwt_company_id());

drop policy if exists users_tenant_delete on public.users;
create policy users_tenant_delete on public.users
  for delete
  using (company_id = public.jwt_company_id());

drop policy if exists company_invitations_tenant_select on public.company_invitations;
create policy company_invitations_tenant_select on public.company_invitations
  for select
  using (company_id = public.jwt_company_id());

drop policy if exists company_invitations_tenant_insert on public.company_invitations;
create policy company_invitations_tenant_insert on public.company_invitations
  for insert
  with check (company_id = public.jwt_company_id());

drop policy if exists company_invitations_tenant_update on public.company_invitations;
create policy company_invitations_tenant_update on public.company_invitations
  for update
  using (company_id = public.jwt_company_id())
  with check (company_id = public.jwt_company_id());

drop policy if exists company_invitations_tenant_delete on public.company_invitations;
create policy company_invitations_tenant_delete on public.company_invitations
  for delete
  using (company_id = public.jwt_company_id());

drop policy if exists refresh_sessions_tenant_select on public.refresh_sessions;
create policy refresh_sessions_tenant_select on public.refresh_sessions
  for select
  using (company_id = public.jwt_company_id());

drop policy if exists refresh_sessions_tenant_insert on public.refresh_sessions;
create policy refresh_sessions_tenant_insert on public.refresh_sessions
  for insert
  with check (company_id = public.jwt_company_id());

drop policy if exists refresh_sessions_tenant_update on public.refresh_sessions;
create policy refresh_sessions_tenant_update on public.refresh_sessions
  for update
  using (company_id = public.jwt_company_id())
  with check (company_id = public.jwt_company_id());

drop policy if exists refresh_sessions_tenant_delete on public.refresh_sessions;
create policy refresh_sessions_tenant_delete on public.refresh_sessions
  for delete
  using (company_id = public.jwt_company_id());


-- ═══ 0003_onboarding_templates.sql ═══
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


-- ═══ 0004_hires_and_hire_tasks.sql ═══
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


-- ═══ 0005_documents.sql ═══
-- ═══════════════════════════════════════════════════════════════
-- Migration 0005: Document Vault & Management
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.documents (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  hire_id           uuid references public.hires(id) on delete cascade,
  hire_task_id      uuid references public.hire_tasks(id) on delete set null,
  uploaded_by       uuid references public.users(id) on delete set null,
  reviewed_by       uuid references public.users(id) on delete set null,

  -- File metadata
  name              varchar(300) not null,
  original_name     varchar(300) not null,
  file_path         text not null,          -- Supabase Storage object path
  file_size         bigint,                 -- bytes
  mime_type         varchar(100),
  checksum          varchar(64),            -- SHA-256 hex for integrity

  -- Classification
  category          varchar(50) not null default 'other',
  is_company_doc    boolean not null default false,  -- company template vs hire upload

  -- Versioning
  version           integer not null default 1,
  parent_id         uuid references public.documents(id) on delete set null,

  -- Review workflow
  status            varchar(30) not null default 'pending_review',
  reviewed_at       timestamptz,
  rejection_note    text,

  -- GDPR
  retention_until   date,
  gdpr_basis        varchar(100) default 'legitimate_interest',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint documents_category_check check (
    category in ('policy', 'contract', 'training', 'personal_id', 'tax_form', 'certificate', 'other')
  ),
  constraint documents_status_check check (
    status in ('pending_review', 'approved', 'rejected', 'superseded')
  )
);

create table if not exists public.document_acknowledgements (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references public.documents(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  hire_id          uuid references public.hires(id) on delete cascade,
  hire_task_id     uuid references public.hire_tasks(id) on delete set null,
  acknowledged_at  timestamptz not null default now(),
  ip_address       inet,
  user_agent       text,
  constraint doc_ack_unique unique (document_id, user_id)
);

-- Indexes
create index if not exists idx_documents_company      on public.documents(company_id);
create index if not exists idx_documents_hire         on public.documents(hire_id);
create index if not exists idx_documents_status       on public.documents(company_id, status);
create index if not exists idx_documents_category     on public.documents(company_id, category);
create index if not exists idx_documents_company_doc  on public.documents(company_id, is_company_doc);
create index if not exists idx_documents_parent       on public.documents(parent_id);
create index if not exists idx_doc_ack_document       on public.document_acknowledgements(document_id);
create index if not exists idx_doc_ack_user           on public.document_acknowledgements(user_id);

-- RLS
alter table public.documents                  enable row level security;
alter table public.document_acknowledgements  enable row level security;


-- ═══ 0006_workflow_notifications.sql ═══
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


-- ═══ 0007_it_checklists.sql ═══
-- ═══════════════════════════════════════════════════════════════
-- Migration 0007: IT Onboarding Checklists & Asset Tracking
-- ═══════════════════════════════════════════════════════════════

-- ── IT checklist templates (company-level, reusable) ────────────
create table if not exists public.it_checklist_templates (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         varchar(200) not null,
  description  text,
  is_default   boolean not null default false,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── IT checklist template items ──────────────────────────────────
create table if not exists public.it_checklist_template_items (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.it_checklist_templates(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  title        varchar(300) not null,
  description  text,
  category     varchar(50) not null default 'hardware',
  sort_order   integer not null default 0,
  is_required  boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint it_template_items_category_check check (
    category in ('hardware', 'software', 'access', 'communication', 'security', 'other')
  )
);

-- ── IT checklists (instantiated per hire) ────────────────────────
create table if not exists public.it_checklists (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  hire_id         uuid not null references public.hires(id) on delete cascade,
  template_id     uuid references public.it_checklist_templates(id) on delete set null,
  assigned_to     uuid references public.users(id) on delete set null,
  status          varchar(30) not null default 'pending',
  completion_pct  integer not null default 0,
  due_date        date,
  completed_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint it_checklists_status_check check (
    status in ('pending', 'in_progress', 'completed', 'blocked')
  ),
  constraint it_checklists_completion_check check (
    completion_pct >= 0 and completion_pct <= 100
  ),
  constraint it_checklists_hire_unique unique (hire_id)
);

-- ── IT checklist items (instantiated from template) ──────────────
create table if not exists public.it_checklist_items (
  id                   uuid primary key default gen_random_uuid(),
  checklist_id         uuid not null references public.it_checklists(id) on delete cascade,
  company_id           uuid not null references public.companies(id) on delete cascade,
  template_item_id     uuid references public.it_checklist_template_items(id) on delete set null,
  title                varchar(300) not null,
  description          text,
  category             varchar(50) not null default 'hardware',
  sort_order           integer not null default 0,
  is_required          boolean not null default true,
  status               varchar(30) not null default 'pending',
  note                 text,
  asset_tag            varchar(100),
  serial_number        varchar(100),
  completed_by         uuid references public.users(id) on delete set null,
  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint it_items_category_check check (
    category in ('hardware', 'software', 'access', 'communication', 'security', 'other')
  ),
  constraint it_items_status_check check (
    status in ('pending', 'in_progress', 'completed', 'skipped', 'blocked')
  )
);

-- Indexes
create index if not exists idx_it_templates_company    on public.it_checklist_templates(company_id);
create index if not exists idx_it_template_items_tpl   on public.it_checklist_template_items(template_id);
create index if not exists idx_it_checklists_company   on public.it_checklists(company_id);
create index if not exists idx_it_checklists_hire      on public.it_checklists(hire_id);
create index if not exists idx_it_checklists_assigned  on public.it_checklists(assigned_to);
create index if not exists idx_it_items_checklist      on public.it_checklist_items(checklist_id);
create index if not exists idx_it_items_status         on public.it_checklist_items(checklist_id, status);

-- RLS
alter table public.it_checklist_templates       enable row level security;
alter table public.it_checklist_template_items  enable row level security;
alter table public.it_checklists                enable row level security;
alter table public.it_checklist_items           enable row level security;


-- ═══ 0008_demo_seed.sql ═══
-- ═══════════════════════════════════════════════════════════════
-- Migration 0008: Demo Seed Data
-- Run this AFTER migrations 0001–0007 to populate pgAdmin with
-- the same data the in-memory API serves.
-- ═══════════════════════════════════════════════════════════════

-- ── Company ──────────────────────────────────────────────────────
insert into public.companies (
  id, name, slug, domain, domain_verified_at,
  logo_url, brand_color, timezone, locale, plan,
  owner_user_id, created_at, updated_at
) values (
  '11111111-1111-4111-8111-111111111111',
  'Demo Company', 'demo-company', 'demo-company.com', now(),
  null, '#0F172A', 'Europe/Berlin', 'de-DE', 'pro',
  '22222222-2222-4222-8222-222222222222', now(), now()
) on conflict (id) do nothing;

-- ── Users ─────────────────────────────────────────────────────────
-- Password hash is for 'Demo1234!' (PBKDF2, demo iterations=1)
insert into public.users (
  id, company_id, email, full_name, role,
  is_active, created_at, updated_at
) values
  ('22222222-2222-4222-8222-222222222222',
   '11111111-1111-4111-8111-111111111111',
   'hr@demo-company.com', 'Harriet Admin', 'hr_admin', true, now(), now()),
  ('33333333-3333-4333-8333-333333333333',
   '11111111-1111-4111-8111-111111111111',
   'manager@demo-company.com', 'Marta Manager', 'manager', true, now(), now()),
  ('44444444-4444-4444-8444-444444444444',
   '11111111-1111-4111-8111-111111111111',
   'it@demo-company.com', 'Ivan IT', 'it_admin', true, now(), now()),
  ('55555555-5555-4555-8555-555555555555',
   '11111111-1111-4111-8111-111111111111',
   'newhire@demo-company.com', 'Nina Newhire', 'new_hire', true, now(), now())
on conflict (id) do nothing;

-- ── Onboarding Templates ──────────────────────────────────────────
insert into public.onboarding_templates (
  id, company_id, name, description, department, is_default, created_by, created_at, updated_at
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'Software Engineer', 'Standard onboarding for engineering hires',
   'Engineering', true,
   '22222222-2222-4222-8222-222222222222', now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   '11111111-1111-4111-8111-111111111111',
   'Sales Representative', 'Onboarding plan for sales team hires',
   'Sales', false,
   '22222222-2222-4222-8222-222222222222', now(), now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccd',
   '11111111-1111-4111-8111-111111111111',
   'Operations Manager', 'Onboarding plan for operations leadership',
   'Operations', false,
   '22222222-2222-4222-8222-222222222222', now(), now())
on conflict (id) do nothing;

-- ── Template Tasks (Software Engineer) ───────────────────────────
insert into public.template_tasks (
  id, template_id, company_id, title, description,
  task_type, phase, assigned_role, due_day_offset, sort_order, is_required, created_at, updated_at
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'Send welcome email', 'Introduce the new hire to the team',
   'checkbox', 'pre_boarding', 'hr_admin', -3, 0, true, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'Prepare workstation', 'Set up laptop, accounts, and access',
   'checkbox', 'pre_boarding', 'it_admin', -1, 1, true, now(), now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'Sign employment contract', 'Upload signed contract PDF',
   'document_upload', 'pre_boarding', 'new_hire', 0, 2, true, now(), now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'Meet the team', 'Introductory meeting with direct team',
   'meeting', 'week_1', 'new_hire', 1, 3, true, now(), now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'Complete security training', 'Acknowledge security policy',
   'acknowledgement', 'week_1', 'new_hire', 5, 4, true, now(), now()),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'Set up dev environment', 'Clone repos and run local setup',
   'checkbox', 'week_1', 'new_hire', 3, 5, true, now(), now()),
  ('11111111-1111-4111-8111-111111111112',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   '30-day check-in', 'Manager 1:1 review',
   'meeting', 'month_1', 'manager', 30, 6, true, now(), now()),
  ('22222222-2222-4222-8222-222222222223',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   'Submit personal details form', 'HR form for payroll setup',
   'form_submission', 'month_1', 'new_hire', 7, 7, true, now(), now()),
  ('33333333-3333-4333-8333-333333333334',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   '90-day performance review', 'Formal review with manager',
   'meeting', 'month_3', 'manager', 90, 8, false, now(), now())
on conflict (id) do nothing;

-- ── Hires ─────────────────────────────────────────────────────────
insert into public.hires (
  id, company_id, user_id, manager_id, template_id,
  full_name, email, job_title, department, start_date,
  status, completion_pct, invited_at, started_at,
  notes, created_by, created_at, updated_at
) values
  ('hire-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   '55555555-5555-4555-8555-555555555555',
   '33333333-3333-4333-8333-333333333333',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'Nina Newhire', 'newhire@demo-company.com',
   'Frontend Developer', 'Engineering', current_date,
   'in_progress', 33, now(), now(),
   'Joining the web platform team',
   '22222222-2222-4222-8222-222222222222', now(), now()),
  ('hire-0002-0002-0002-000000000002',
   '11111111-1111-4111-8111-111111111111',
   null,
   '33333333-3333-4333-8333-333333333333',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'Sam Sales', 'sam.sales@demo-company.com',
   'Account Executive', 'Sales', current_date + 7,
   'pending_invite', 0, now(), null,
   null,
   '22222222-2222-4222-8222-222222222222', now(), now())
on conflict (id) do nothing;

-- ── Hire Tasks (Nina's tasks) ─────────────────────────────────────
insert into public.hire_tasks (
  id, hire_id, company_id, template_task_id,
  title, description, task_type, phase, assigned_role,
  due_date, status, is_required, sort_order, created_at, updated_at
) values
  ('htask-0001', 'hire-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'Send welcome email', null,
   'checkbox', 'pre_boarding', 'hr_admin',
   current_date - 3, 'completed', true, 0, now(), now()),
  ('htask-0002', 'hire-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'Prepare workstation', 'Set up laptop, accounts, and access',
   'checkbox', 'pre_boarding', 'it_admin',
   current_date - 1, 'completed', true, 1, now(), now()),
  ('htask-0003', 'hire-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'Sign employment contract', 'Upload signed contract PDF',
   'document_upload', 'pre_boarding', 'new_hire',
   current_date, 'pending', true, 2, now(), now()),
  ('htask-0004', 'hire-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
   'Meet the team', 'Introductory meeting with direct team',
   'meeting', 'week_1', 'new_hire',
   current_date + 1, 'pending', true, 3, now(), now()),
  ('htask-0005', 'hire-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   'Complete security training', 'Acknowledge security policy',
   'acknowledgement', 'week_1', 'new_hire',
   current_date + 5, 'pending', true, 4, now(), now()),
  ('htask-0006', 'hire-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'ffffffff-ffff-4fff-8fff-ffffffffffff',
   'Set up dev environment', 'Clone repos and run local setup',
   'checkbox', 'week_1', 'new_hire',
   current_date + 3, 'pending', true, 5, now(), now())
on conflict (id) do nothing;

-- ── Documents ─────────────────────────────────────────────────────
insert into public.documents (
  id, company_id, hire_id, uploaded_by, reviewed_by,
  name, original_name, file_path, file_size, mime_type,
  category, is_company_doc, version, status,
  reviewed_at, retention_until, gdpr_basis, created_at, updated_at
) values
  ('doc-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   null,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'Employee Handbook 2024', 'employee_handbook_2024.pdf',
   '11111111-1111-4111-8111-111111111111/company/employee_handbook_2024.pdf',
   2048000, 'application/pdf',
   'policy', true, 2, 'approved',
   now(), current_date + 1095, 'legitimate_interest', now(), now()),
  ('doc-0002-0002-0002-000000000002',
   '11111111-1111-4111-8111-111111111111',
   null,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'NDA Template', 'nda_template.pdf',
   '11111111-1111-4111-8111-111111111111/company/nda_template.pdf',
   512000, 'application/pdf',
   'contract', true, 1, 'approved',
   now(), current_date + 2555, 'legitimate_interest', now(), now()),
  ('doc-0004-0004-0004-000000000004',
   '11111111-1111-4111-8111-111111111111',
   'hire-0001-0001-0001-000000000001',
   '55555555-5555-4555-8555-555555555555',
   null,
   'Employment Contract — Nina Newhire', 'employment_contract_signed.pdf',
   '11111111-1111-4111-8111-111111111111/hire-0001-0001-0001-000000000001/employment_contract_signed.pdf',
   1024000, 'application/pdf',
   'contract', false, 1, 'pending_review',
   null, current_date + 2555, 'contractual_necessity', now(), now())
on conflict (id) do nothing;

-- ── IT Checklist Template ─────────────────────────────────────────
insert into public.it_checklist_templates (
  id, company_id, name, description, is_default, created_by, created_at, updated_at
) values (
  'it-tpl-0001-0001-0001-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'Standard IT Onboarding',
  'Default IT provisioning checklist for all new hires',
  true,
  '22222222-2222-4222-8222-222222222222',
  now(), now()
) on conflict (id) do nothing;

insert into public.it_checklist_template_items (
  id, template_id, company_id, title, description, category, sort_order, is_required, created_at
) values
  ('it-ti-0001', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Provision laptop', 'Order and configure MacBook Pro 14"', 'hardware', 0, true, now()),
  ('it-ti-0002', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Create company email', 'Set up firstname.lastname@company.com in Google Workspace', 'communication', 1, true, now()),
  ('it-ti-0003', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Add to Slack workspace', 'Invite to #general and relevant team channels', 'communication', 2, true, now()),
  ('it-ti-0004', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Grant GitHub access', 'Add to org and relevant repos with correct role', 'access', 3, true, now()),
  ('it-ti-0005', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Set up VPN credentials', 'Create WireGuard config and send securely', 'security', 4, true, now()),
  ('it-ti-0006', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Install required software', 'VS Code, Docker, Node.js, 1Password', 'software', 5, true, now()),
  ('it-ti-0007', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Configure 2FA / MFA', 'Enable on Google, GitHub, Slack, and VPN', 'security', 6, true, now()),
  ('it-ti-0008', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Add to Jira / Linear', 'Create account and assign to correct project', 'software', 7, false, now()),
  ('it-ti-0009', 'it-tpl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111',
   'Desk & monitor setup', 'Assign desk, external monitor, keyboard, mouse', 'hardware', 8, false, now())
on conflict (id) do nothing;

-- ── IT Checklist for Nina ─────────────────────────────────────────
insert into public.it_checklists (
  id, company_id, hire_id, template_id, assigned_to,
  status, completion_pct, due_date, notes, created_at, updated_at
) values (
  'it-cl-0001-0001-0001-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'hire-0001-0001-0001-000000000001',
  'it-tpl-0001-0001-0001-000000000001',
  '44444444-4444-4444-8444-444444444444',
  'in_progress', 33, current_date,
  'Priority hire — engineering team start date is firm',
  now(), now()
) on conflict (id) do nothing;

insert into public.it_checklist_items (
  id, checklist_id, company_id, template_item_id,
  title, description, category, sort_order, is_required,
  status, asset_tag, serial_number, completed_by, completed_at, created_at, updated_at
) values
  ('it-ci-0001', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0001',
   'Provision laptop', 'Order and configure MacBook Pro 14"', 'hardware', 0, true,
   'completed', 'ASSET-0042', 'C02XK1JFHV2Q',
   '44444444-4444-4444-8444-444444444444', now(), now(), now()),
  ('it-ci-0002', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0002',
   'Create company email', 'Set up firstname.lastname@company.com', 'communication', 1, true,
   'completed', null, null,
   '44444444-4444-4444-8444-444444444444', now(), now(), now()),
  ('it-ci-0003', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0003',
   'Add to Slack workspace', 'Invite to #general and relevant team channels', 'communication', 2, true,
   'completed', null, null,
   '44444444-4444-4444-8444-444444444444', now(), now(), now()),
  ('it-ci-0004', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0004',
   'Grant GitHub access', 'Add to org and relevant repos', 'access', 3, true,
   'pending', null, null, null, null, now(), now()),
  ('it-ci-0005', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0005',
   'Set up VPN credentials', 'Create WireGuard config', 'security', 4, true,
   'pending', null, null, null, null, now(), now()),
  ('it-ci-0006', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0006',
   'Install required software', 'VS Code, Docker, Node.js, 1Password', 'software', 5, true,
   'pending', null, null, null, null, now(), now()),
  ('it-ci-0007', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0007',
   'Configure 2FA / MFA', 'Enable on Google, GitHub, Slack, and VPN', 'security', 6, true,
   'pending', null, null, null, null, now(), now()),
  ('it-ci-0008', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0008',
   'Add to Jira / Linear', 'Create account and assign to correct project', 'software', 7, false,
   'pending', null, null, null, null, now(), now()),
  ('it-ci-0009', 'it-cl-0001-0001-0001-000000000001', '11111111-1111-4111-8111-111111111111', 'it-ti-0009',
   'Desk & monitor setup', 'Assign desk, external monitor, keyboard, mouse', 'hardware', 8, false,
   'blocked', null, null, null, null, now(), now())
on conflict (id) do nothing;

-- ── Notifications ─────────────────────────────────────────────────
insert into public.notifications (
  id, company_id, user_id, type, title, body, link, metadata, is_read, created_at
) values
  ('notif-0001-0001-0001-000000000001',
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   'doc_uploaded',
   'Document uploaded for review',
   'Nina Newhire uploaded "Employment Contract — Nina Newhire"',
   '/hires/hire-0001-0001-0001-000000000001/documents',
   '{"hireId":"hire-0001-0001-0001-000000000001"}',
   false, now()),
  ('notif-0002-0002-0002-000000000002',
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   'hire_at_risk',
   'Hire at risk: overdue tasks',
   'Nina Newhire has 1 overdue required task',
   '/hires/hire-0001-0001-0001-000000000001',
   '{"hireId":"hire-0001-0001-0001-000000000001","overdueCount":1}',
   false, now()),
  ('notif-0004-0004-0004-000000000004',
   '11111111-1111-4111-8111-111111111111',
   '55555555-5555-4555-8555-555555555555',
   'task_assigned',
   'New task assigned',
   'Please sign your employment contract',
   '/tasks/htask-0003',
   '{"taskId":"htask-0003"}',
   true, now()),
  ('notif-0005-0005-0005-000000000005',
   '11111111-1111-4111-8111-111111111111',
   '55555555-5555-4555-8555-555555555555',
   'task_due_soon',
   'Task due today',
   '"Sign employment contract" is due today',
   '/tasks/htask-0003',
   '{"taskId":"htask-0003"}',
   false, now())
on conflict (id) do nothing;

