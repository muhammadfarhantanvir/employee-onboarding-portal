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
