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

export const PHASE_LABELS: Record<Phase, string> = {
  pre_boarding: 'Pre-boarding',
  week_1: 'Week 1',
  month_1: 'Month 1',
  month_3: 'Month 3',
};

export const PHASE_ORDER: Phase[] = ['pre_boarding', 'week_1', 'month_1', 'month_3'];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  checkbox: 'Checkbox',
  document_upload: 'Document Upload',
  form_submission: 'Form Submission',
  acknowledgement: 'Acknowledgement',
  meeting: 'Meeting',
};

export const ASSIGNED_ROLE_LABELS: Record<AssignedRole, string> = {
  hr_admin: 'HR Admin',
  manager: 'Manager',
  it_admin: 'IT Admin',
  new_hire: 'New Hire',
};

export const TASK_TYPES: TaskType[] = [
  'checkbox',
  'document_upload',
  'form_submission',
  'acknowledgement',
  'meeting',
];

export const ASSIGNED_ROLES: AssignedRole[] = [
  'new_hire',
  'hr_admin',
  'manager',
  'it_admin',
];
