import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TemplatesService } from '../templates/templates.service';
import { MetricsService } from '../observability/metrics.service';
import { PHASES, Phase, ASSIGNED_ROLES, AssignedRole } from '../templates/templates.types';
import {
  CreateHireInput,
  Hire,
  HireListResponse,
  HireResponse,
  HireStatus,
  HireTask,
  HireTaskStatus,
  HireTasksResponse,
  HIRE_STATUSES,
  HIRE_TASK_STATUSES,
  UpdateHireInput,
  UpdateHireTaskInput,
} from './hires.types';

@Injectable()
export class HiresService {
  /** companyId → hireId → Hire */
  private readonly hires = new Map<string, Map<string, Hire>>();
  /** hireId → taskId → HireTask */
  private readonly tasks = new Map<string, Map<string, HireTask>>();

  constructor(
    private readonly templatesService: TemplatesService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {
    this.seedDemoHires();
    this.syncBusinessMetrics();
  }

  // ── Hires ──────────────────────────────────────────────────────

  listHires(companyId: string, status?: string): HireListResponse {
    const all = Array.from(this.companyHires(companyId).values()).sort(
      (a, b) => a.startDate.localeCompare(b.startDate),
    );

    const filtered = status
      ? all.filter((h) => h.status === status)
      : all;

    const byStatus = HIRE_STATUSES.reduce(
      (acc, s) => ({ ...acc, [s]: all.filter((h) => h.status === s).length }),
      {} as Record<HireStatus, number>,
    );

    return { hires: filtered, count: filtered.length, byStatus };
  }

  getHire(companyId: string, hireId: string): HireResponse {
    const hire = this.requireHire(companyId, hireId);
    const tasks = this.listHireTasks(hireId).tasks;
    return { ...hire, tasks };
  }

  /** HR admin / manager view — returns hire with full task list */
  getHireWithTasks(companyId: string, hireId: string): HireResponse {
    return this.getHire(companyId, hireId);
  }

  createHire(
    companyId: string,
    input: CreateHireInput,
    createdBy: string,
  ): HireResponse {
    const fullName = this.requireString(input.fullName, 'fullName', 2, 200);
    const email = this.requireEmail(input.email);
    const startDate = this.requireDate(input.startDate, 'startDate');

    // Unique email per company
    const existing = Array.from(this.companyHires(companyId).values()).find(
      (h) => h.email === email && h.status !== 'cancelled',
    );
    if (existing) {
      throw new ConflictException(
        'A hire with this email already exists in this company',
      );
    }

    const now = new Date().toISOString();
    const hire: Hire = {
      id: randomUUID(),
      companyId,
      userId: null,
      managerId: input.managerId ?? null,
      templateId: input.templateId ?? null,
      fullName,
      email,
      jobTitle: input.jobTitle?.trim() || null,
      department: input.department?.trim() || null,
      startDate,
      status: 'pending_invite',
      completionPct: 0,
      invitedAt: now,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      notes: input.notes?.trim() || null,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.companyHires(companyId).set(hire.id, hire);

    // Instantiate tasks from template if provided
    if (input.templateId) {
      this.instantiateTasksFromTemplate(hire, input.templateId, companyId);
    }

    this.metricsService?.recordHireInviteSent(companyId);
    this.syncBusinessMetrics(companyId);
    return this.getHire(companyId, hire.id);
  }

  updateHire(
    companyId: string,
    hireId: string,
    input: UpdateHireInput,
  ): HireResponse {
    const hire = this.requireHire(companyId, hireId);
    const now = new Date().toISOString();

    if (input.status && !HIRE_STATUSES.includes(input.status)) {
      throw new BadRequestException(
        `status must be one of: ${HIRE_STATUSES.join(', ')}`,
      );
    }

    const updated: Hire = {
      ...hire,
      fullName:
        input.fullName !== undefined
          ? this.requireString(input.fullName, 'fullName', 2, 200)
          : hire.fullName,
      jobTitle:
        input.jobTitle !== undefined
          ? input.jobTitle?.trim() || null
          : hire.jobTitle,
      department:
        input.department !== undefined
          ? input.department?.trim() || null
          : hire.department,
      startDate:
        input.startDate !== undefined
          ? this.requireDate(input.startDate, 'startDate')
          : hire.startDate,
      managerId:
        input.managerId !== undefined ? input.managerId : hire.managerId,
      templateId:
        input.templateId !== undefined ? input.templateId : hire.templateId,
      status: input.status ?? hire.status,
      notes:
        input.notes !== undefined
          ? input.notes?.trim() || null
          : hire.notes,
      completedAt:
        input.status === 'completed' && !hire.completedAt ? now : hire.completedAt,
      cancelledAt:
        input.status === 'cancelled' && !hire.cancelledAt ? now : hire.cancelledAt,
      startedAt:
        input.status === 'in_progress' && !hire.startedAt ? now : hire.startedAt,
      updatedAt: now,
    };

    this.companyHires(companyId).set(hireId, updated);
    this.syncBusinessMetrics(companyId);
    return this.getHire(companyId, hireId);
  }

  approveHire(companyId: string, hireId: string): HireResponse {
    const hire = this.requireHire(companyId, hireId);
    if (hire.status === 'completed') {
      throw new ConflictException('Hire onboarding is already completed');
    }
    if (hire.status === 'cancelled') {
      throw new ConflictException('Cannot approve a cancelled hire');
    }
    return this.updateHire(companyId, hireId, { status: 'completed' });
  }

  cancelHire(companyId: string, hireId: string): { success: boolean } {
    const hire = this.requireHire(companyId, hireId);
    if (hire.status === 'cancelled') {
      throw new ConflictException('Hire is already cancelled');
    }
    this.updateHire(companyId, hireId, { status: 'cancelled' });
    return { success: true };
  }

  resendInvite(companyId: string, hireId: string): { success: boolean; message: string } {
    const hire = this.requireHire(companyId, hireId);
    if (hire.status === 'cancelled') {
      throw new ConflictException('Cannot resend invite to a cancelled hire');
    }
    if (hire.status === 'completed') {
      throw new ConflictException('Hire has already completed onboarding');
    }
    // In production: trigger email service here
    this.metricsService?.recordHireInviteSent(companyId);
    return { success: true, message: `Invite resent to ${hire.email}` };
  }

  // ── Hire Tasks ─────────────────────────────────────────────────

  listHireTasks(hireId: string, phase?: string): HireTasksResponse {
    const all = Array.from(this.hireTaskStore(hireId).values()).sort(
      (a, b) => {
        const phaseOrder = PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase);
        return phaseOrder !== 0 ? phaseOrder : a.sortOrder - b.sortOrder;
      },
    );

    const filtered = phase ? all.filter((t) => t.phase === phase) : all;

    const byPhase = PHASES.reduce(
      (acc, p) => ({ ...acc, [p]: all.filter((t) => t.phase === p).length }),
      {} as Record<Phase, number>,
    );

    const byStatus = HIRE_TASK_STATUSES.reduce(
      (acc, s) => ({ ...acc, [s]: all.filter((t) => t.status === s).length }),
      {} as Record<HireTaskStatus, number>,
    );

    const total = all.length;
    const done = all.filter((t) => t.status === 'completed').length;
    const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);

    return { tasks: filtered, count: filtered.length, byPhase, byStatus, completionPct };
  }

