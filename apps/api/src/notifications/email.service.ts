import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmailLog, EmailStatus } from './notifications.types';

export interface SendEmailOptions {
  companyId: string;
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string | number | boolean | null>;
}

export interface EmailResult {
  success: boolean;
  providerId: string | null;
  error: string | null;
}

/**
 * EmailService — simulates Resend / Nodemailer transactional email.
 *
 * In production:
 *   - Replace `simulateSend()` with a real Resend API call:
 *     `await resend.emails.send({ from, to, subject, html })`
 *   - Load HTML templates from disk / compile with Handlebars
 *   - Store RESEND_API_KEY in environment variables
 *
 * All sends are logged to the in-memory email log for audit / retry.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly log = new Map<string, EmailLog>();

  // ── Public API ─────────────────────────────────────────────────

  async sendHireInvite(opts: {
    companyId: string;
    to: string;
    hireName: string;
    companyName: string;
    inviteLink: string;
    startDate: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `Welcome to ${opts.companyName} — Your onboarding starts here`,
      template: 'hire_invite',
      variables: {
        hireName: opts.hireName,
        companyName: opts.companyName,
        inviteLink: opts.inviteLink,
        startDate: opts.startDate,
      },
    });
  }

  async sendTaskReminder(opts: {
    companyId: string;
    to: string;
    recipientName: string;
    taskTitle: string;
    hireName: string;
    dueDate: string;
    taskLink: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `Reminder: "${opts.taskTitle}" is due soon`,
      template: 'task_reminder',
      variables: {
        recipientName: opts.recipientName,
        taskTitle: opts.taskTitle,
        hireName: opts.hireName,
        dueDate: opts.dueDate,
        taskLink: opts.taskLink,
      },
    });
  }

  async sendOverdueEscalation(opts: {
    companyId: string;
    to: string;
    hrName: string;
    hireName: string;
    overdueCount: number;
    dashboardLink: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `⚠️ ${opts.overdueCount} overdue task(s) for ${opts.hireName}`,
      template: 'overdue_escalation',
      variables: {
        hrName: opts.hrName,
        hireName: opts.hireName,
        overdueCount: opts.overdueCount,
        dashboardLink: opts.dashboardLink,
      },
    });
  }

  async sendDocumentReviewAlert(opts: {
    companyId: string;
    to: string;
    hrName: string;
    documentName: string;
    hireName: string;
    reviewLink: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `Document ready for review: "${opts.documentName}"`,
      template: 'doc_review_alert',
      variables: {
        hrName: opts.hrName,
        documentName: opts.documentName,
        hireName: opts.hireName,
        reviewLink: opts.reviewLink,
      },
    });
  }

  async sendDocumentRejected(opts: {
    companyId: string;
    to: string;
    hireName: string;
    documentName: string;
    rejectionNote: string;
    uploadLink: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `Action required: "${opts.documentName}" was rejected`,
      template: 'doc_rejected',
      variables: {
        hireName: opts.hireName,
        documentName: opts.documentName,
        rejectionNote: opts.rejectionNote,
        uploadLink: opts.uploadLink,
      },
    });
  }

  async sendDocumentApproved(opts: {
    companyId: string;
    to: string;
    hireName: string;
    documentName: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `"${opts.documentName}" has been approved`,
      template: 'doc_approved',
      variables: { hireName: opts.hireName, documentName: opts.documentName },
    });
  }

  async sendOnboardingComplete(opts: {
    companyId: string;
    to: string;
    hireName: string;
    companyName: string;
    managerTo?: string;
    managerName?: string;
  }): Promise<EmailResult> {
    const result = await this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `🎉 Congratulations ${opts.hireName} — Onboarding complete!`,
      template: 'onboarding_complete',
      variables: { hireName: opts.hireName, companyName: opts.companyName },
    });

    // Also notify manager
    if (opts.managerTo && opts.managerName) {
      await this.send({
        companyId: opts.companyId,
        to: opts.managerTo,
        subject: `${opts.hireName} has completed onboarding`,
        template: 'onboarding_complete_manager',
        variables: { managerName: opts.managerName, hireName: opts.hireName },
      });
    }

    return result;
  }

  async sendItProvisioningAlert(opts: {
    companyId: string;
    to: string;
    itAdminName: string;
    hireName: string;
    startDate: string;
    checklistLink: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `IT setup needed: ${opts.hireName} starts ${opts.startDate}`,
      template: 'it_provisioning',
      variables: {
        itAdminName: opts.itAdminName,
        hireName: opts.hireName,
        startDate: opts.startDate,
        checklistLink: opts.checklistLink,
      },
    });
  }

  async sendManagerAlert(opts: {
    companyId: string;
    to: string;
    managerName: string;
    hireName: string;
    startDate: string;
    dashboardLink: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `New hire joining your team: ${opts.hireName}`,
      template: 'manager_alert',
      variables: {
        managerName: opts.managerName,
        hireName: opts.hireName,
        startDate: opts.startDate,
        dashboardLink: opts.dashboardLink,
      },
    });
  }

  async sendCheckinReminder(opts: {
    companyId: string;
    to: string;
    managerName: string;
    hireName: string;
    dayMark: 30 | 90;
    checklistLink: string;
  }): Promise<EmailResult> {
    return this.send({
      companyId: opts.companyId,
      to: opts.to,
      subject: `${opts.dayMark}-day check-in due: ${opts.hireName}`,
      template: `checkin_${opts.dayMark}_day`,
      variables: {
        managerName: opts.managerName,
        hireName: opts.hireName,
        dayMark: opts.dayMark,
        checklistLink: opts.checklistLink,
      },
    });
  }

  // ── Email log queries ──────────────────────────────────────────

  getEmailLog(companyId: string, limit = 50): EmailLog[] {
    return Array.from(this.log.values())
      .filter((e) => e.companyId === companyId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  getEmailLogStats(companyId: string): Record<EmailStatus, number> {
    const entries = Array.from(this.log.values()).filter(
      (e) => e.companyId === companyId,
    );
    return {
      queued: entries.filter((e) => e.status === 'queued').length,
      sent: entries.filter((e) => e.status === 'sent').length,
      failed: entries.filter((e) => e.status === 'failed').length,
      bounced: entries.filter((e) => e.status === 'bounced').length,
    };
  }

  // ── Private ────────────────────────────────────────────────────

  private async send(opts: SendEmailOptions): Promise<EmailResult> {
    const logEntry: EmailLog = {
      id: randomUUID(),
      companyId: opts.companyId,
      recipient: opts.to,
      subject: opts.subject,
      template: opts.template,
      status: 'queued',
      providerId: null,
      error: null,
      sentAt: null,
      createdAt: new Date().toISOString(),
    };
    this.log.set(logEntry.id, logEntry);

    const result = await this.simulateSend(opts);

    const updated: EmailLog = {
      ...logEntry,
      status: result.success ? 'sent' : 'failed',
      providerId: result.providerId,
      error: result.error,
      sentAt: result.success ? new Date().toISOString() : null,
    };
    this.log.set(logEntry.id, updated);

    if (result.success) {
      this.logger.log(
        `[EMAIL SENT] template=${opts.template} to=${opts.to} subject="${opts.subject}"`,
      );
    } else {
      this.logger.warn(
        `[EMAIL FAILED] template=${opts.template} to=${opts.to} error=${result.error}`,
      );
    }

    return result;
  }

  /**
   * Simulates sending via Resend.
   * In production replace with:
   *   const { data, error } = await resend.emails.send({ from, to, subject, html })
   */
  private async simulateSend(opts: SendEmailOptions): Promise<EmailResult> {
    // Simulate ~5% failure rate for realism
    const shouldFail = Math.random() < 0.05;
    if (shouldFail) {
      return {
        success: false,
        providerId: null,
        error: 'Simulated delivery failure (5% rate)',
      };
    }

    return {
      success: true,
      providerId: `sim_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      error: null,
    };
  }
}
