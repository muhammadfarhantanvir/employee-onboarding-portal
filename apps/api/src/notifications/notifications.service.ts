import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MetricsService } from '../observability/metrics.service';
import {
  CreateNotificationInput,
  EmailLog,
  Notification,
  NotificationListResponse,
  NotificationType,
  NOTIFICATION_TYPES,
  WorkflowJob,
  WorkflowJobListResponse,
  WorkflowJobStatus,
  WorkflowJobType,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** userId → Notification[] */
  private readonly notifications = new Map<string, Notification[]>();
  /** companyId → WorkflowJob[] */
  private readonly jobs = new Map<string, WorkflowJob[]>();

  constructor(@Optional() private readonly metricsService?: MetricsService) {
    this.seedDemoNotifications();
    this.syncWorkflowQueueDepth();
  }

  // ── Notifications ──────────────────────────────────────────────

  create(input: CreateNotificationInput): Notification {
    const notification: Notification = {
      id: randomUUID(),
      companyId: input.companyId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      metadata: input.metadata ?? {},
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    };

    const list = this.notifications.get(input.userId) ?? [];
    list.unshift(notification); // newest first
    this.notifications.set(input.userId, list);

    this.logger.log(
      `[NOTIFICATION] type=${notification.type} userId=${notification.userId} title="${notification.title}"`,
    );

    return notification;
  }

  /** Bulk-create notifications for multiple users at once */
  createBulk(inputs: CreateNotificationInput[]): Notification[] {
    return inputs.map((i) => this.create(i));
  }

  listForUser(
    userId: string,
    opts: { unreadOnly?: boolean; type?: string; limit?: number } = {},
  ): NotificationListResponse {
    const all = this.notifications.get(userId) ?? [];
    let filtered = all;

    if (opts.unreadOnly) filtered = filtered.filter((n) => !n.isRead);
    if (opts.type) filtered = filtered.filter((n) => n.type === opts.type);
    if (opts.limit) filtered = filtered.slice(0, opts.limit);

    const unreadCount = all.filter((n) => !n.isRead).length;
    return { notifications: filtered, count: filtered.length, unreadCount };
  }

  getUnreadCount(userId: string): number {
    return (this.notifications.get(userId) ?? []).filter((n) => !n.isRead).length;
  }

  markAsRead(userId: string, notificationId: string): Notification {
    const list = this.notifications.get(userId) ?? [];
    const idx = list.findIndex((n) => n.id === notificationId);
    if (idx === -1) throw new NotFoundException('Notification not found');

    const now = new Date().toISOString();
    list[idx] = { ...list[idx], isRead: true, readAt: now };
    this.notifications.set(userId, list);
    return list[idx];
  }

  markAllRead(userId: string): { updated: number } {
    const list = this.notifications.get(userId) ?? [];
    const now = new Date().toISOString();
    const updated = list.map((n) =>
      n.isRead ? n : { ...n, isRead: true, readAt: now },
    );
    const count = updated.filter((n) => n.readAt === now).length;
    this.notifications.set(userId, updated);
    return { updated: count };
  }

  deleteNotification(userId: string, notificationId: string): void {
    const list = this.notifications.get(userId) ?? [];
    const filtered = list.filter((n) => n.id !== notificationId);
    if (filtered.length === list.length) {
      throw new NotFoundException('Notification not found');
    }
    this.notifications.set(userId, filtered);
  }

  // ── Workflow Jobs ──────────────────────────────────────────────

  scheduleJob(
    companyId: string,
    type: WorkflowJobType,
    payload: Record<string, unknown>,
    scheduledAt: Date,
  ): WorkflowJob {
    const job: WorkflowJob = {
      id: randomUUID(),
      companyId,
      type,
      status: 'pending',
      payload,
      scheduledAt: scheduledAt.toISOString(),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      attempts: 0,
      maxAttempts: 3,
      lastError: null,
      createdAt: new Date().toISOString(),
    };

    const list = this.companyJobs(companyId);
    list.push(job);

    this.logger.log(
      `[JOB SCHEDULED] type=${type} companyId=${companyId} scheduledAt=${job.scheduledAt}`,
    );

    this.syncWorkflowQueueDepth(companyId);
    return job;
  }

  listJobs(
    companyId: string,
    opts: { status?: string; type?: string; limit?: number } = {},
  ): WorkflowJobListResponse {
    let jobs = this.companyJobs(companyId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (opts.status) jobs = jobs.filter((j) => j.status === opts.status);
    if (opts.type) jobs = jobs.filter((j) => j.type === opts.type);
    if (opts.limit) jobs = jobs.slice(0, opts.limit);

    const statuses: WorkflowJobStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    const byStatus = statuses.reduce(
      (acc, s) => ({
        ...acc,
        [s]: this.companyJobs(companyId).filter((j) => j.status === s).length,
      }),
      {} as Record<WorkflowJobStatus, number>,
    );

    return { jobs, count: jobs.length, byStatus };
  }

  cancelJob(companyId: string, jobId: string): WorkflowJob {
    const list = this.companyJobs(companyId);
    const idx = list.findIndex((j) => j.id === jobId);
    if (idx === -1) throw new NotFoundException('Workflow job not found');

    const job = list[idx];
    if (job.status === 'completed' || job.status === 'running') {
      throw new BadRequestException(`Cannot cancel a ${job.status} job`);
    }

    list[idx] = { ...job, status: 'cancelled' };
    this.syncWorkflowQueueDepth(companyId);
    return list[idx];
  }

  retryJob(companyId: string, jobId: string): WorkflowJob {
    const list = this.companyJobs(companyId);
    const idx = list.findIndex((j) => j.id === jobId);
    if (idx === -1) throw new NotFoundException('Workflow job not found');

    const job = list[idx];
    if (job.status !== 'failed') {
      throw new BadRequestException('Only failed jobs can be retried');
    }

    list[idx] = {
      ...job,
      status: 'pending',
      scheduledAt: new Date().toISOString(),
      failedAt: null,
      lastError: null,
    };
    this.syncWorkflowQueueDepth(companyId);
    return list[idx];
  }

  /** Mark a job as running (called by the scheduler before execution) */
  markJobRunning(jobId: string, companyId: string): WorkflowJob | null {
    const list = this.companyJobs(companyId);
    const idx = list.findIndex((j) => j.id === jobId);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      status: 'running',
      startedAt: new Date().toISOString(),
      attempts: list[idx].attempts + 1,
    };
    this.syncWorkflowQueueDepth(companyId);
    return list[idx];
  }

  /** Mark a job as completed */
  markJobCompleted(jobId: string, companyId: string): WorkflowJob | null {
    const list = this.companyJobs(companyId);
    const idx = list.findIndex((j) => j.id === jobId);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    this.syncWorkflowQueueDepth(companyId);
    return list[idx];
  }

  /** Mark a job as failed */
  markJobFailed(jobId: string, companyId: string, error: string): WorkflowJob | null {
    const list = this.companyJobs(companyId);
    const idx = list.findIndex((j) => j.id === jobId);
    if (idx === -1) return null;

    const job = list[idx];
    const exhausted = job.attempts >= job.maxAttempts;
    list[idx] = {
      ...job,
      status: exhausted ? 'failed' : 'pending',
      failedAt: exhausted ? new Date().toISOString() : null,
      lastError: error,
      scheduledAt: exhausted
        ? job.scheduledAt
        : new Date(Date.now() + 5 * 60 * 1000).toISOString(), // retry in 5 min
    };
    this.syncWorkflowQueueDepth(companyId);
    return list[idx];
  }

  /** Get all pending jobs due for execution right now */
  getDueJobs(companyId: string): WorkflowJob[] {
    const now = new Date().toISOString();
    return this.companyJobs(companyId).filter(
      (j) => j.status === 'pending' && j.scheduledAt <= now,
    );
  }

  // ── Private helpers ────────────────────────────────────────────

  private companyJobs(companyId: string): WorkflowJob[] {
    if (!this.jobs.has(companyId)) {
      this.jobs.set(companyId, []);
    }
    return this.jobs.get(companyId)!;
  }

  private syncWorkflowQueueDepth(companyId?: string): void {
    if (!this.metricsService) {
      return;
    }

    const companyIds = companyId ? [companyId] : Array.from(this.jobs.keys());
    const waiting = companyIds.reduce(
      (total, id) =>
        total + this.companyJobs(id).filter((job) => job.status === 'pending').length,
      0,
    );
    this.metricsService.setBullMqQueueDepth('workflow', waiting);
  }

  // ── Demo seed ──────────────────────────────────────────────────

  private seedDemoNotifications(): void {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const hrAdminId = '22222222-2222-4222-8222-222222222222';
    const managerId = '33333333-3333-4333-8333-333333333333';
    const newHireId = '55555555-5555-4555-8555-555555555555';
    const now = new Date().toISOString();
    const hireId = 'hire-0001-0001-0001-000000000001';

    const hrNotifications: Notification[] = [
      {
        id: 'notif-0001-0001-0001-000000000001',
        companyId,
        userId: hrAdminId,
        type: 'doc_uploaded',
        title: 'Document uploaded for review',
        body: 'Nina Newhire uploaded "Employment Contract — Nina Newhire"',
        link: `/hires/${hireId}/documents`,
        metadata: { hireId, documentId: 'doc-0004-0004-0004-000000000004' },
        isRead: false,
        readAt: null,
        createdAt: now,
      },
      {
        id: 'notif-0002-0002-0002-000000000002',
        companyId,
        userId: hrAdminId,
        type: 'hire_at_risk',
        title: 'Hire at risk: overdue tasks',
        body: 'Nina Newhire has 1 overdue required task',
        link: `/hires/${hireId}`,
        metadata: { hireId, overdueCount: 1 },
        isRead: false,
        readAt: null,
        createdAt: now,
      },
    ];

    const managerNotifications: Notification[] = [
      {
        id: 'notif-0003-0003-0003-000000000003',
        companyId,
        userId: managerId,
        type: 'approval_needed',
        title: 'Onboarding approval needed',
        body: 'Nina Newhire has completed all required tasks and is awaiting your approval',
        link: `/hires/${hireId}`,
        metadata: { hireId },
        isRead: false,
        readAt: null,
        createdAt: now,
      },
    ];

    const newHireNotifications: Notification[] = [
      {
        id: 'notif-0004-0004-0004-000000000004',
        companyId,
        userId: newHireId,
        type: 'task_assigned',
        title: 'New task assigned',
        body: 'Please sign your employment contract',
        link: `/tasks/htask-0003`,
        metadata: { taskId: 'htask-0003', hireId },
        isRead: true,
        readAt: now,
        createdAt: now,
      },
      {
        id: 'notif-0005-0005-0005-000000000005',
        companyId,
        userId: newHireId,
        type: 'task_due_soon',
        title: 'Task due today',
        body: '"Sign employment contract" is due today',
        link: `/tasks/htask-0003`,
        metadata: { taskId: 'htask-0003', hireId },
        isRead: false,
        readAt: null,
        createdAt: now,
      },
    ];

    this.notifications.set(hrAdminId, hrNotifications);
    this.notifications.set(managerId, managerNotifications);
    this.notifications.set(newHireId, newHireNotifications);

    // Seed some demo workflow jobs
    const demoJobs: WorkflowJob[] = [
      {
        id: 'job-0001-0001-0001-000000000001',
        companyId,
        type: 'check_overdue_tasks',
        status: 'completed',
        payload: {},
        scheduledAt: new Date(Date.now() - 3600000).toISOString(),
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3599000).toISOString(),
        failedAt: null,
        attempts: 1,
        maxAttempts: 3,
        lastError: null,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'job-0002-0002-0002-000000000002',
        companyId,
        type: 'send_task_reminder',
        status: 'pending',
        payload: { taskId: 'htask-0003', hireId, taskTitle: 'Sign employment contract' },
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        startedAt: null,
        completedAt: null,
        failedAt: null,
        attempts: 0,
        maxAttempts: 3,
        lastError: null,
        createdAt: now,
      },
    ];

    this.jobs.set(companyId, demoJobs);
  }
}
