-- Enable RLS on all application tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hires ENABLE ROW LEVEL SECURITY;
ALTER TABLE hire_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- USERS TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- HR Admin: can view all users in their company
CREATE POLICY "users_hr_admin_read" ON users
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

-- Managers: can view users in their company (for reports)
CREATE POLICY "users_manager_read" ON users
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'hr_admin')
    )
  );

-- Each user can read their own profile
CREATE POLICY "users_self_read" ON users
  FOR SELECT
  USING (id = auth.uid());

-- HR Admin: can insert new users
CREATE POLICY "users_hr_admin_insert" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin' AND company_id = NEW.company_id
    )
  );

-- HR Admin: can update users
CREATE POLICY "users_hr_admin_update" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin' AND company_id = company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin' AND company_id = NEW.company_id
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "users_self_update" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- The application layer should validate which fields can be updated by the user
  );

-- ═══════════════════════════════════════════════════════════════
-- HIRES TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- HR Admin: full access to hires in their company
CREATE POLICY "hires_hr_admin_all" ON hires
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

-- Managers: can view hires and their direct reports
CREATE POLICY "hires_manager_read" ON hires
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Managers: can update (approve) hires they manage
CREATE POLICY "hires_manager_update" ON hires
  FOR UPDATE
  USING (
    manager_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- New Hire: can only see their own hire record
CREATE POLICY "hires_new_hire_self_read" ON hires
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'new_hire'
    )
  );

-- IT Admin: can view all hires in company
CREATE POLICY "hires_it_admin_read" ON hires
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'it_admin'
    )
  );

-- Viewers: can view all hires in company (read-only)
CREATE POLICY "hires_viewer_read" ON hires
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'viewer'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- HIRE_TASKS TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- HR Admin: full access
CREATE POLICY "hire_tasks_hr_admin_all" ON hire_tasks
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

-- Managers: can view and update tasks for their company
CREATE POLICY "hire_tasks_manager_all" ON hire_tasks
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- New Hire: can view and complete only their own tasks
CREATE POLICY "hire_tasks_new_hire_own" ON hire_tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'new_hire'
    )
  );

CREATE POLICY "hire_tasks_new_hire_update_own" ON hire_tasks
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'new_hire'
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'new_hire'
    )
  );

-- IT Admin: can view and complete their assigned tasks
CREATE POLICY "hire_tasks_it_admin_own" ON hire_tasks
  FOR SELECT
  USING (
    (assigned_to = auth.uid() OR assigned_role = 'it_admin')
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'it_admin'
    )
  );

CREATE POLICY "hire_tasks_it_admin_update_own" ON hire_tasks
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'it_admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENTS TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- HR Admin: full access to documents
CREATE POLICY "documents_hr_admin_all" ON documents
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

-- Managers: can view all documents in their company
CREATE POLICY "documents_manager_read" ON documents
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- New Hire: can upload their own documents and view documents for their hire
CREATE POLICY "documents_new_hire_upload" ON documents
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND hire_id = (SELECT id FROM hires WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'new_hire'
    )
  );

CREATE POLICY "documents_new_hire_read_own" ON documents
  FOR SELECT
  USING (
    hire_id = (SELECT id FROM hires WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'new_hire'
    )
  );

-- IT Admin: can view documents in their company
CREATE POLICY "documents_it_admin_read" ON documents
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'it_admin'
    )
  );

-- Viewers: can view all documents (read-only)
CREATE POLICY "documents_viewer_read" ON documents
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'viewer'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENT_ACKNOWLEDGEMENTS TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Users can acknowledge documents
CREATE POLICY "doc_ack_user_insert" ON document_acknowledgements
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- HR Admin can view acknowledgements for audit
CREATE POLICY "doc_ack_hr_admin_read" ON document_acknowledgements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN documents d ON d.id = document_acknowledgements.document_id
      WHERE u.id = auth.uid()
        AND u.role = 'hr_admin'
        AND u.company_id = d.company_id
    )
  );

-- Users can read their own acknowledgements
CREATE POLICY "doc_ack_self_read" ON document_acknowledgements
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════════
-- ONBOARDING_TEMPLATES TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- HR Admin: full access
CREATE POLICY "templates_hr_admin_all" ON onboarding_templates
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

-- Managers: read-only access to templates
CREATE POLICY "templates_manager_read" ON onboarding_templates
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- TEMPLATE_TASKS TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- HR Admin: full access
CREATE POLICY "template_tasks_hr_admin_all" ON template_tasks
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

-- Managers: read-only
CREATE POLICY "template_tasks_manager_read" ON template_tasks
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Users can only read their own notifications
CREATE POLICY "notifications_user_read" ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- System can insert notifications (service role override)
CREATE POLICY "notifications_system_insert" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_user_update" ON notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════════
-- AUDIT_LOG TABLE - RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- HR Admin: can view audit logs
CREATE POLICY "audit_log_hr_admin_read" ON audit_log
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

-- System can insert audit logs (service role override)
CREATE POLICY "audit_log_system_insert" ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- STORAGE POLICIES - SIGNED URL ACCESS
-- ═══════════════════════════════════════════════════════════════

-- Define storage policies for Supabase Storage buckets
-- Bucket: hire-documents
CREATE POLICY "hire_documents_hr_admin_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'hire-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

CREATE POLICY "hire_documents_manager_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'hire-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "hire_documents_new_hire_own" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'hire-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
    AND (storage.foldername(name))[2] = (
      SELECT id::text FROM hires WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'new_hire'
    )
  );

-- Bucket: company-documents
CREATE POLICY "company_documents_hr_admin_all" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'company-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'hr_admin'
    )
  );

CREATE POLICY "company_documents_others_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'company-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
  );
