export type DataAccessAction =
  | 'document.viewed'
  | 'document.downloaded'
  | 'document.uploaded'
  | 'document.approved'
  | 'document.rejected'
  | 'document.deleted'
  | 'hire.viewed'
  | 'hire.exported'
  | 'hire.anonymised'
  | 'data.exported'
  | 'data.erasure_requested'
  | 'data.erased';

export type ErasureStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export const ERASURE_STATUSES: readonly ErasureStatus[] = [
  'pending', 'in_progress', 'completed', 'rejected',
];

// ── Domain models ──────────────────────────────────────────────

export interface DataAccessLogEntry {
  id: string;
  companyId: string;
  userId: string | null;
  action: DataAccessAction;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ErasureRequest {
  id: string;
  companyId: string;
  hireId: string | null;
  requestedBy: string | null;
  reason: string | null;
  status: ErasureStatus;
  processedBy: string | null;
  processedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PrivacyPolicyVersion {
  id: string;
  companyId: string;
  version: string;
  effectiveAt: string;
  contentUrl: string | null;
  isCurrent: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface PrivacyPolicyAck {
  id: string;
  policyId: string;
  userId: string;
  companyId: string;
  ackedAt: string;
  ipAddress: string | null;
}

// ── Input types ────────────────────────────────────────────────

export interface LogAccessInput {
  userId: string | null;
  action: DataAccessAction;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateErasureRequestInput {
  hireId?: string;
  reason?: string;
}

export interface ProcessErasureInput {
  status: ErasureStatus;
  notes?: string;
}

export interface CreatePrivacyPolicyInput {
  version: string;
  effectiveAt: string;
  contentUrl?: string;
}

// ── Response types ─────────────────────────────────────────────

export interface DataExportPackage {
  exportedAt: string;
  companyId: string;
  hireId: string;
  hire: Record<string, unknown>;
  tasks: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  accessLog: DataAccessLogEntry[];
}

export interface AnonymisationResult {
  success: boolean;
  hireId: string;
  fieldsAnonymised: string[];
  documentsDeleted: number;
  anonymisedAt: string;
}
