// ── Notification types ─────────────────────────────────────────
export type NotificationType =
  | 'hire_invited'
  | 'hire_started'
  | 'hire_completed'
  | 'hire_at_risk'
  | 'hire_cancelled'
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_completed'
  | 'task_blocked'
  | 'doc_uploaded'
  | 'doc_approved'
  | 'doc_rejected'
  | 'approval_needed'
  | 'checkin_30_day'
  | 'checkin_90_day'
  | 'it_provisioning_needed'
  | 'reminder_sent';

export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'hire_invited', 'hire_started', 'hire_completed', 'hire_at_risk', 'hire_cancelled',
  'task_assigned', 'task_due_soon', 'task_overdue', 'task_completed', 'task_blocked',
  'doc_uploaded', 'doc_approved', 'doc_rejected', 'approval_needed',
  'checkin_30_day', 'checkin_90_day', 'it_provisioning_needed', 'reminder_sent',
];

// ── Workflow job types ─────────────────────────────────────────
export type WorkflowJobType =
  | 'send_invite_email'
  | 'send_task_reminder'
  | 'send_overdue_escalation'
  | 'send_doc_review_alert'
  | 'send_onboarding_complete'
  | 'send_it_provisioning_alert'
  | 'send_manager_alert'
  | 'send_checkin_30_day'
  | 'send_checkin_90_day'
  | 'check_overdue_tasks'
  | 'check_upcoming_tasks';

export type WorkflowJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type EmailStatus = 'queued' | 'sent' | 'failed' | 'bounced';

// ── Domain models ──────────────────────────────────────────────

export interface Notification {
  id: string;
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface WorkflowJob {
  id: string;
  companyId: string;
  type: WorkflowJobType;
  status: WorkflowJobStatus;
  payload: Record<string, unknown>;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  companyId: string;
  recipient: string;
  subject: string;
  template: string;
  status: EmailStatus;
  providerId: string | null;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

// ── Input / response types ─────────────────────────────────────

export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListResponse {
  notifications: Notification[];
  count: number;
  unreadCount: number;
}

export interface WorkflowJobListResponse {
  jobs: WorkflowJob[];
  count: number;
  byStatus: Record<WorkflowJobStatus, number>;
}

export interface EmailLogListResponse {
  emails: EmailLog[];
  count: number;
  byStatus: Record<EmailStatus, number>;
}

// ── Workflow event payloads ────────────────────────────────────

export interface HireEventPayload {
  hireId: string;
  companyId: string;
  hireEmail: string;
  hireFullName: string;
  managerId?: string | null;
  startDate: string;
}

export interface TaskEventPayload {
  taskId: string;
  hireId: string;
  companyId: string;
  taskTitle: string;
  assignedTo?: string | null;
  assignedRole: string;
  dueDate?: string | null;
}

export interface DocumentEventPayload {
  documentId: string;
  companyId: string;
  hireId?: string | null;
  documentName: string;
  uploadedBy?: string | null;
  rejectionNote?: string | null;
}
