import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MetricsService } from '../observability/metrics.service';
import {
  AcknowledgeDocumentInput,
  AcknowledgementResponse,
  DEFAULT_RETENTION_DAYS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  Document,
  DocumentAcknowledgement,
  DocumentCategory,
  DocumentListResponse,
  DocumentStatus,
  DocumentVersionsResponse,
  RegisterDocumentInput,
  SignedUrlResponse,
  UpdateDocumentInput,
} from './documents.types';

@Injectable()
export class DocumentsService {
  /**
   * In-memory store:
   *   companyId → documentId → Document
   *   documentId → DocumentAcknowledgement[]
   */
  private readonly docs = new Map<string, Map<string, Document>>();
  private readonly acks = new Map<string, DocumentAcknowledgement[]>();

  constructor(@Optional() private readonly metricsService?: MetricsService) {
    this.seedDemoDocuments();
  }

  // ── Company documents (HR uploads) ────────────────────────────

  listCompanyDocuments(
    companyId: string,
    opts: { category?: string; status?: string } = {},
  ): DocumentListResponse {
    const all = Array.from(this.companyStore(companyId).values())
      .filter((d) => d.isCompanyDoc)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return this.buildListResponse(all, opts);
  }

  // ── Hire documents ─────────────────────────────────────────────

