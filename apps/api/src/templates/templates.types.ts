export type TaskType =
  | 'checkbox'
  | 'document_upload'
  | 'form_submission'
  | 'acknowledgement'
  | 'meeting';

export type Phase = 'pre_boarding' | 'week_1' | 'month_1' | 'month_3';

export type AssignedRole = 'hr_admin' | 'manager' | 'it_admin' | 'new_hire';

export interface TemplateTask {
  id: string;
  templateId: string;
  companyId: string;
  title: string;
  description: string | null;
  taskType: TaskType;
  phase: Phase;
  assignedRole: AssignedRole;
  dueDayOffset: number;
  sortOrder: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  department: string | null;
  isDefault: boolean;
  createdBy: string | null;
  tasks: TemplateTask[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  department?: string;
  isDefault?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  department?: string;
  isDefault?: boolean;
}

export interface CreateTemplateTaskInput {
  title: string;
  description?: string;
  taskType: TaskType;
  phase: Phase;
  assignedRole?: AssignedRole;
  dueDayOffset?: number;
  isRequired?: boolean;
}

export interface UpdateTemplateTaskInput {
  title?: string;
  description?: string;
  taskType?: TaskType;
  phase?: Phase;
  assignedRole?: AssignedRole;
  dueDayOffset?: number;
  isRequired?: boolean;
}

export const TASK_TYPES: readonly TaskType[] = [
  'checkbox',
  'document_upload',
  'form_submission',
  'acknowledgement',
  'meeting',
];

export const PHASES: readonly Phase[] = [
  'pre_boarding',
  'week_1',
  'month_1',
  'month_3',
];

export const ASSIGNED_ROLES: readonly AssignedRole[] = [
  'hr_admin',
  'manager',
  'it_admin',
  'new_hire',
];