  getHireTask(hireId: string, taskId: string): HireTask {
    return this.requireHireTask(hireId, taskId);
  }

  completeTask(
    companyId: string,
    hireId: string,
    taskId: string,
  ): HireTask {
    this.requireHire(companyId, hireId);
    const task = this.requireHireTask(hireId, taskId);

    if (task.status === 'completed') {
      throw new ConflictException('Task is already completed');
    }
    if (task.status === 'skipped') {
      throw new ConflictException('Cannot complete a skipped task');
    }

    const now = new Date().toISOString();
    const updated: HireTask = {
      ...task,
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    };

    this.hireTaskStore(hireId).set(taskId, updated);
    this.metricsService?.recordTaskCompleted(companyId);
    this.recalculateCompletion(companyId, hireId);
    return updated;
  }

  skipTask(
    companyId: string,
    hireId: string,
    taskId: string,
  ): HireTask {
    this.requireHire(companyId, hireId);
    const task = this.requireHireTask(hireId, taskId);

    if (task.isRequired) {
      throw new BadRequestException('Required tasks cannot be skipped');
    }
    if (task.status === 'completed') {
      throw new ConflictException('Cannot skip a completed task');
    }
    if (task.status === 'skipped') {
      throw new ConflictException('Task is already skipped');
    }

    const now = new Date().toISOString();
    const updated: HireTask = {
      ...task,
      status: 'skipped',
      skippedAt: now,
      updatedAt: now,
    };

    this.hireTaskStore(hireId).set(taskId, updated);
    this.recalculateCompletion(companyId, hireId);
    return updated;
  }

