-- ═══════════════════════════════════════════════════════════════
-- RLS Policies — runs after ALL tables are created
-- ═══════════════════════════════════════════════════════════════

-- ── USERS ────────────────────────────────────────────────────────
drop policy if exists "users_hr_admin_read"    on public.users;
drop policy if exists "users_manager_read"     on public.users;
drop policy if exists "users_self_read"        on public.users;
drop policy if exists "users_hr_admin_insert"  on public.users;
drop policy if exists "users_hr_admin_update"  on public.users;
drop policy if exists "users_self_update"      on public.users;

create policy "users_hr_admin_read" on public.users for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "users_manager_read" on public.users for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role in ('manager','hr_admin'))
  );

create policy "users_self_read" on public.users for select
  using (id = auth.uid());

create policy "users_self_update" on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── HIRES ─────────────────────────────────────────────────────────
drop policy if exists "hires_hr_admin_all"       on public.hires;
drop policy if exists "hires_manager_read"       on public.hires;
drop policy if exists "hires_manager_update"     on public.hires;
drop policy if exists "hires_new_hire_self_read" on public.hires;
drop policy if exists "hires_it_admin_read"      on public.hires;
drop policy if exists "hires_viewer_read"        on public.hires;

create policy "hires_hr_admin_all" on public.hires for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  )
  with check (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "hires_manager_read" on public.hires for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'manager')
  );

create policy "hires_manager_update" on public.hires for update
  using (
    manager_id = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role = 'manager')
  );

create policy "hires_new_hire_self_read" on public.hires for select
  using (
    user_id = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role = 'new_hire')
  );

create policy "hires_it_admin_read" on public.hires for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'it_admin')
  );

create policy "hires_viewer_read" on public.hires for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'viewer')
  );

-- ── HIRE_TASKS ────────────────────────────────────────────────────
drop policy if exists "hire_tasks_hr_admin_all"        on public.hire_tasks;
drop policy if exists "hire_tasks_manager_all"         on public.hire_tasks;
drop policy if exists "hire_tasks_new_hire_own"        on public.hire_tasks;
drop policy if exists "hire_tasks_new_hire_update_own" on public.hire_tasks;
drop policy if exists "hire_tasks_it_admin_own"        on public.hire_tasks;
drop policy if exists "hire_tasks_it_admin_update_own" on public.hire_tasks;

create policy "hire_tasks_hr_admin_all" on public.hire_tasks for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "hire_tasks_manager_all" on public.hire_tasks for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'manager')
  );

create policy "hire_tasks_new_hire_own" on public.hire_tasks for select
  using (
    assigned_to = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role = 'new_hire')
  );

create policy "hire_tasks_new_hire_update_own" on public.hire_tasks for update
  using (
    assigned_to = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role = 'new_hire')
  )
  with check (
    assigned_to = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role = 'new_hire')
  );

create policy "hire_tasks_it_admin_own" on public.hire_tasks for select
  using (
    (assigned_to = auth.uid() or assigned_role = 'it_admin')
    and company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'it_admin')
  );

create policy "hire_tasks_it_admin_update_own" on public.hire_tasks for update
  using (
    assigned_to = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role = 'it_admin')
  );

-- ── DOCUMENTS ─────────────────────────────────────────────────────
drop policy if exists "documents_hr_admin_all"      on public.documents;
drop policy if exists "documents_manager_read"      on public.documents;
drop policy if exists "documents_new_hire_upload"   on public.documents;
drop policy if exists "documents_new_hire_read_own" on public.documents;
drop policy if exists "documents_it_admin_read"     on public.documents;
drop policy if exists "documents_viewer_read"       on public.documents;

create policy "documents_hr_admin_all" on public.documents for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "documents_manager_read" on public.documents for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'manager')
  );

create policy "documents_new_hire_upload" on public.documents for insert
  with check (
    uploaded_by = auth.uid()
    and hire_id = (select id from public.hires where user_id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'new_hire')
  );

create policy "documents_new_hire_read_own" on public.documents for select
  using (
    hire_id = (select id from public.hires where user_id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'new_hire')
  );

create policy "documents_it_admin_read" on public.documents for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'it_admin')
  );

create policy "documents_viewer_read" on public.documents for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'viewer')
  );

-- ── DOCUMENT_ACKNOWLEDGEMENTS ─────────────────────────────────────
drop policy if exists "doc_ack_user_insert"    on public.document_acknowledgements;
drop policy if exists "doc_ack_hr_admin_read"  on public.document_acknowledgements;
drop policy if exists "doc_ack_self_read"      on public.document_acknowledgements;

create policy "doc_ack_user_insert" on public.document_acknowledgements for insert
  with check (user_id = auth.uid());

create policy "doc_ack_hr_admin_read" on public.document_acknowledgements for select
  using (
    exists (
      select 1 from public.users u
      join public.documents d on d.id = document_acknowledgements.document_id
      where u.id = auth.uid() and u.role = 'hr_admin' and u.company_id = d.company_id
    )
  );

