import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import { EmailLog, EmailStatus } from './notifications.types';
import {
  hireInviteHtml,
  taskReminderHtml,
  overdueEscalationHtml,
  docReviewAlertHtml,
  docRejectedHtml,
  docApprovedHtml,
  onboardingCompleteHtml,
  onboardingCompleteManagerHtml,
  itProvisioningHtml,
  managerAlertHtml,
  checkinReminderHtml,
} from './email.templates';

export interface SendEmailOptions {
  companyId: string;
  to: string;
  subject: string;
  template: string;
  html: string;
}

export interface EmailResult {
  success: boolean;
  providerId: string | null;
  error: string | null;
}

/**
 * EmailService — sends transactional emails via Resend.
 *
 * Configuration (set in .env):
 *   RESEND_API_KEY   — your Resend API key (re_xxxxxxxxx)
 *   RESEND_FROM_EMAIL — sender address (e.g. onboarding@resend.dev)
 *   RESEND_FROM_NAME  — sender display name
 *
 * All sends are logged to the in-memory email log for audit / retry.
 * In production, persist the log to the email_log Supabase table.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly log = new Map<string, EmailLog>();

  private readonly resend: Resend | null;
  private readonly fromAddress: string;
  private readonly isConfigured: boolean;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
    const fromName = process.env.RESEND_FROM_NAME ?? 'Employee Onboarding Portal';

    this.fromAddress = `${fromName} <${fromEmail}>`;

    if (apiKey && apiKey !== 're_xxxxxxxxx') {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      this.logger.log('[EMAIL] Resend configured — live email delivery enabled');
    } else {
      this.resend = null;
      this.isConfigured = false;
      this.logger.warn('[EMAIL] RESEND_API_KEY not set — falling back to simulation mode');
    }
  }

  // ── Public send methods ────────────────────────────────────────

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
      html: hireInviteHtml(opts),
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
      html: taskReminderHtml(opts),
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
      html: overdueEscalationHtml(opts),
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
      html: docReviewAlertHtml(opts),
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
      html: docRejectedHtml(opts),
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
      html: docApprovedHtml(opts),
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
      html: onboardingCompleteHtml({ hireName: opts.hireName, companyName: opts.companyName }),
    });

    if (opts.managerTo && opts.managerName) {
      await this.send({
        companyId: opts.companyId,
        to: opts.managerTo,
        subject: `${opts.hireName} has completed onboarding`,
        template: 'onboarding_complete_manager',
        html: onboardingCompleteManagerHtml({ managerName: opts.managerName, hireName: opts.hireName }),
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
      html: itProvisioningHtml(opts),
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
      html: managerAlertHtml(opts),
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
      html: checkinReminderHtml(opts),
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

  // ── Core send ──────────────────────────────────────────────────

  private async send(opts: SendEmailOptions): Promise<EmailResult> {
    // Create log entry
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

    const result = this.isConfigured
      ? await this.sendViaResend(opts)
      : await this.simulateSend(opts);

    // Update log entry
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
        `[EMAIL SENT] template=${opts.template} to=${opts.to} id=${result.providerId}`,
      );
    } else {
      this.logger.warn(
        `[EMAIL FAILED] template=${opts.template} to=${opts.to} error=${result.error}`,
      );
    }

    return result;
  }

  /**
   * Sends via the real Resend API.
   * Docs: https://resend.com/docs/api-reference/emails/send-email
   */
  private async sendViaResend(opts: SendEmailOptions): Promise<EmailResult> {
    try {
      const { data, error } = await this.resend!.emails.send({
        from: this.fromAddress,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });

      if (error) {
        return { success: false, providerId: null, error: error.message };
      }

      return {
        success: true,
        providerId: data?.id ?? null,
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, providerId: null, error: msg };
    }
  }

  /**
   * Fallback simulation when RESEND_API_KEY is not configured.
   * Logs the email content so you can inspect it during development.
   */
  private async simulateSend(opts: SendEmailOptions): Promise<EmailResult> {
    this.logger.debug(
      `[EMAIL SIMULATED] to=${opts.to} subject="${opts.subject}" template=${opts.template}`,
    );
    return {
      success: true,
      providerId: `sim_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      error: null,
    };
  }
}