  listHireDocuments(
    companyId: string,
    hireId: string,
    opts: { category?: string; status?: string } = {},
  ): DocumentListResponse {
    const all = Array.from(this.companyStore(companyId).values())
      .filter((d) => d.hireId === hireId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return this.buildListResponse(all, opts);
  }

  // ── Single document ────────────────────────────────────────────

  getDocument(companyId: string, documentId: string): Document {
    return this.requireDocument(companyId, documentId);
  }

  // ── Register (upload) ──────────────────────────────────────────

  /**
   * Called after the client has uploaded the file to Supabase Storage.
   * The client sends back the storage path + metadata; we persist the record.
   */
  registerDocument(
    companyId: string,
    uploadedBy: string,
    input: RegisterDocumentInput,
  ): Document {
    const name = this.requireStr(input.name, 'name', 1, 300);
    const originalName = this.requireStr(input.originalName, 'originalName', 1, 300);
    const filePath = this.requireStr(input.filePath, 'filePath', 1, 1000);
    const category = this.requireCategory(input.category);

    if (input.mimeType) {
      this.validateMimeType(input.mimeType);
    }

    const now = new Date().toISOString();
    const retentionDays = DEFAULT_RETENTION_DAYS[category];
    const retentionUntil = new Date(Date.now() + retentionDays * 86400000)
      .toISOString()
      .slice(0, 10);

    const doc: Document = {
      id: randomUUID(),
      companyId,
      hireId: input.hireId ?? null,
      hireTaskId: input.hireTaskId ?? null,
      uploadedBy,
      reviewedBy: null,
      name,
      originalName,
      filePath,
      fileSize: input.fileSize ?? null,
      mimeType: input.mimeType ?? null,
      checksum: input.checksum ?? null,
      category,
      isCompanyDoc: input.isCompanyDoc ?? false,
      version: 1,
      parentId: null,
      status: 'pending_review',
      reviewedAt: null,
      rejectionNote: null,
      retentionUntil,
      gdprBasis: 'legitimate_interest',
      createdAt: now,
      updatedAt: now,
    };

    this.companyStore(companyId).set(doc.id, doc);
    this.metricsService?.recordDocumentUploaded(companyId, category);
    return doc;
  }

  // ── Update metadata ────────────────────────────────────────────

  updateDocument(
    companyId: string,
    documentId: string,
    input: UpdateDocumentInput,
  ): Document {
    const doc = this.requireDocument(companyId, documentId);

    if (doc.status === 'superseded') {
      throw new ConflictException('Cannot update a superseded document');
    }

    const updated: Document = {
      ...doc,
      name:
        input.name !== undefined
          ? this.requireStr(input.name, 'name', 1, 300)
          : doc.name,
      category:
        input.category !== undefined
          ? this.requireCategory(input.category)
          : doc.category,
      updatedAt: new Date().toISOString(),
    };

    this.companyStore(companyId).set(documentId, updated);
    return updated;
  }

  // ── Version control ────────────────────────────────────────────

  /**
   * Upload a new version of an existing document.
   * The old document is marked 'superseded'; the new one becomes active.
   */
  uploadNewVersion(
    companyId: string,
    documentId: string,
    uploadedBy: string,
    input: RegisterDocumentInput,
  ): Document {
    const parent = this.requireDocument(companyId, documentId);

    if (parent.status === 'superseded') {
      throw new ConflictException(
        'Cannot version a superseded document — use the current version',
      );
    }

    // Mark parent as superseded
    const superseded: Document = {
      ...parent,
      status: 'superseded',
      updatedAt: new Date().toISOString(),
    };
    this.companyStore(companyId).set(parent.id, superseded);

    // Create new version
    const name = this.requireStr(input.name ?? parent.name, 'name', 1, 300);
    const originalName = this.requireStr(input.originalName, 'originalName', 1, 300);
    const filePath = this.requireStr(input.filePath, 'filePath', 1, 1000);
    const category = input.category ?? parent.category;

    const now = new Date().toISOString();
    const newDoc: Document = {
      id: randomUUID(),
      companyId,
      hireId: parent.hireId,
      hireTaskId: parent.hireTaskId,
      uploadedBy,
      reviewedBy: null,
      name,
      originalName,
      filePath,
      fileSize: input.fileSize ?? null,
      mimeType: input.mimeType ?? null,
      checksum: input.checksum ?? null,
      category,
      isCompanyDoc: parent.isCompanyDoc,
      version: parent.version + 1,
      parentId: parent.id,
      status: 'pending_review',
      reviewedAt: null,
      rejectionNote: null,
      retentionUntil: parent.retentionUntil,
      gdprBasis: parent.gdprBasis,
      createdAt: now,
      updatedAt: now,
    };

    this.companyStore(companyId).set(newDoc.id, newDoc);
    return newDoc;
  }

  /** Returns the current version + full version history for a document chain */
  getVersionHistory(
    companyId: string,
    documentId: string,
  ): DocumentVersionsResponse {
    const current = this.requireDocument(companyId, documentId);
    const allDocs = Array.from(this.companyStore(companyId).values());

    // Walk the parent chain to collect history
    const history: Document[] = [];
    let parentId = current.parentId;
    while (parentId) {
      const parent = allDocs.find((d) => d.id === parentId);
      if (!parent) break;
      history.push(parent);
      parentId = parent.parentId;
    }

    return { current, history };
  }

  // ── Review workflow ────────────────────────────────────────────

  approveDocument(
    companyId: string,
    documentId: string,
    reviewedBy: string,
  ): Document {
    const doc = this.requireDocument(companyId, documentId);

    if (doc.status === 'approved') {
      throw new ConflictException('Document is already approved');
    }
    if (doc.status === 'superseded') {
      throw new ConflictException('Cannot approve a superseded document');
    }

    const now = new Date().toISOString();
    const updated: Document = {
      ...doc,
      status: 'approved',
      reviewedBy,
      reviewedAt: now,
      rejectionNote: null,
      updatedAt: now,
    };

    this.companyStore(companyId).set(documentId, updated);
    return updated;
  }

  rejectDocument(
    companyId: string,
    documentId: string,
    reviewedBy: string,
    reason: string,
  ): Document {
    const doc = this.requireDocument(companyId, documentId);

    if (!reason?.trim()) {
      throw new BadRequestException('reason is required when rejecting a document');
    }
    if (doc.status === 'rejected') {
      throw new ConflictException('Document is already rejected');
    }
    if (doc.status === 'superseded') {
      throw new ConflictException('Cannot reject a superseded document');
    }

    const now = new Date().toISOString();
    const updated: Document = {
      ...doc,
      status: 'rejected',
      reviewedBy,
      reviewedAt: now,
      rejectionNote: reason.trim(),
      updatedAt: now,
    };

    this.companyStore(companyId).set(documentId, updated);
    return updated;
  }

  // ── Signed URL ─────────────────────────────────────────────────

  /**
   * Generates a time-limited signed URL for secure document download.
   * In production this calls Supabase Storage createSignedUrl().
   * Here we simulate it with a deterministic placeholder.
   */
  getSignedUrl(
    companyId: string,
    documentId: string,
    requestingUserId: string,
    expirySeconds = 3600,
  ): SignedUrlResponse {
    const doc = this.requireDocument(companyId, documentId);

    // Simulate signed URL — in production: supabase.storage.from(bucket).createSignedUrl(path, expirySeconds)
    const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();
    const token = Buffer.from(
      `${documentId}:${requestingUserId}:${expiresAt}`,
    ).toString('base64url');

    const url = `https://supabase.co/storage/v1/object/sign/hire-documents/${doc.filePath}?token=${token}&expiresIn=${expirySeconds}`;

    return { url, expiresAt, documentId };
  }

  // ── Acknowledgement ────────────────────────────────────────────

  acknowledgeDocument(
    companyId: string,
    documentId: string,
    userId: string,
    input: AcknowledgeDocumentInput,
  ): AcknowledgementResponse {
    const doc = this.requireDocument(companyId, documentId);

    if (doc.status !== 'approved') {
      throw new BadRequestException(
        'Only approved documents can be acknowledged',
      );
    }

    // Idempotent — return existing ack if already acknowledged
    const existing = (this.acks.get(documentId) ?? []).find(
      (a) => a.userId === userId,
    );
    if (existing) {
      return { acknowledgement: existing, document: doc };
    }

    const ack: DocumentAcknowledgement = {
      id: randomUUID(),
      documentId,
      userId,
      hireId: input.hireId ?? null,
      hireTaskId: input.hireTaskId ?? null,
      acknowledgedAt: new Date().toISOString(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };

    const list = this.acks.get(documentId) ?? [];
    list.push(ack);
    this.acks.set(documentId, list);

    return { acknowledgement: ack, document: doc };
  }

  listAcknowledgements(
    companyId: string,
    documentId: string,
  ): DocumentAcknowledgement[] {
    this.requireDocument(companyId, documentId);
    return this.acks.get(documentId) ?? [];
  }

  // ── Delete (GDPR erasure) ──────────────────────────────────────

  deleteDocument(
    companyId: string,
    documentId: string,
    requestingUserId: string,
    isHrAdmin: boolean,
  ): { success: boolean; message: string } {
    const doc = this.requireDocument(companyId, documentId);

    // Only HR admin can delete company docs; uploader can delete own pending docs
    if (doc.isCompanyDoc && !isHrAdmin) {
      throw new ForbiddenException('Only HR admins can delete company documents');
    }
    if (!doc.isCompanyDoc && doc.uploadedBy !== requestingUserId && !isHrAdmin) {
      throw new ForbiddenException('You can only delete your own documents');
    }
    if (doc.status === 'approved' && !isHrAdmin) {
      throw new ForbiddenException('Approved documents can only be deleted by HR admins');
    }

    this.companyStore(companyId).delete(documentId);
    this.acks.delete(documentId);

    return { success: true, message: `Document "${doc.name}" deleted` };
  }

  // ── Pending review queue ───────────────────────────────────────

  listPendingReview(companyId: string): DocumentListResponse {
    const all = Array.from(this.companyStore(companyId).values())
      .filter((d) => d.status === 'pending_review')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return this.buildListResponse(all, {});
  }

  // ── Private helpers ────────────────────────────────────────────

  private companyStore(companyId: string): Map<string, Document> {
    if (!this.docs.has(companyId)) {
      this.docs.set(companyId, new Map());
    }
    return this.docs.get(companyId)!;
  }

  private requireDocument(companyId: string, documentId: string): Document {
    const doc = this.companyStore(companyId).get(documentId);
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  private requireStr(value: unknown, field: string, min: number, max: number): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    const trimmed = value.trim();
    if (trimmed.length < min || trimmed.length > max) {
      throw new BadRequestException(
        `${field} must be between ${min} and ${max} characters`,
      );
    }
    return trimmed;
  }

  private requireCategory(value: unknown): DocumentCategory {
    if (!DOCUMENT_CATEGORIES.includes(value as DocumentCategory)) {
      throw new BadRequestException(
        `category must be one of: ${DOCUMENT_CATEGORIES.join(', ')}`,
      );
    }
    return value as DocumentCategory;
  }

  private validateMimeType(mimeType: string): void {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    if (!allowed.includes(mimeType)) {
      throw new BadRequestException(
        `File type "${mimeType}" is not allowed. Permitted types: PDF, JPEG, PNG, WEBP, DOC, DOCX, XLS, XLSX, TXT, CSV`,
      );
    }
  }

  private buildListResponse(
    docs: Document[],
    opts: { category?: string; status?: string },
  ): DocumentListResponse {
    let filtered = docs;
    if (opts.category) filtered = filtered.filter((d) => d.category === opts.category);
    if (opts.status) filtered = filtered.filter((d) => d.status === opts.status);

    const byStatus = DOCUMENT_STATUSES.reduce(
      (acc, s) => ({ ...acc, [s]: docs.filter((d) => d.status === s).length }),
      {} as Record<DocumentStatus, number>,
    );

    const byCategory = DOCUMENT_CATEGORIES.reduce(
      (acc, c) => ({ ...acc, [c]: docs.filter((d) => d.category === c).length }),
      {} as Record<DocumentCategory, number>,
    );

    return { documents: filtered, count: filtered.length, byStatus, byCategory };
  }

  // ── Demo seed data ─────────────────────────────────────────────

  private seedDemoDocuments(): void {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const hrAdminId = '22222222-2222-4222-8222-222222222222';
    const hireId = 'hire-0001-0001-0001-000000000001';
    const newHireId = '55555555-5555-4555-8555-555555555555';
    const now = new Date().toISOString();

    const docs: Document[] = [
      // ── Company documents (HR uploaded) ──
      {
        id: 'doc-0001-0001-0001-000000000001',
        companyId,
        hireId: null,
        hireTaskId: null,
        uploadedBy: hrAdminId,
        reviewedBy: hrAdminId,
        name: 'Employee Handbook 2024',
        originalName: 'employee_handbook_2024.pdf',
        filePath: `${companyId}/company/employee_handbook_2024.pdf`,
        fileSize: 2048000,
        mimeType: 'application/pdf',
        checksum: 'abc123def456',
        category: 'policy',
        isCompanyDoc: true,
        version: 2,
        parentId: null,
        status: 'approved',
        reviewedAt: now,
        rejectionNote: null,
        retentionUntil: new Date(Date.now() + 3 * 365 * 86400000).toISOString().slice(0, 10),
        gdprBasis: 'legitimate_interest',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'doc-0002-0002-0002-000000000002',
        companyId,
        hireId: null,
        hireTaskId: null,
        uploadedBy: hrAdminId,
        reviewedBy: hrAdminId,
        name: 'NDA Template',
        originalName: 'nda_template.pdf',
        filePath: `${companyId}/company/nda_template.pdf`,
        fileSize: 512000,
        mimeType: 'application/pdf',
        checksum: 'def789ghi012',
        category: 'contract',
        isCompanyDoc: true,
        version: 1,
        parentId: null,
        status: 'approved',
        reviewedAt: now,
        rejectionNote: null,
        retentionUntil: new Date(Date.now() + 7 * 365 * 86400000).toISOString().slice(0, 10),
        gdprBasis: 'legitimate_interest',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'doc-0003-0003-0003-000000000003',
        companyId,
        hireId: null,
        hireTaskId: null,
        uploadedBy: hrAdminId,
        reviewedBy: null,
        name: 'Security Policy v3',
        originalName: 'security_policy_v3.pdf',
        filePath: `${companyId}/company/security_policy_v3.pdf`,
        fileSize: 768000,
        mimeType: 'application/pdf',
        checksum: 'jkl345mno678',
        category: 'policy',
        isCompanyDoc: true,
        version: 3,
        parentId: null,
        status: 'pending_review',
        reviewedAt: null,
        rejectionNote: null,
        retentionUntil: new Date(Date.now() + 3 * 365 * 86400000).toISOString().slice(0, 10),
        gdprBasis: 'legitimate_interest',
        createdAt: now,
        updatedAt: now,
      },
      // ── Hire documents (new hire uploaded) ──
      {
        id: 'doc-0004-0004-0004-000000000004',
        companyId,
        hireId,
        hireTaskId: 'htask-0003',
        uploadedBy: newHireId,
        reviewedBy: null,
        name: 'Employment Contract — Nina Newhire',
        originalName: 'employment_contract_signed.pdf',
        filePath: `${companyId}/${hireId}/employment_contract_signed.pdf`,
        fileSize: 1024000,
        mimeType: 'application/pdf',
        checksum: 'pqr901stu234',
        category: 'contract',
        isCompanyDoc: false,
        version: 1,
        parentId: null,
        status: 'pending_review',
        reviewedAt: null,
        rejectionNote: null,
        retentionUntil: new Date(Date.now() + 7 * 365 * 86400000).toISOString().slice(0, 10),
        gdprBasis: 'contractual_necessity',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const companyMap = new Map<string, Document>();
    for (const d of docs) {
      companyMap.set(d.id, d);
    }
    this.docs.set(companyId, companyMap);

    // Seed an acknowledgement for the handbook
    this.acks.set('doc-0001-0001-0001-000000000001', [
      {
        id: 'ack-0001-0001-0001-000000000001',
        documentId: 'doc-0001-0001-0001-000000000001',
        userId: newHireId,
        hireId,
        hireTaskId: null,
        acknowledgedAt: now,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
    ]);
  }
}
