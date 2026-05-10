import { Phase } from '../templates/templates.types';
import { Hire, HireTask } from '../hires/hires.types';

export type PhaseApprovalStatus = 'approved' | 'pending';

export interface PhaseApproval {
  id: string;
  hireId: string;
  companyId: string;
  managerId: string;
  phase: Phase;
  approvedAt: string;
  note: string | null;
}

export interface ManagerNote {
  id: string;
  hireId: string;
  companyId: string;
  managerId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type ReuploadRequestStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface DocumentReuploadRequest {
  id: string;
  documentId: string;
  hireId: string;
  companyId: string;
  requestedBy: string;
  reason: string;
  status: ReuploadRequestStatus;
  resolvedAt: string | null;
  createdAt: string;
}

// ── Enriched hire view for manager dashboard ──────────────────

export interface ManagerHireView extends Hire {
  tasks: HireTask[];
  phaseApprovals: PhaseApproval[];
  managerNotes: ManagerNote[];
  pendingReuploadRequests: DocumentReuploadRequest[];
  /** Days until start date (negative = already started) */
  daysUntilStart: number;
  /** Overdue required task count */
  overdueTaskCount: number;
  /** Phase-level completion summary */
  phaseProgress: Record<Phase, { total: number; completed: number; approved: boolean }>;
}

export interface ManagerDashboardResponse {
  hires: ManagerHireView[];
  count: number;
  summary: {
    total: number;
    pendingInvite: number;
    inProgress: number;
    atRisk: number;
    completed: number;
    pendingApproval: number;
  };
}

// ── Input types ────────────────────────────────────────────────

export interface ApprovePhaseInput {
  phase: Phase;
  note?: string;
}

export interface CreateManagerNoteInput {
  body: string;
}

export interface UpdateManagerNoteInput {
  body: string;
}

export interface RequestReuploadInput {
  documentId: string;
  reason: string;
}
