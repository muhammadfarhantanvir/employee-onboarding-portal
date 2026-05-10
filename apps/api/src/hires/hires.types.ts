import { Phase, TaskType, AssignedRole } from '../templates/templates.types';

export type HireStatus =
  | 'pending_invite'
  | 'in_progress'
  | 'at_risk'
  | 'completed'
  | 'cancelled';

export type HireTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked';

export const HIRE_STATUSES: readonly HireStatus[] = [
  'pending_invite',
  'in_progress',
  'at_risk',
  'completed',
  'cancelled',
];

export const HIRE_TASK_STATUSES: readonly HireTaskStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'blocked',
];

// ── Domain models ──────────────────────────────────────────────

export interface Hire {
  id: string;
  companyId: string;
  userId: string | null;
  managerId: string | null;
  templateId: string | null;
  fullName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  startDate: string;           // ISO date string YYYY-MM-DD
  status: HireStatus;
  completionPct: number;
  invitedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HireTask {
  id: string;
  hireId: string;
  companyId: string;
  templateTaskId: string | null;
  title: string;
  description: string | null;
  taskType: TaskType;
  phase: Phase;
  assignedRole: AssignedRole;
  assignedTo: string | null;
  dueDate: string | null;      // ISO date string YYYY-MM-DD
  status: HireTaskStatus;
  isRequired: boolean;
  sortOrder: number;
  note: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Input types ────────────────────────────────────────────────

export interface CreateHireInput {
  fullName: string;
  email: string;
  startDate: string;
  jobTitle?: string;
  department?: string;
  managerId?: string;
  templateId?: string;
  notes?: string;
}

export interface UpdateHireInput {
  fullName?: string;
  jobTitle?: string;
  department?: string;
  startDate?: string;
  managerId?: string;
  templateId?: string;
  status?: HireStatus;
  notes?: string;
}

export interface UpdateHireTaskInput {
  status?: HireTaskStatus;
  assignedTo?: string;
  dueDate?: string;
  note?: string;
}

// ── Response types ─────────────────────────────────────────────

export interface HireResponse extends Hire {
  tasks?: HireTask[];
}

export interface HireListResponse {
  hires: Hire[];
  count: number;
  byStatus: Record<HireStatus, number>;
}

export interface HireTasksResponse {
  tasks: HireTask[];
  count: number;
  byPhase: Record<Phase, number>;
  byStatus: Record<HireTaskStatus, number>;
  completionPct: number;
}
