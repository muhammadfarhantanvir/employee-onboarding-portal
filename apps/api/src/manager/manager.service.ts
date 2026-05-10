import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HiresService } from '../hires/hires.service';
import { PHASES, Phase } from '../templates/templates.types';
import { Hire, HireTask } from '../hires/hires.types';
import {
  ApprovePhaseInput,
  CreateManagerNoteInput,
  DocumentReuploadRequest,
  ManagerDashboardResponse,
  ManagerHireView,
  ManagerNote,
  PhaseApproval,
  RequestReuploadInput,
  UpdateManagerNoteInput,
} from './manager.types';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ManagerService {
  /** hireId → phase → PhaseApproval */
  private readonly phaseApprovals = new Map<string, Map<Phase, PhaseApproval>>();
  /** hireId → noteId → ManagerNote */
  private readonly managerNotes = new Map<string, Map<string, ManagerNote>>();
  /** hireId → requestId → DocumentReuploadRequest */
  private readonly reuploadRequests = new Map<string, Map<string, DocumentReuploadRequest>>();

  constructor(
    private readonly hiresService: HiresService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.seedDemoData();
  }

  // ── Manager Dashboard ──────────────────────────────────────────

  /**
   * Returns all hires where managerId === the requesting manager,
   * enriched with phase approvals, notes, and progress summary.
   */
  getManagerDashboard(
    companyId: string,
    managerId: string,
  ): ManagerDashboardResponse {
    const { hires } = this.hiresService.listHires(companyId);
    const myHires = hires.filter((h) => h.managerId === managerId);

    const views: ManagerHireView[] = myHires.map((hire) =>
      this.buildHireView(companyId, hire),
    );

    const summary = {
      total: views.length,
      pendingInvite: views.filter((v) => v.status === 'pending_invite').length,
      inProgress: views.filter((v) => v.status === 'in_progress').length,
      atRisk: views.filter((v) => v.status === 'at_risk').length,
      completed: views.filter((v) => v.status === 'completed').length,
      pendingApproval: views.filter(
        (v) =>
          v.completionPct === 100 &&
          v.status !== 'completed' &&
          v.status !== 'cancelled',
      ).length,
    };

    return { hires: views, count: views.length, summary };
  }

  /**
   * Get a single hire enriched with manager-specific data.
   * Validates the requesting manager owns this hire.
   */
  getManagerHireView(
    companyId: string,
    hireId: string,
    managerId: string,
  ): ManagerHireView {
    const hire = this.requireHireForManager(companyId, hireId, managerId);
    return this.buildHireView(companyId, hire);
  }

  // ── Phase Approvals ────────────────────────────────────────────

  listPhaseApprovals(hireId: string): PhaseApproval[] {
    return Array.from(this.hirePhaseApprovals(hireId).values());
  }

  approvePhase(
    companyId: string,
    hireId: string,
    managerId: string,
    input: ApprovePhaseInput,
  ): PhaseApproval {
    const hire = this.requireHireForManager(companyId, hireId, managerId);

    if (!PHASES.includes(input.phase)) {
      throw new BadRequestException(
        `phase must be one of: ${PHASES.join(', ')}`,
      );
    }

    // Check phase is not already approved
    const existing = this.hirePhaseApprovals(hireId).get(input.phase);
    if (existing) {
      throw new ConflictException(
        `Phase "${input.phase}" is already approved`,
      );
    }

    // Validate the phase has tasks and they are all completed
    const { tasks } = this.hiresService.listHireTasks(hireId);
    const phaseTasks = tasks.filter((t) => t.phase === input.phase && t.isRequired);
    const allDone = phaseTasks.every((t) => t.status === 'completed');

    if (phaseTasks.length > 0 && !allDone) {
      const remaining = phaseTasks.filter((t) => t.status !== 'completed').length;
      throw new BadRequestException(
        `Cannot approve phase "${input.phase}" — ${remaining} required task(s) are not yet completed`,
      );
    }

    const approval: PhaseApproval = {
      id: randomUUID(),
      hireId,
      companyId,
      managerId,
      phase: input.phase,
      approvedAt: new Date().toISOString(),
      note: input.note?.trim() || null,
    };

    this.hirePhaseApprovals(hireId).set(input.phase, approval);

    // Notify HR admin
    this.notificationsService.create({
      companyId,
      userId: hire.createdBy ?? companyId,
      type: 'approval_needed',
      title: `Phase approved: ${input.phase.replace(/_/g, ' ')} for ${hire.fullName}`,
      body: input.note ?? `Manager approved the ${input.phase.replace(/_/g, ' ')} phase.`,
      link: `/hires/${hireId}`,
      metadata: { hireId, phase: input.phase, managerId },
    });

    return approval;
  }

  revokePhaseApproval(
    companyId: string,
    hireId: string,
    managerId: string,
    phase: Phase,
  ): { success: boolean } {
    this.requireHireForManager(companyId, hireId, managerId);

    const approvals = this.hirePhaseApprovals(hireId);
    if (!approvals.has(phase)) {
      throw new NotFoundException(`Phase "${phase}" has not been approved`);
    }

    approvals.delete(phase);
    return { success: true };
  }

  // ── Final Approval ─────────────────────────────────────────────

  /**
   * Manager gives final sign-off on the entire onboarding.
   * Marks hire as completed and notifies HR.
   */
  giveFinaApproval(
    companyId: string,
    hireId: string,
    managerId: string,
    note?: string,
  ): ManagerHireView {
    const hire = this.requireHireForManager(companyId, hireId, managerId);

    if (hire.status === 'completed') {
      throw new ConflictException('Hire onboarding is already completed');
    }
    if (hire.status === 'cancelled') {
      throw new ConflictException('Cannot approve a cancelled hire');
    }

    // Approve the hire via HiresService
    this.hiresService.approveHire(companyId, hireId);

    // Notify HR admin
    this.notificationsService.create({
      companyId,
      userId: hire.createdBy ?? companyId,
      type: 'hire_completed',
      title: `Onboarding approved: ${hire.fullName}`,
      body: note ?? `Manager has given final approval for ${hire.fullName}'s onboarding.`,
      link: `/hires/${hireId}`,
      metadata: { hireId, managerId },
    });

    // Notify new hire
    if (hire.userId) {
      this.notificationsService.create({
        companyId,
        userId: hire.userId,
        type: 'hire_completed',
        title: 'Onboarding complete!',
        body: 'Your manager has approved your onboarding. Welcome to the team!',
        link: `/hires/${hireId}`,
        metadata: { hireId },
      });
    }

    return this.buildHireView(companyId, this.hiresService.getHire(companyId, hireId));
  }

  // ── Manager Notes ──────────────────────────────────────────────

  listManagerNotes(
    companyId: string,
    hireId: string,
    managerId: string,
  ): ManagerNote[] {
    this.requireHireForManager(companyId, hireId, managerId);
    return Array.from(this.hireNotes(hireId).values()).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  }

  createManagerNote(
    companyId: string,
    hireId: string,
    managerId: string,
    input: CreateManagerNoteInput,
  ): ManagerNote {
    this.requireHireForManager(companyId, hireId, managerId);

    if (!input.body?.trim()) {
      throw new BadRequestException('body is required');
    }

    const now = new Date().toISOString();
    const note: ManagerNote = {
      id: randomUUID(),
      hireId,
      companyId,
      managerId,
      body: input.body.trim(),
      createdAt: now,
      updatedAt: now,
    };

    this.hireNotes(hireId).set(note.id, note);
    return note;
  }

  updateManagerNote(
    companyId: string,
    hireId: string,
    noteId: string,
    managerId: string,
    input: UpdateManagerNoteInput,
  ): ManagerNote {
    this.requireHireForManager(companyId, hireId, managerId);

    const notes = this.hireNotes(hireId);
    const existing = notes.get(noteId);
    if (!existing) throw new NotFoundException('Manager note not found');
    if (existing.managerId !== managerId) {
      throw new ForbiddenException('You can only edit your own notes');
    }
    if (!input.body?.trim()) {
      throw new BadRequestException('body is required');
    }

    const updated: ManagerNote = {
      ...existing,
      body: input.body.trim(),
      updatedAt: new Date().toISOString(),
    };
    notes.set(noteId, updated);
    return updated;
  }

  deleteManagerNote(
    companyId: string,
    hireId: string,
    noteId: string,
    managerId: string,
  ): void {
    this.requireHireForManager(companyId, hireId, managerId);

    const notes = this.hireNotes(hireId);
    const existing = notes.get(noteId);
    if (!existing) throw new NotFoundException('Manager note not found');
    if (existing.managerId !== managerId) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    notes.delete(noteId);
  }

  // ── Document Re-upload Requests ────────────────────────────────

  listReuploadRequests(
    companyId: string,
    hireId: string,
    managerId: string,
  ): DocumentReuploadRequest[] {
    this.requireHireForManager(companyId, hireId, managerId);
    return Array.from(this.hireReuploadRequests(hireId).values()).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  }

  requestDocumentReupload(
    companyId: string,
    hireId: string,
    managerId: string,
    input: RequestReuploadInput,
  ): DocumentReuploadRequest {
    const hire = this.requireHireForManager(companyId, hireId, managerId);

    if (!input.reason?.trim()) {
      throw new BadRequestException('reason is required');
    }

    const now = new Date().toISOString();
    const request: DocumentReuploadRequest = {
      id: randomUUID(),
      documentId: input.documentId,
      hireId,
      companyId,
      requestedBy: managerId,
      reason: input.reason.trim(),
      status: 'pending',
      resolvedAt: null,
      createdAt: now,
    };

    this.hireReuploadRequests(hireId).set(request.id, request);

    // Notify new hire
    if (hire.userId) {
      this.notificationsService.create({
        companyId,
        userId: hire.userId,
        type: 'doc_rejected',
        title: 'Document re-upload requested',
        body: input.reason.trim(),
        link: `/documents/${input.documentId}`,
        metadata: { documentId: input.documentId, hireId, requestId: request.id },
      });
    }

    return request;
  }

  cancelReuploadRequest(
    companyId: string,
    hireId: string,
    requestId: string,
    managerId: string,
  ): DocumentReuploadRequest {
    this.requireHireForManager(companyId, hireId, managerId);

    const requests = this.hireReuploadRequests(hireId);
    const existing = requests.get(requestId);
    if (!existing) throw new NotFoundException('Re-upload request not found');
    if (existing.status !== 'pending') {
      throw new ConflictException('Only pending requests can be cancelled');
    }

    const updated: DocumentReuploadRequest = {
      ...existing,
      status: 'cancelled',
      resolvedAt: new Date().toISOString(),
    };
    requests.set(requestId, updated);
    return updated;
  }

  // ── Private helpers ────────────────────────────────────────────

  private requireHireForManager(
    companyId: string,
    hireId: string,
    managerId: string,
  ): Hire {
    const hire = this.hiresService.getHire(companyId, hireId);
    if (hire.managerId !== managerId) {
      throw new ForbiddenException(
        'You are not the assigned manager for this hire',
      );
    }
    return hire;
  }

  private hirePhaseApprovals(hireId: string): Map<Phase, PhaseApproval> {
    if (!this.phaseApprovals.has(hireId)) {
      this.phaseApprovals.set(hireId, new Map());
    }
    return this.phaseApprovals.get(hireId)!;
  }

  private hireNotes(hireId: string): Map<string, ManagerNote> {
    if (!this.managerNotes.has(hireId)) {
      this.managerNotes.set(hireId, new Map());
    }
    return this.managerNotes.get(hireId)!;
  }

  private hireReuploadRequests(hireId: string): Map<string, DocumentReuploadRequest> {
    if (!this.reuploadRequests.has(hireId)) {
      this.reuploadRequests.set(hireId, new Map());
    }
    return this.reuploadRequests.get(hireId)!;
  }

  private buildHireView(companyId: string, hire: Hire): ManagerHireView {
    const { tasks } = this.hiresService.listHireTasks(hire.id);
    const phaseApprovals = Array.from(this.hirePhaseApprovals(hire.id).values());
    const managerNotes = Array.from(this.hireNotes(hire.id).values()).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
    const pendingReuploadRequests = Array.from(
      this.hireReuploadRequests(hire.id).values(),
    ).filter((r) => r.status === 'pending');

    const today = new Date().toISOString().slice(0, 10);
    const startMs = new Date(hire.startDate).getTime();
    const daysUntilStart = Math.ceil(
      (startMs - Date.now()) / 86400000,
    );

    const overdueTaskCount = tasks.filter(
      (t) =>
        t.status === 'pending' &&
        t.dueDate &&
        t.dueDate < today &&
        t.isRequired,
    ).length;

    const approvedPhases = new Set(phaseApprovals.map((a) => a.phase));
    const phaseProgress = PHASES.reduce(
      (acc, phase) => {
        const phaseTasks = tasks.filter((t) => t.phase === phase);
        const completed = phaseTasks.filter((t) => t.status === 'completed').length;
        return {
          ...acc,
          [phase]: {
            total: phaseTasks.length,
            completed,
            approved: approvedPhases.has(phase),
          },
        };
      },
      {} as Record<Phase, { total: number; completed: number; approved: boolean }>,
    );

    return {
      ...hire,
      tasks,
      phaseApprovals,
      managerNotes,
      pendingReuploadRequests,
      daysUntilStart,
      overdueTaskCount,
      phaseProgress,
    };
  }

  // ── Demo seed ──────────────────────────────────────────────────

  private seedDemoData(): void {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const managerId = '33333333-3333-4333-8333-333333333333';
    const hireId = 'hire-0001-0001-0001-000000000001';
    const now = new Date().toISOString();

    // Seed a pre-boarding phase approval for Nina
    const preBoardingApproval: PhaseApproval = {
      id: 'pa-0001-0001-0001-000000000001',
      hireId,
      companyId,
      managerId,
      phase: 'pre_boarding',
      approvedAt: now,
      note: 'All pre-boarding tasks completed. Laptop delivered and accounts set up.',
    };
    this.hirePhaseApprovals(hireId).set('pre_boarding', preBoardingApproval);

    // Seed a manager note
    const note: ManagerNote = {
      id: 'mn-0001-0001-0001-000000000001',
      hireId,
      companyId,
      managerId,
      body: 'Nina is settling in well. Strong technical background. Recommend fast-tracking to senior role review at 90 days.',
      createdAt: now,
      updatedAt: now,
    };
    this.hireNotes(hireId).set(note.id, note);
  }
}