  blockTask(
    companyId: string,
    hireId: string,
    taskId: string,
    note?: string,
  ): HireTask {
    this.requireHire(companyId, hireId);
    const task = this.requireHireTask(hireId, taskId);

    if (task.status === 'completed') {
      throw new ConflictException('Cannot block a completed task');
    }

    const now = new Date().toISOString();
    const updated: HireTask = {
      ...task,
      status: 'blocked',
      note: note ?? task.note,
      updatedAt: now,
    };

    this.hireTaskStore(hireId).set(taskId, updated);
    return updated;
  }

  addNote(
    companyId: string,
    hireId: string,
    taskId: string,
    note: string,
  ): HireTask {
    this.requireHire(companyId, hireId);
    const task = this.requireHireTask(hireId, taskId);

    if (!note?.trim()) {
      throw new BadRequestException('note is required');
    }

    const updated: HireTask = {
      ...task,
      note: note.trim(),
      updatedAt: new Date().toISOString(),
    };

    this.hireTaskStore(hireId).set(taskId, updated);
    return updated;
  }

  updateTask(
    companyId: string,
    hireId: string,
    taskId: string,
    input: UpdateHireTaskInput,
  ): HireTask {
    this.requireHire(companyId, hireId);
    const task = this.requireHireTask(hireId, taskId);

    if (input.status && !HIRE_TASK_STATUSES.includes(input.status)) {
      throw new BadRequestException(
        `status must be one of: ${HIRE_TASK_STATUSES.join(', ')}`,
      );
    }

    const now = new Date().toISOString();
    const updated: HireTask = {
      ...task,
      status: input.status ?? task.status,
      assignedTo:
        input.assignedTo !== undefined ? input.assignedTo : task.assignedTo,
      dueDate:
        input.dueDate !== undefined ? input.dueDate : task.dueDate,
      note: input.note !== undefined ? input.note?.trim() || null : task.note,
      completedAt:
        input.status === 'completed' && !task.completedAt
          ? now
          : task.completedAt,
      skippedAt:
        input.status === 'skipped' && !task.skippedAt ? now : task.skippedAt,
      updatedAt: now,
    };

    this.hireTaskStore(hireId).set(taskId, updated);
    if (task.status !== 'completed' && updated.status === 'completed') {
      this.metricsService?.recordTaskCompleted(companyId);
    }
    this.recalculateCompletion(companyId, hireId);
    return updated;
  }

  /** Get tasks assigned to a specific user across all hires in the company */
  getMyTasks(companyId: string, userId: string): HireTask[] {
    const allHires = Array.from(this.companyHires(companyId).values()).filter(
      (h) => h.status !== 'cancelled',
    );

    const myTasks: HireTask[] = [];
    for (const hire of allHires) {
      const hireTasks = Array.from(this.hireTaskStore(hire.id).values()).filter(
        (t) => t.assignedTo === userId && t.status !== 'completed' && t.status !== 'skipped',
      );
      myTasks.push(...hireTasks);
    }

    return myTasks.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }

  // ── Private helpers ────────────────────────────────────────────

  private companyHires(companyId: string): Map<string, Hire> {
    if (!this.hires.has(companyId)) {
      this.hires.set(companyId, new Map());
    }
    return this.hires.get(companyId)!;
  }

  private hireTaskStore(hireId: string): Map<string, HireTask> {
    if (!this.tasks.has(hireId)) {
      this.tasks.set(hireId, new Map());
    }
    return this.tasks.get(hireId)!;
  }

  private requireHire(companyId: string, hireId: string): Hire {
    const hire = this.companyHires(companyId).get(hireId);
    if (!hire) throw new NotFoundException('Hire not found');
    return hire;
  }