create policy "doc_ack_self_read" on public.document_acknowledgements for select
  using (user_id = auth.uid());

-- ── ONBOARDING_TEMPLATES ──────────────────────────────────────────
drop policy if exists "templates_hr_admin_all"   on public.onboarding_templates;
drop policy if exists "templates_manager_read"   on public.onboarding_templates;

create policy "templates_hr_admin_all" on public.onboarding_templates for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "templates_manager_read" on public.onboarding_templates for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'manager')
  );

-- ── TEMPLATE_TASKS ────────────────────────────────────────────────
drop policy if exists "template_tasks_hr_admin_all"  on public.template_tasks;
drop policy if exists "template_tasks_manager_read"  on public.template_tasks;

create policy "template_tasks_hr_admin_all" on public.template_tasks for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "template_tasks_manager_read" on public.template_tasks for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'manager')
  );

-- ── NOTIFICATIONS ─────────────────────────────────────────────────
drop policy if exists "notifications_user_read"     on public.notifications;
drop policy if exists "notifications_system_insert" on public.notifications;
drop policy if exists "notifications_user_update"   on public.notifications;

create policy "notifications_user_read" on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_system_insert" on public.notifications for insert
  with check (true);

create policy "notifications_user_update" on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── WORKFLOW_JOBS ─────────────────────────────────────────────────
drop policy if exists "workflow_jobs_hr_admin_all" on public.workflow_jobs;

create policy "workflow_jobs_hr_admin_all" on public.workflow_jobs for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

-- ── EMAIL_LOG ─────────────────────────────────────────────────────
drop policy if exists "email_log_hr_admin_read" on public.email_log;

create policy "email_log_hr_admin_read" on public.email_log for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

-- ── IT_CHECKLIST_TEMPLATES ────────────────────────────────────────
drop policy if exists "it_templates_hr_admin_all"  on public.it_checklist_templates;
drop policy if exists "it_templates_it_admin_read" on public.it_checklist_templates;

create policy "it_templates_hr_admin_all" on public.it_checklist_templates for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "it_templates_it_admin_read" on public.it_checklist_templates for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role in ('it_admin','hr_admin'))
  );

-- ── IT_CHECKLIST_TEMPLATE_ITEMS ───────────────────────────────────
drop policy if exists "it_template_items_hr_admin_all"  on public.it_checklist_template_items;
drop policy if exists "it_template_items_it_admin_read" on public.it_checklist_template_items;

create policy "it_template_items_hr_admin_all" on public.it_checklist_template_items for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "it_template_items_it_admin_read" on public.it_checklist_template_items for select
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role in ('it_admin','hr_admin'))
  );

-- ── IT_CHECKLISTS ─────────────────────────────────────────────────
drop policy if exists "it_checklists_hr_admin_all"  on public.it_checklists;
drop policy if exists "it_checklists_it_admin_own"  on public.it_checklists;

create policy "it_checklists_hr_admin_all" on public.it_checklists for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "it_checklists_it_admin_own" on public.it_checklists for all
  using (
    assigned_to = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role = 'it_admin')
  );

-- ── IT_CHECKLIST_ITEMS ────────────────────────────────────────────
drop policy if exists "it_items_hr_admin_all"  on public.it_checklist_items;
drop policy if exists "it_items_it_admin_own"  on public.it_checklist_items;

create policy "it_items_hr_admin_all" on public.it_checklist_items for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "it_items_it_admin_own" on public.it_checklist_items for all
  using (
    company_id = (select company_id from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'it_admin')
  );

-- ── STORAGE POLICIES ─────────────────────────────────────────────
drop policy if exists "hire_documents_hr_admin_read"   on storage.objects;
drop policy if exists "hire_documents_manager_read"    on storage.objects;
drop policy if exists "hire_documents_new_hire_own"    on storage.objects;
drop policy if exists "company_documents_hr_admin_all" on storage.objects;
drop policy if exists "company_documents_others_read"  on storage.objects;

create policy "hire_documents_hr_admin_read" on storage.objects for select
  using (
    bucket_id = 'hire-documents'
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "hire_documents_manager_read" on storage.objects for select
  using (
    bucket_id = 'hire-documents'
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'manager')
  );

create policy "hire_documents_new_hire_own" on storage.objects for all
  using (
    bucket_id = 'hire-documents'
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
    and (storage.foldername(name))[2] = (select id::text from public.hires where user_id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'new_hire')
  );

create policy "company_documents_hr_admin_all" on storage.objects for all
  using (
    bucket_id = 'company-documents'
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
    and exists (select 1 from public.users where id = auth.uid() and role = 'hr_admin')
  );

create policy "company_documents_others_read" on storage.objects for select
  using (
    bucket_id = 'company-documents'
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );
