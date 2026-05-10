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
