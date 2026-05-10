import { HireStatus } from '../hires/hires.types';
import { Phase } from '../templates/templates.types';

// ── KPI Overview ───────────────────────────────────────────────

export interface DashboardOverview {
  /** Hires currently in_progress or at_risk */
  activeHires: number;
  /** Hires with status at_risk */
  atRiskHires: number;
  /** Hires with status pending_invite */
  pendingInvites: number;
  /** Hires completed this month */
  completedThisMonth: number;
  /** Average completion % across all active hires */
  avgCompletionPct: number;
  /** Overall completion rate (completed / total non-cancelled) */
  completionRate: number;
  /** Documents awaiting HR review */
  pendingDocuments: number;
  /** Total overdue required tasks across all active hires */
  overdueTaskCount: number;
  /** Timestamp of last data refresh */
  refreshedAt: string;
}

// ── Active Onboardings Table ───────────────────────────────────

export interface ActiveHireRow {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  startDate: string;
  status: HireStatus;
  completionPct: number;
  /** Days since start date (negative = not started yet) */
  daysActive: number;
  /** Days remaining until expected completion (based on longest task due date) */
  daysRemaining: number | null;
  overdueTaskCount: number;
  pendingTaskCount: number;
  completedTaskCount: number;
  totalTaskCount: number;
  managerId: string | null;
  /** Phase-level progress */
  phaseProgress: Record<Phase, { total: number; completed: number }>;
}

export interface ActiveHiresResponse {
  hires: ActiveHireRow[];
  count: number;
  byStatus: Record<HireStatus, number>;
}

// ── Completion Rate by Department ──────────────────────────────

export interface DepartmentCompletionRow {
  department: string;
  totalHires: number;
  completedHires: number;
  completionRate: number;
  avgCompletionPct: number;
  atRiskCount: number;
}

// ── Phase Time Metrics ─────────────────────────────────────────

export interface PhaseTimeRow {
  phase: Phase;
  avgDaysToComplete: number | null;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
}

// ── Overdue Tasks ──────────────────────────────────────────────

export interface OverdueTaskRow {
  taskId: string;
  taskTitle: string;
  hireId: string;
  hireFullName: string;
  hireDepartment: string | null;
  phase: Phase;
  assignedRole: string;
  dueDate: string;
  daysOverdue: number;
}

export interface OverdueTasksResponse {
  tasks: OverdueTaskRow[];
  count: number;
}

// ── Document Review Queue ──────────────────────────────────────

export interface PendingDocumentRow {
  documentId: string;
  documentName: string;
  category: string;
  hireId: string | null;
  hireFullName: string | null;
  uploadedAt: string;
  daysWaiting: number;
  isCompanyDoc: boolean;
}

export interface DocumentReviewQueueResponse {
  documents: PendingDocumentRow[];
  count: number;
}

// ── Hire Cohort Chart ──────────────────────────────────────────

export interface HireCohortPoint {
  /** YYYY-MM */
  month: string;
  invited: number;
  completed: number;
  atRisk: number;
}
