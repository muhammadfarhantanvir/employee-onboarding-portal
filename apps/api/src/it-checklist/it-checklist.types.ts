export type ItItemCategory =
  | 'hardware'
  | 'software'
  | 'access'
  | 'communication'
  | 'security'
  | 'other';

export type ItItemStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked';

export type ItChecklistStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked';

export const IT_ITEM_CATEGORIES: readonly ItItemCategory[] = [
  'hardware', 'software', 'access', 'communication', 'security', 'other',
];

export const IT_ITEM_STATUSES: readonly ItItemStatus[] = [
  'pending', 'in_progress', 'completed', 'skipped', 'blocked',
];

export const IT_CHECKLIST_STATUSES: readonly ItChecklistStatus[] = [
  'pending', 'in_progress', 'completed', 'blocked',
];

// ── Domain models ──────────────────────────────────────────────

export interface ItChecklistTemplateItem {
  id: string;
  templateId: string;
  companyId: string;
  title: string;
  description: string | null;
  category: ItItemCategory;
  sortOrder: number;
  isRequired: boolean;
  createdAt: string;
}

export interface ItChecklistTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdBy: string | null;
  items: ItChecklistTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ItChecklistItem {
  id: string;
  checklistId: string;
  companyId: string;
  templateItemId: string | null;
  title: string;
  description: string | null;
  category: ItItemCategory;
  sortOrder: number;
  isRequired: boolean;
  status: ItItemStatus;
  note: string | null;
  /** Physical asset tag (e.g. "ASSET-0042") */
  assetTag: string | null;
  /** Hardware serial number */
  serialNumber: string | null;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItChecklist {
  id: string;
  companyId: string;
  hireId: string;
  templateId: string | null;
  assignedTo: string | null;
  status: ItChecklistStatus;
  completionPct: number;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  items: ItChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

// ── Input types ────────────────────────────────────────────────

export interface CreateItTemplateInput {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateItTemplateInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
}

export interface CreateItTemplateItemInput {
  title: string;
  description?: string;
  category?: ItItemCategory;
  isRequired?: boolean;
}

export interface UpdateItTemplateItemInput {
  title?: string;
  description?: string;
  category?: ItItemCategory;
  isRequired?: boolean;
}

export interface CreateItChecklistInput {
  hireId: string;
  templateId?: string;
  assignedTo?: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateItChecklistInput {
  assignedTo?: string;
  dueDate?: string;
  notes?: string;
  status?: ItChecklistStatus;
}

export interface UpdateItChecklistItemInput {
  status?: ItItemStatus;
  note?: string;
  assetTag?: string;
  serialNumber?: string;
}

// ── Response types ─────────────────────────────────────────────

export interface ItChecklistListResponse {
  checklists: ItChecklist[];
  count: number;
  byStatus: Record<ItChecklistStatus, number>;
}

export interface ItTemplateListResponse {
  templates: ItChecklistTemplate[];
  count: number;
}
