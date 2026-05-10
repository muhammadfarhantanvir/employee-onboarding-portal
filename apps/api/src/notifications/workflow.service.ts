import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import {
  DocumentEventPayload,
  HireEventPayload,
  TaskEventPayload,
} from './notifications.types';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

/**
 * WorkflowService — the central event bus for all automated triggers.
 *
 * Every domain event (hire created, task completed, document uploaded, etc.)
 * calls the corresponding method here. This service:
 *   1. Creates in-app notifications for the right users
 *   2. Sends transactional emails via EmailService
 *   3. Schedules future workflow jobs (reminders, check-ins) via NotificationsService
 *
 * In production with BullMQ:
 *   - Replace `scheduleJob()` calls with `queue.add(type, payload, { delay })`
 *   - Replace `simulateScheduler()` with a BullMQ Worker that processes jobs
 *   - The scheduler tick below becomes a BullMQ repeat job running every hour
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // HIRE EVENTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Triggered when HR creates a new hire.
   * Actions:
   *   - Send invite email to new hire
   *   - Notify IT admin to provision equipment
   *   - Notify manager about new direct report
   *   - Schedule 30-day and 90-day check-in jobs
   */
  async onHireCreated(
    payload: HireEventPayload,
    context: {
      hrAdminId: string;
      hrAdminEmail: string;
      hrAdminName: string;
      itAdminId?: string;
      itAdminEmail?: string;
      itAdminName?: string;
      managerEmail?: string;
      managerName?: string;
      companyName: string;
    },
  ): Promise<void> {
    const { hireId, companyId, hireEmail, hireFullName, startDate } = payload;

    // 1. Send invite email to new hire
    await this.emailService.sendHireInvite({
      companyId,
      to: hireEmail,
      hireName: hireFullName,
      companyName: context.companyName,
      inviteLink: `${FRONTEND_URL}/accept-invite?hireId=${hireId}`,
      startDate,
    });

    // 2. Notify IT admin
    if (context.itAdminId && context.itAdminEmail) {
      this.notificationsService.create({
        companyId,
        userId: context.itAdminId,
        type: 'it_provisioning_needed',
        title: `IT setup needed: ${hireFullName} starts ${startDate}`,
        body: `Please provision laptop, email, Slack, GitHub, and VPN for ${hireFullName}.`,
        link: `/hires/${hireId}`,
        metadata: { hireId, startDate },
      });

      await this.emailService.sendItProvisioningAlert({
        companyId,
        to: context.itAdminEmail,
        itAdminName: context.itAdminName ?? 'IT Admin',
        hireName: hireFullName,
        startDate,
        checklistLink: `${FRONTEND_URL}/hires/${hireId}`,
      });
    }

    // 3. Notify manager
    if (payload.managerId && context.managerEmail) {
      this.notificationsService.create({
        companyId,
        userId: payload.managerId,
        type: 'hire_invited',
        title: `New hire joining your team: ${hireFullName}`,
        body: `${hireFullName} starts on ${startDate}. Review their onboarding plan.`,
        link: `/hires/${hireId}`,
        metadata: { hireId, startDate },
      });

      await this.emailService.sendManagerAlert({
        companyId,
        to: context.managerEmail,
        managerName: context.managerName ?? 'Manager',
        hireName: hireFullName,
        startDate,
        dashboardLink: `${FRONTEND_URL}/hires/${hireId}`,
      });
    }

    // 4. Schedule 30-day check-in job
    const startMs = new Date(startDate).getTime();
    this.notificationsService.scheduleJob(
      companyId,
      'send_checkin_30_day',
      { hireId, managerId: payload.managerId, hireName: hireFullName },
      new Date(startMs + 30 * 86400000),
    );

    // 5. Schedule 90-day check-in job
    this.notificationsService.scheduleJob(
      companyId,
      'send_checkin_90_day',
      { hireId, managerId: payload.managerId, hireName: hireFullName },
      new Date(startMs + 90 * 86400000),
    );

    this.logger.log(`[WORKFLOW] onHireCreated hireId=${hireId}`);
  }

  /**
   * Triggered when a hire's status changes to 'completed'.
   */
  async onHireCompleted(
    payload: HireEventPayload,
    context: {
      managerEmail?: string;
      managerName?: string;
      companyName: string;
    },
  ): Promise<void> {
    const { hireId, companyId, hireEmail, hireFullName } = payload;

    // Notify HR admin
    this.notificationsService.create({
      companyId,
      userId: payload.managerId ?? '',
      type: 'hire_completed',
      title: `${hireFullName} completed onboarding`,
      body: 'All required tasks have been completed.',
      link: `/hires/${hireId}`,
      metadata: { hireId },
    });

    // Send congratulations email to hire + manager notification
    await this.emailService.sendOnboardingComplete({
      companyId,
      to: hireEmail,
      hireName: hireFullName,
      companyName: context.companyName,
      managerTo: context.managerEmail,
      managerName: context.managerName,
    });

    this.logger.log(`[WORKFLOW] onHireCompleted hireId=${hireId}`);
  }

  /**
   * Triggered when a hire transitions to 'at_risk' (overdue tasks).
   */
  async onHireAtRisk(
    payload: HireEventPayload,
    context: {
      hrAdminId: string;
      hrAdminEmail: string;
      hrAdminName: string;
      overdueCount: number;
    },
  ): Promise<void> {
    const { hireId, companyId, hireFullName } = payload;

    this.notificationsService.create({
      companyId,
      userId: context.hrAdminId,
      type: 'hire_at_risk',
      title: `Hire at risk: ${hireFullName}`,
      body: `${context.overdueCount} overdue required task(s) detected.`,
      link: `/hires/${hireId}`,
      metadata: { hireId, overdueCount: context.overdueCount },
    });

    await this.emailService.sendOverdueEscalation({
      companyId,
      to: context.hrAdminEmail,
      hrName: context.hrAdminName,
      hireName: hireFullName,
      overdueCount: context.overdueCount,
      dashboardLink: `${FRONTEND_URL}/hires/${hireId}`,
    });

    this.logger.log(`[WORKFLOW] onHireAtRisk hireId=${hireId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TASK EVENTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Triggered when a task is assigned to a specific user.
   * Schedules a reminder 24h before due date.
   */
  async onTaskAssigned(
    payload: TaskEventPayload,
    context: {
      assigneeEmail: string;
      assigneeName: string;
      hireName: string;
    },
  ): Promise<void> {
    const { taskId, hireId, companyId, taskTitle, assignedTo, dueDate } = payload;

    if (!assignedTo) return;

    // In-app notification
    this.notificationsService.create({
      companyId,
      userId: assignedTo,
      type: 'task_assigned',
      title: `New task assigned: ${taskTitle}`,
      body: dueDate ? `Due: ${dueDate}` : undefined,
      link: `/tasks/${taskId}?hireId=${hireId}`,
      metadata: { taskId, hireId, dueDate },
    });

    // Schedule reminder 24h before due date
    if (dueDate) {
      const dueMs = new Date(dueDate).getTime();
      const reminderAt = new Date(dueMs - 24 * 3600000);
      if (reminderAt > new Date()) {
        this.notificationsService.scheduleJob(
          companyId,
          'send_task_reminder',
          {
            taskId,
            hireId,
            taskTitle,
            assignedTo,
            assigneeEmail: context.assigneeEmail,
            assigneeName: context.assigneeName,
            hireName: context.hireName,
            dueDate,
          },
          reminderAt,
        );
      }
    }

    this.logger.log(`[WORKFLOW] onTaskAssigned taskId=${taskId}`);
  }

  /**
   * Triggered when a task is marked as completed.
   */
  onTaskCompleted(
    payload: TaskEventPayload,
    context: { hrAdminId: string; hireName: string },
  ): void {
    const { taskId, hireId, companyId, taskTitle } = payload;

    this.notificationsService.create({
      companyId,
      userId: context.hrAdminId,
      type: 'task_completed',
      title: `Task completed: ${taskTitle}`,
      body: `${context.hireName} completed "${taskTitle}"`,
      link: `/hires/${hireId}`,
      metadata: { taskId, hireId },
    });

    this.logger.log(`[WORKFLOW] onTaskCompleted taskId=${taskId}`);
  }

  /**
   * Triggered when a task is marked as blocked.
   */
  onTaskBlocked(
    payload: TaskEventPayload,
    context: { hrAdminId: string; hireName: string; note?: string },
  ): void {
    const { taskId, hireId, companyId, taskTitle } = payload;

    this.notificationsService.create({
      companyId,
      userId: context.hrAdminId,
      type: 'task_blocked',
      title: `Task blocked: ${taskTitle}`,
      body: context.note
        ? `Blocker: ${context.note}`
        : `"${taskTitle}" for ${context.hireName} is blocked`,
      link: `/hires/${hireId}`,
      metadata: { taskId, hireId, note: context.note },
    });

    this.logger.log(`[WORKFLOW] onTaskBlocked taskId=${taskId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT EVENTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Triggered when a new hire uploads a document.
   */
  async onDocumentUploaded(
    payload: DocumentEventPayload,
    context: {
      hrAdminId: string;
      hrAdminEmail: string;
      hrAdminName: string;
      hireName: string;
    },
  ): Promise<void> {
    const { documentId, companyId, documentName } = payload;

    // In-app notification for HR
    this.notificationsService.create({
      companyId,
      userId: context.hrAdminId,
      type: 'doc_uploaded',
      title: `Document uploaded for review`,
      body: `${context.hireName} uploaded "${documentName}"`,
      link: `/documents/${documentId}`,
      metadata: { documentId, hireId: payload.hireId },
    });

    // Email HR admin
    await this.emailService.sendDocumentReviewAlert({
      companyId,
      to: context.hrAdminEmail,
      hrName: context.hrAdminName,
      documentName,
      hireName: context.hireName,
      reviewLink: `${FRONTEND_URL}/documents/${documentId}`,
    });

    this.logger.log(`[WORKFLOW] onDocumentUploaded documentId=${documentId}`);
  }

  /**
   * Triggered when HR approves a document.
   */
  async onDocumentApproved(
    payload: DocumentEventPayload,
    context: {
      hireUserId: string;
      hireEmail: string;
      hireName: string;
    },
  ): Promise<void> {
    const { documentId, companyId, documentName } = payload;

    this.notificationsService.create({
      companyId,
      userId: context.hireUserId,
      type: 'doc_approved',
      title: `Document approved: ${documentName}`,
      body: 'Your document has been reviewed and approved.',
      link: `/documents/${documentId}`,
      metadata: { documentId },
    });

    await this.emailService.sendDocumentApproved({
      companyId,
      to: context.hireEmail,
      hireName: context.hireName,
      documentName,
    });

    this.logger.log(`[WORKFLOW] onDocumentApproved documentId=${documentId}`);
  }

  /**
   * Triggered when HR rejects a document.
   */
  async onDocumentRejected(
    payload: DocumentEventPayload,
    context: {
      hireUserId: string;
      hireEmail: string;
      hireName: string;
    },
  ): Promise<void> {
    const { documentId, companyId, documentName, rejectionNote } = payload;

    this.notificationsService.create({
      companyId,
      userId: context.hireUserId,
      type: 'doc_rejected',
      title: `Document rejected: ${documentName}`,
      body: rejectionNote ?? 'Please re-upload the document.',
      link: `/documents/${documentId}`,
      metadata: { documentId, rejectionNote },
    });

    await this.emailService.sendDocumentRejected({
      companyId,
      to: context.hireEmail,
      hireName: context.hireName,
      documentName,
      rejectionNote: rejectionNote ?? 'Please re-upload the document.',
      uploadLink: `${FRONTEND_URL}/documents/${documentId}`,
    });

    this.logger.log(`[WORKFLOW] onDocumentRejected documentId=${documentId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULER TICK — runs every hour (simulated)
  // In production: BullMQ repeat job, runs every 60 minutes
  // ═══════════════════════════════════════════════════════════════

  /**
   * Processes all due workflow jobs for a company.
   * Called by the WorkflowScheduler on a cron interval.
   */
  async processDueJobs(companyId: string): Promise<{ processed: number; failed: number }> {
    const dueJobs = this.notificationsService.getDueJobs(companyId);
    let processed = 0;
    let failed = 0;

    for (const job of dueJobs) {
      this.notificationsService.markJobRunning(job.id, companyId);
      try {
        await this.executeJob(job.type, job.payload, companyId);
        this.notificationsService.markJobCompleted(job.id, companyId);
        processed++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.notificationsService.markJobFailed(job.id, companyId, msg);
        failed++;
        this.logger.error(`[JOB FAILED] jobId=${job.id} type=${job.type} error=${msg}`);
      }
    }

    if (dueJobs.length > 0) {
      this.logger.log(
        `[SCHEDULER] companyId=${companyId} processed=${processed} failed=${failed}`,
      );
    }

    return { processed, failed };
  }

  private async executeJob(
    type: string,
    payload: Record<string, unknown>,
    companyId: string,
  ): Promise<void> {
    switch (type) {
      case 'send_task_reminder':
        await this.emailService.sendTaskReminder({
          companyId,
          to: payload.assigneeEmail as string,
          recipientName: payload.assigneeName as string,
          taskTitle: payload.taskTitle as string,
          hireName: payload.hireName as string,
          dueDate: payload.dueDate as string,
          taskLink: `${FRONTEND_URL}/tasks/${payload.taskId}?hireId=${payload.hireId}`,
        });
        // Also create in-app notification
        this.notificationsService.create({
          companyId,
          userId: payload.assignedTo as string,
          type: 'task_due_soon',
          title: `Task due soon: ${payload.taskTitle}`,
          body: `Due: ${payload.dueDate}`,
          link: `/tasks/${payload.taskId}?hireId=${payload.hireId}`,
          metadata: payload,
        });
        break;

      case 'send_checkin_30_day':
      case 'send_checkin_90_day': {
        const dayMark = type === 'send_checkin_30_day' ? 30 : 90;
        if (payload.managerId) {
          this.notificationsService.create({
            companyId,
            userId: payload.managerId as string,
            type: dayMark === 30 ? 'checkin_30_day' : 'checkin_90_day',
            title: `${dayMark}-day check-in due: ${payload.hireName}`,
            body: `Schedule the ${dayMark}-day review meeting with ${payload.hireName}.`,
            link: `/hires/${payload.hireId}`,
            metadata: payload,
          });
        }
        break;
      }

      case 'check_overdue_tasks':
        // In production: query DB for overdue tasks across all hires, fire escalations
        this.logger.log(`[JOB] check_overdue_tasks for companyId=${companyId}`);
        break;

      case 'check_upcoming_tasks':
        this.logger.log(`[JOB] check_upcoming_tasks for companyId=${companyId}`);
        break;

      default:
        this.logger.warn(`[JOB] Unknown job type: ${type}`);
    }
  }
}
