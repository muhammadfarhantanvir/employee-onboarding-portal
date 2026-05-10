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

do $ begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_owner_user_fk'
  ) then
    alter table public.companies
      add constraint companies_owner_user_fk
      foreign key (owner_user_id)
      references public.users(id)
      deferrable initially deferred;
  end if;
end $;

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
