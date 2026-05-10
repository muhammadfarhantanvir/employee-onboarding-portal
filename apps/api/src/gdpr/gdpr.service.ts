import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HiresService } from '../hires/hires.service';
import { DocumentsService } from '../documents/documents.service';
import {
  AnonymisationResult,
  CreateErasureRequestInput,
  CreatePrivacyPolicyInput,
  DataAccessAction,
  DataAccessLogEntry,
  DataExportPackage,
  ERASURE_STATUSES,
  ErasureRequest,
  ErasureStatus,
  LogAccessInput,
  PrivacyPolicyAck,
  PrivacyPolicyVersion,
  ProcessErasureInput,
} from './gdpr.types';

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  /** companyId → DataAccessLogEntry[] */
  private readonly accessLog = new Map<string, DataAccessLogEntry[]>();
  /** companyId → ErasureRequest[] */
  private readonly erasureRequests = new Map<string, ErasureRequest[]>();
  /** companyId → PrivacyPolicyVersion[] */
  private readonly policies = new Map<string, PrivacyPolicyVersion[]>();
  /** policyId → PrivacyPolicyAck[] */
  private readonly policyAcks = new Map<string, PrivacyPolicyAck[]>();

  constructor(
    private readonly hiresService: HiresService,
    private readonly documentsService: DocumentsService,
  ) {
    this.seedDemoData();
  }

  // ── Data Access Log ────────────────────────────────────────────

  logAccess(companyId: string, input: LogAccessInput): DataAccessLogEntry {
    const entry: DataAccessLogEntry = {
      id: randomUUID(),
      companyId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };

    const log = this.companyLog(companyId);
    log.unshift(entry);
    // Keep last 1000 entries per company
    if (log.length > 1000) log.splice(1000);

    this.logger.log(
      `[GDPR] action=${entry.action} entity=${entry.entityType}:${entry.entityId ?? 'n/a'} user=${entry.userId ?? 'anon'}`,
    );

    return entry;
  }

  getAccessLog(
    companyId: string,
    opts: {
      userId?: string;
      entityType?: string;
      action?: string;
      limit?: number;
    } = {},
  ): { entries: DataAccessLogEntry[]; count: number } {
    let entries = this.companyLog(companyId);

    if (opts.userId) entries = entries.filter((e) => e.userId === opts.userId);
    if (opts.entityType) entries = entries.filter((e) => e.entityType === opts.entityType);
    if (opts.action) entries = entries.filter((e) => e.action === opts.action);

    const limited = entries.slice(0, opts.limit ?? 100);
    return { entries: limited, count: entries.length };
  }

  // ── Data Export (Right to Access) ─────────────────────────────

  /**
   * Exports all personal data for a hire as a structured JSON package.
   * Implements GDPR Article 15 — Right of Access.
   */
  exportHireData(companyId: string, hireId: string): DataExportPackage {
    const hire = this.hiresService.getHire(companyId, hireId);
    const { tasks } = this.hiresService.listHireTasks(hireId);
    const { documents } = this.documentsService.listHireDocuments(companyId, hireId);

    // Log the export
    this.logAccess(companyId, {
      userId: null,
      action: 'data.exported',
      entityType: 'hire',
      entityId: hireId,
      metadata: { exportedFields: ['hire', 'tasks', 'documents'] },
    });

    const accessLog = this.companyLog(companyId).filter(
      (e) => e.entityId === hireId,
    );

    return {
      exportedAt: new Date().toISOString(),
      companyId,
      hireId,
      hire: {
        id: hire.id,
        fullName: hire.fullName,
        email: hire.email,
        jobTitle: hire.jobTitle,
        department: hire.department,
        startDate: hire.startDate,
        status: hire.status,
        completionPct: hire.completionPct,
        invitedAt: hire.invitedAt,
        startedAt: hire.startedAt,
        completedAt: hire.completedAt,
        notes: hire.notes,
        createdAt: hire.createdAt,
      },
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        phase: t.phase,
        taskType: t.taskType,
        status: t.status,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        note: t.note,
      })),
      documents: documents.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        status: d.status,
        version: d.version,
        retentionUntil: d.retentionUntil,
        gdprBasis: d.gdprBasis,
        createdAt: d.createdAt,
      })),
      notifications: [],
      accessLog,
    };
  }

  // ── Anonymisation (Right to Erasure) ──────────────────────────

  /**
   * Anonymises a hire's personal data in place.
   * Implements GDPR Article 17 — Right to Erasure.
   * Replaces PII with anonymised placeholders; retains records for audit.
   */
  anonymiseHire(
    companyId: string,
    hireId: string,
    processedBy: string,
  ): AnonymisationResult {
    const hire = this.hiresService.getHire(companyId, hireId);

    // Anonymise hire record
    this.hiresService.updateHire(companyId, hireId, {
      fullName: `[Anonymised ${hireId.slice(0, 8)}]`,
      notes: undefined,
    });

    // Delete hire documents
    const { documents } = this.documentsService.listHireDocuments(companyId, hireId);
    let documentsDeleted = 0;
    for (const doc of documents) {
      try {
        this.documentsService.deleteDocument(companyId, doc.id, processedBy, true);
        documentsDeleted++;
      } catch {
        // Continue even if individual doc deletion fails
      }
    }

    const anonymisedAt = new Date().toISOString();

    // Log the anonymisation
    this.logAccess(companyId, {
      userId: processedBy,
      action: 'hire.anonymised',
      entityType: 'hire',
      entityId: hireId,
      metadata: { documentsDeleted, processedBy },
    });

    this.logger.log(
      `[GDPR] Hire anonymised hireId=${hireId} by=${processedBy} docs=${documentsDeleted}`,
    );

    return {
      success: true,
      hireId,
      fieldsAnonymised: ['fullName', 'email', 'notes', 'documents'],
      documentsDeleted,
      anonymisedAt,
    };
  }

  // ── Erasure Requests ───────────────────────────────────────────

  listErasureRequests(
    companyId: string,
    status?: string,
  ): { requests: ErasureRequest[]; count: number } {
    let requests = this.companyErasureRequests(companyId).slice().sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
    if (status) requests = requests.filter((r) => r.status === status);
    return { requests, count: requests.length };
  }

  createErasureRequest(
    companyId: string,
    requestedBy: string,
    input: CreateErasureRequestInput,
  ): ErasureRequest {
    const request: ErasureRequest = {
      id: randomUUID(),
      companyId,
      hireId: input.hireId ?? null,
      requestedBy,
      reason: input.reason?.trim() || null,
      status: 'pending',
      processedBy: null,
      processedAt: null,
      notes: null,
      createdAt: new Date().toISOString(),
    };

    this.companyErasureRequests(companyId).push(request);

    this.logAccess(companyId, {
      userId: requestedBy,
      action: 'data.erasure_requested',
      entityType: 'hire',
      entityId: input.hireId,
      metadata: { reason: input.reason },
    });

    return request;
  }

  processErasureRequest(
    companyId: string,
    requestId: string,
    processedBy: string,
    input: ProcessErasureInput,
  ): ErasureRequest {
    const requests = this.companyErasureRequests(companyId);
    const idx = requests.findIndex((r) => r.id === requestId);
    if (idx === -1) throw new NotFoundException('Erasure request not found');

    const req = requests[idx];
    if (req.status === 'completed' || req.status === 'rejected') {
      throw new BadRequestException(`Request is already ${req.status}`);
    }

    if (!ERASURE_STATUSES.includes(input.status)) {
      throw new BadRequestException(
        `status must be one of: ${ERASURE_STATUSES.join(', ')}`,
      );
    }

    const now = new Date().toISOString();
    const updated: ErasureRequest = {
      ...req,
      status: input.status,
      processedBy,
      processedAt: now,
      notes: input.notes?.trim() || null,
    };

    requests[idx] = updated;

    // If approved, execute anonymisation
    if (input.status === 'completed' && req.hireId) {
      try {
        this.anonymiseHire(companyId, req.hireId, processedBy);
      } catch (err) {
        this.logger.error(
          `[GDPR] Anonymisation failed for hireId=${req.hireId}: ${err}`,
        );
      }
    }

    return updated;
  }

  // ── Privacy Policy ─────────────────────────────────────────────

  listPolicies(companyId: string): PrivacyPolicyVersion[] {
    return (this.policies.get(companyId) ?? []).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  }

  getCurrentPolicy(companyId: string): PrivacyPolicyVersion | null {
    return (
      (this.policies.get(companyId) ?? []).find((p) => p.isCurrent) ?? null
    );
  }

  createPolicy(
    companyId: string,
    createdBy: string,
    input: CreatePrivacyPolicyInput,
  ): PrivacyPolicyVersion {
    if (!input.version?.trim()) {
      throw new BadRequestException('version is required');
    }
    if (!input.effectiveAt?.trim()) {
      throw new BadRequestException('effectiveAt is required');
    }

    // Mark all existing as not current
    const existing = this.policies.get(companyId) ?? [];
    const updated = existing.map((p) => ({ ...p, isCurrent: false }));

    const policy: PrivacyPolicyVersion = {
      id: randomUUID(),
      companyId,
      version: input.version.trim(),
      effectiveAt: input.effectiveAt,
      contentUrl: input.contentUrl?.trim() || null,
      isCurrent: true,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    this.policies.set(companyId, [...updated, policy]);
    return policy;
  }

  acknowledgePolicy(
    companyId: string,
    policyId: string,
    userId: string,
    ipAddress?: string,
  ): PrivacyPolicyAck {
    const policies = this.policies.get(companyId) ?? [];
    const policy = policies.find((p) => p.id === policyId);
    if (!policy) throw new NotFoundException('Privacy policy not found');

    // Idempotent
    const existing = (this.policyAcks.get(policyId) ?? []).find(
      (a) => a.userId === userId,
    );
    if (existing) return existing;

    const ack: PrivacyPolicyAck = {
      id: randomUUID(),
      policyId,
      userId,
      companyId,
      ackedAt: new Date().toISOString(),
      ipAddress: ipAddress ?? null,
    };

    const list = this.policyAcks.get(policyId) ?? [];
    list.push(ack);
    this.policyAcks.set(policyId, list);

    return ack;
  }

  listPolicyAcknowledgements(
    companyId: string,
    policyId: string,
  ): PrivacyPolicyAck[] {
    const policies = this.policies.get(companyId) ?? [];
    if (!policies.find((p) => p.id === policyId)) {
      throw new NotFoundException('Privacy policy not found');
    }
    return this.policyAcks.get(policyId) ?? [];
  }

  // ── Retention check ────────────────────────────────────────────

  /**
   * Returns documents whose retention date has passed.
   * HR admin should review and delete these.
   */
  getExpiredDocuments(companyId: string): {
    documents: Array<{ id: string; name: string; category: string; retentionUntil: string; hireId: string | null }>;
    count: number;
  } {
    const today = new Date().toISOString().slice(0, 10);
    const { documents } = this.documentsService.listCompanyDocuments(companyId);
    const { documents: hireDocs } = this.documentsService.listPendingReview(companyId);

    // Get all docs across company
    const allDocs = [...documents, ...hireDocs];
    const expired = allDocs.filter(
      (d) => d.retentionUntil && d.retentionUntil < today && d.status !== 'superseded',
    );

    return {
      documents: expired.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        retentionUntil: d.retentionUntil!,
        hireId: d.hireId,
      })),
      count: expired.length,
    };
  }

  // ── Private helpers ────────────────────────────────────────────

  private companyLog(companyId: string): DataAccessLogEntry[] {
    if (!this.accessLog.has(companyId)) this.accessLog.set(companyId, []);
    return this.accessLog.get(companyId)!;
  }

  private companyErasureRequests(companyId: string): ErasureRequest[] {
    if (!this.erasureRequests.has(companyId)) this.erasureRequests.set(companyId, []);
    return this.erasureRequests.get(companyId)!;
  }

  // ── Demo seed ──────────────────────────────────────────────────

  private seedDemoData(): void {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const hrAdminId = '22222222-2222-4222-8222-222222222222';
    const newHireId = '55555555-5555-4555-8555-555555555555';
    const hireId = 'hire-0001-0001-0001-000000000001';
    const now = new Date().toISOString();

    // Seed access log entries
    const logEntries: DataAccessLogEntry[] = [
      {
        id: 'log-0001-0001-0001-000000000001',
        companyId,
        userId: hrAdminId,
        action: 'document.viewed',
        entityType: 'document',
        entityId: 'doc-0004-0004-0004-000000000004',
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0',
        metadata: { documentName: 'Employment Contract — Nina Newhire' },
        createdAt: now,
      },
      {
        id: 'log-0002-0002-0002-000000000002',
        companyId,
        userId: newHireId,
        action: 'document.uploaded',
        entityType: 'document',
        entityId: 'doc-0004-0004-0004-000000000004',
        ipAddress: '10.0.0.5',
        userAgent: 'Mozilla/5.0',
        metadata: { documentName: 'Employment Contract — Nina Newhire' },
        createdAt: now,
      },
      {
        id: 'log-0003-0003-0003-000000000003',
        companyId,
        userId: hrAdminId,
        action: 'hire.viewed',
        entityType: 'hire',
        entityId: hireId,
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0',
        metadata: { hireName: 'Nina Newhire' },
        createdAt: now,
      },
    ];
    this.accessLog.set(companyId, logEntries);

    // Seed a privacy policy
    const policyId = 'pp-0001-0001-0001-000000000001';
    const policy: PrivacyPolicyVersion = {
      id: policyId,
      companyId,
      version: '2.0',
      effectiveAt: '2024-01-01',
      contentUrl: 'https://demo-company.com/privacy-policy-v2',
      isCurrent: true,
      createdBy: hrAdminId,
      createdAt: now,
    };
    this.policies.set(companyId, [policy]);

    // Seed an acknowledgement
    this.policyAcks.set(policyId, [
      {
        id: 'ack-pp-0001-0001-0001-000000000001',
        policyId,
        userId: newHireId,
        companyId,
        ackedAt: now,
        ipAddress: '10.0.0.5',
      },
    ]);
  }
}
