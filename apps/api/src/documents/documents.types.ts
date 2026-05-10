export type DocumentCategory =
  | 'policy'
  | 'contract'
  | 'training'
  | 'personal_id'
  | 'tax_form'
  | 'certificate'
  | 'other';

export type DocumentStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'superseded';

export const DOCUMENT_CATEGORIES: readonly DocumentCategory[] = [
  'policy',
  'contract',
  'training',
  'personal_id',
  'tax_form',
  'certificate',
  'other',
];

export const DOCUMENT_STATUSES: readonly DocumentStatus[] = [
  'pending_review',
  'approved',
  'rejected',
  'superseded',
];

/** GDPR retention days per category (configurable per company in production) */
export const DEFAULT_RETENTION_DAYS: Record<DocumentCategory, number> = {
  policy:      365 * 3,   // 3 years
  contract:    365 * 7,   // 7 years (German HGB §257)
  training:    365 * 3,
  personal_id: 365 * 1,
  tax_form:    365 * 7,
  certificate: 365 * 5,
  other:       365 * 2,
};

// ── Domain models ──────────────────────────────────────────────

export interface Document {
  id: string;
  companyId: string;
  hireId: string | null;
  hireTaskId: string | null;
  uploadedBy: string | null;
  reviewedBy: string | null;

  name: string;
  originalName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  checksum: string | null;

  category: DocumentCategory;
  isCompanyDoc: boolean;

  version: number;
  parentId: string | null;

  status: DocumentStatus;
  reviewedAt: string | null;
  rejectionNote: string | null;

  retentionUntil: string | null;
  gdprBasis: string;

  createdAt: string;
  updatedAt: string;
}

export interface DocumentAcknowledgement {
  id: string;
  documentId: string;
  userId: string;
  hireId: string | null;
  hireTaskId: string | null;
  acknowledgedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

// ── Input types ────────────────────────────────────────────────

export interface RegisterDocumentInput {
  /** Display name shown in the UI */
  name: string;
  /** Original filename from the upload */
  originalName: string;
  /** Supabase Storage object path */
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  checksum?: string;
  category: DocumentCategory;
  isCompanyDoc?: boolean;
  hireId?: string;
  hireTaskId?: string;
}

export interface UpdateDocumentInput {
  name?: string;
  category?: DocumentCategory;
}

export interface AcknowledgeDocumentInput {
  hireId?: string;
  hireTaskId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ── Response types ─────────────────────────────────────────────

export interface DocumentListResponse {
  documents: Document[];
  count: number;
  byStatus: Record<DocumentStatus, number>;
  byCategory: Record<DocumentCategory, number>;
}

export interface DocumentVersionsResponse {
  current: Document;
  history: Document[];
}

export interface SignedUrlResponse {
  url: string;
  expiresAt: string;
  documentId: string;
}

export interface AcknowledgementResponse {
  acknowledgement: DocumentAcknowledgement;
  document: Document;
}