  private requireHireTask(hireId: string, taskId: string): HireTask {
    const task = this.hireTaskStore(hireId).get(taskId);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private requireString(value: unknown, field: string, min: number, max: number): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    const trimmed = value.trim();
    if (trimmed.length < min || trimmed.length > max) {
      throw new BadRequestException(`${field} must be between ${min} and ${max} characters`);
    }
    return trimmed;
  }

  private requireEmail(value: unknown): string {
    const str = this.requireString(value, 'email', 3, 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      throw new BadRequestException('email must be a valid email address');
    }
    return str.toLowerCase();
  }

  private requireDate(value: unknown, field: string): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must be a valid date in YYYY-MM-DD format`);
    }
    return value;
  }

  private recalculateCompletion(companyId: string, hireId: string): void {
    const hire = this.companyHires(companyId).get(hireId);
    if (!hire) return;

    const allTasks = Array.from(this.hireTaskStore(hireId).values());
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === 'completed').length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    const now = new Date().toISOString();
    let newStatus: HireStatus = hire.status;

    if (pct === 100 && hire.status === 'in_progress') {
      newStatus = 'completed';
    } else if (pct > 0 && hire.status === 'pending_invite') {
      newStatus = 'in_progress';
    }

    // Mark at_risk if overdue tasks exist
    const today = new Date().toISOString().slice(0, 10);
    const hasOverdue = allTasks.some(
      (t) =>
        t.status === 'pending' &&
        t.dueDate &&
        t.dueDate < today &&
        t.isRequired,
    );
    if (hasOverdue && newStatus === 'in_progress') {
      newStatus = 'at_risk';
    }

    const updated: Hire = {
      ...hire,
      completionPct: pct,
      status: newStatus,
      completedAt: newStatus === 'completed' && !hire.completedAt ? now : hire.completedAt,
      startedAt: newStatus !== 'pending_invite' && !hire.startedAt ? now : hire.startedAt,
      updatedAt: now,
    };

    this.companyHires(companyId).set(hireId, updated);
    this.syncBusinessMetrics(companyId);
  }

  private syncBusinessMetrics(companyId?: string): void {
    if (!this.metricsService) {
      return;
    }

    const companyIds = companyId ? [companyId] : Array.from(this.hires.keys());
    for (const id of companyIds) {
      const hires = Array.from(this.companyHires(id).values());
      const active = hires.filter(
        (hire) => hire.status !== 'completed' && hire.status !== 'cancelled',
      ).length;
      const eligible = hires.filter((hire) => hire.status !== 'cancelled');
      const completed = eligible.filter((hire) => hire.status === 'completed').length;
      const completionRate =
        eligible.length === 0 ? 0 : Math.round((completed / eligible.length) * 100);

      this.metricsService.setActiveHires(id, active);
      this.metricsService.setOnboardingCompletionRate(id, completionRate);
    }
  }

  /**
   * Instantiate hire tasks from a template, computing due dates
   * relative to the hire's start date.
   */
  private instantiateTasksFromTemplate(
    hire: Hire,
    templateId: string,
    companyId: string,
  ): void {
    let template;
    try {
      template = this.templatesService.getTemplate(companyId, templateId);
    } catch {
      return; // Template not found — skip silently
    }

    const startMs = new Date(hire.startDate).getTime();
    const now = new Date().toISOString();

    for (const tTask of template.tasks) {
      const dueMs = startMs + tTask.dueDayOffset * 24 * 60 * 60 * 1000;
      const dueDate = new Date(dueMs).toISOString().slice(0, 10);

      const hireTask: HireTask = {
        id: randomUUID(),
        hireId: hire.id,
        companyId,
        templateTaskId: tTask.id,
        title: tTask.title,
        description: tTask.description,
        taskType: tTask.taskType,
        phase: tTask.phase,
        assignedRole: tTask.assignedRole,
        assignedTo: null,
        dueDate,
        status: 'pending',
        isRequired: tTask.isRequired,
        sortOrder: tTask.sortOrder,
        note: null,
        completedAt: null,
        skippedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      this.hireTaskStore(hire.id).set(hireTask.id, hireTask);
    }
  }

  // ── Demo seed data ─────────────────────────────────────────────

  private seedDemoHires(): void {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const managerId = '33333333-3333-4333-8333-333333333333';
    const hrAdminId = '22222222-2222-4222-8222-222222222222';
    const templateId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const hires: Hire[] = [
      {
        id: 'hire-0001-0001-0001-000000000001',
        companyId,
        userId: '55555555-5555-4555-8555-555555555555',
        managerId,
        templateId,
        fullName: 'Nina Newhire',
        email: 'newhire@demo-company.com',
        jobTitle: 'Frontend Developer',
        department: 'Engineering',
        startDate: today,
        status: 'in_progress',
        completionPct: 33,
        invitedAt: now,
        startedAt: now,
        completedAt: null,
        cancelledAt: null,
        notes: 'Joining the web platform team',
        createdBy: hrAdminId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'hire-0002-0002-0002-000000000002',
        companyId,
        userId: null,
        managerId,
        templateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        fullName: 'Sam Sales',
        email: 'sam.sales@demo-company.com',
        jobTitle: 'Account Executive',
        department: 'Sales',
        startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: 'pending_invite',
        completionPct: 0,
        invitedAt: now,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        notes: null,
        createdBy: hrAdminId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const companyMap = new Map<string, Hire>();
    for (const h of hires) {
      companyMap.set(h.id, h);
    }
    this.hires.set(companyId, companyMap);

    // Seed tasks for Nina's hire from the Software Engineer template
    const startMs = new Date(today).getTime();
    const hireTasks: HireTask[] = [
      this.buildHireTask('htask-0001', hires[0].id, companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Send welcome email', null, 'checkbox', 'pre_boarding', 'hr_admin', null, new Date(startMs - 3 * 86400000).toISOString().slice(0, 10), 'completed', true, 0, null, now, now),
      this.buildHireTask('htask-0002', hires[0].id, companyId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Prepare workstation', 'Set up laptop, accounts, and access', 'checkbox', 'pre_boarding', 'it_admin', null, new Date(startMs - 1 * 86400000).toISOString().slice(0, 10), 'completed', true, 1, null, now, now),
      this.buildHireTask('htask-0003', hires[0].id, companyId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Sign employment contract', 'Upload signed contract PDF', 'document_upload', 'pre_boarding', 'new_hire', null, today, 'pending', true, 2, null, null, now),
      this.buildHireTask('htask-0004', hires[0].id, companyId, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Meet the team', 'Introductory meeting with direct team', 'meeting', 'week_1', 'new_hire', null, new Date(startMs + 1 * 86400000).toISOString().slice(0, 10), 'pending', true, 3, null, null, now),
      this.buildHireTask('htask-0005', hires[0].id, companyId, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Complete security training', 'Acknowledge security policy', 'acknowledgement', 'week_1', 'new_hire', null, new Date(startMs + 5 * 86400000).toISOString().slice(0, 10), 'pending', true, 4, null, null, now),
      this.buildHireTask('htask-0006', hires[0].id, companyId, 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'Set up dev environment', 'Clone repos and run local setup', 'checkbox', 'week_1', 'new_hire', null, new Date(startMs + 3 * 86400000).toISOString().slice(0, 10), 'pending', true, 5, null, null, now),
    ];

    const taskMap = new Map<string, HireTask>();
    for (const t of hireTasks) {
      taskMap.set(t.id, t);
    }
    this.tasks.set(hires[0].id, taskMap);
  }

  private buildHireTask(
    id: string,
    hireId: string,
    companyId: string,
    templateTaskId: string,
    title: string,
    description: string | null,
    taskType: any,
    phase: any,
    assignedRole: any,
    assignedTo: string | null,
    dueDate: string,
    status: any,
    isRequired: boolean,
    sortOrder: number,
    note: string | null,
    completedAt: string | null,
    createdAt: string,
  ): HireTask {
    return {
      id,
      hireId,
      companyId,
      templateTaskId,
      title,
      description,
      taskType,
      phase,
      assignedRole,
      assignedTo,
      dueDate,
      status,
      isRequired,
      sortOrder,
      note,
      completedAt,
      skippedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
  }
}
