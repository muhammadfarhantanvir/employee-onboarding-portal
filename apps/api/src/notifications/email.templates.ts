/**
 * HTML email templates for all transactional emails.
 * Uses inline styles for maximum email client compatibility.
 * Brand colour: #6366f1 (indigo-500)
 */

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  margin: 0;
  padding: 0;
`;

const CARD_STYLE = `
  max-width: 560px;
  margin: 40px auto;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
`;

const HEADER_STYLE = `
  background: #6366f1;
  padding: 28px 32px;
  text-align: center;
`;

const BODY_STYLE = `padding: 32px;`;

const FOOTER_STYLE = `
  padding: 20px 32px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
`;

const BTN_STYLE = `
  display: inline-block;
  background: #6366f1;
  color: #ffffff !important;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  margin: 16px 0;
`;

const H1_STYLE = `color: #ffffff; font-size: 22px; font-weight: 700; margin: 0;`;
const H2_STYLE = `color: #1e293b; font-size: 18px; font-weight: 700; margin: 0 0 12px;`;
const P_STYLE = `color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px;`;
const LABEL_STYLE = `color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;`;
const VALUE_STYLE = `color: #1e293b; font-size: 15px; font-weight: 500;`;

function wrap(headerTitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${headerTitle}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_STYLE}">
      <p style="${H1_STYLE}">🚀 ${headerTitle}</p>
    </div>
    <div style="${BODY_STYLE}">${body}</div>
    <div style="${FOOTER_STYLE}">
      <p>Employee Onboarding Portal · Sent by your HR team</p>
      <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Templates ──────────────────────────────────────────────────

export function hireInviteHtml(vars: {
  hireName: string;
  companyName: string;
  inviteLink: string;
  startDate: string;
}): string {
  return wrap('Welcome to ' + vars.companyName, `
    <h2 style="${H2_STYLE}">Hi ${vars.hireName}, welcome aboard! 👋</h2>
    <p style="${P_STYLE}">
      We're thrilled to have you joining <strong>${vars.companyName}</strong>.
      Your onboarding journey starts here — click the button below to set up your account
      and begin your personalised onboarding plan.
    </p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="${LABEL_STYLE}">Your start date</p>
      <p style="${VALUE_STYLE}">${vars.startDate}</p>
    </div>
    <div style="text-align:center;">
      <a href="${vars.inviteLink}" style="${BTN_STYLE}">Accept Invite & Get Started</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin-top:16px;">
      If the button doesn't work, copy this link: <br>
      <a href="${vars.inviteLink}" style="color:#6366f1;">${vars.inviteLink}</a>
    </p>
  `);
}

export function taskReminderHtml(vars: {
  recipientName: string;
  taskTitle: string;
  hireName: string;
  dueDate: string;
  taskLink: string;
}): string {
  return wrap('Task Reminder', `
    <h2 style="${H2_STYLE}">Task due soon ⏰</h2>
    <p style="${P_STYLE}">Hi ${vars.recipientName},</p>
    <p style="${P_STYLE}">
      A task assigned to you is due soon. Please complete it before the deadline.
    </p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="${LABEL_STYLE}">Task</p>
      <p style="${VALUE_STYLE}">${vars.taskTitle}</p>
      <p style="${LABEL_STYLE};margin-top:12px;">For hire</p>
      <p style="${VALUE_STYLE}">${vars.hireName}</p>
      <p style="${LABEL_STYLE};margin-top:12px;">Due date</p>
      <p style="color:#d97706;font-weight:700;font-size:15px;">${vars.dueDate}</p>
    </div>
    <div style="text-align:center;">
      <a href="${vars.taskLink}" style="${BTN_STYLE}">Complete Task</a>
    </div>
  `);
}

export function overdueEscalationHtml(vars: {
  hrName: string;
  hireName: string;
  overdueCount: number;
  dashboardLink: string;
}): string {
  return wrap('Overdue Tasks Alert', `
    <h2 style="${H2_STYLE}">⚠️ Overdue tasks detected</h2>
    <p style="${P_STYLE}">Hi ${vars.hrName},</p>
    <p style="${P_STYLE}">
      <strong>${vars.hireName}</strong> has
      <strong style="color:#ef4444;">${vars.overdueCount} overdue required task(s)</strong>
      that need your attention.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="${LABEL_STYLE}">Hire</p>
      <p style="${VALUE_STYLE}">${vars.hireName}</p>
      <p style="${LABEL_STYLE};margin-top:12px;">Overdue tasks</p>
      <p style="color:#ef4444;font-weight:700;font-size:20px;">${vars.overdueCount}</p>
    </div>
    <div style="text-align:center;">
      <a href="${vars.dashboardLink}" style="${BTN_STYLE}">View Dashboard</a>
    </div>
  `);
}

export function docReviewAlertHtml(vars: {
  hrName: string;
  documentName: string;
  hireName: string;
  reviewLink: string;
}): string {
  return wrap('Document Ready for Review', `
    <h2 style="${H2_STYLE}">Document uploaded for review 📄</h2>
    <p style="${P_STYLE}">Hi ${vars.hrName},</p>
    <p style="${P_STYLE}">
      <strong>${vars.hireName}</strong> has uploaded a document that requires your review.
    </p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="${LABEL_STYLE}">Document</p>
      <p style="${VALUE_STYLE}">${vars.documentName}</p>
      <p style="${LABEL_STYLE};margin-top:12px;">Uploaded by</p>
      <p style="${VALUE_STYLE}">${vars.hireName}</p>
    </div>
    <div style="text-align:center;">
      <a href="${vars.reviewLink}" style="${BTN_STYLE}">Review Document</a>
    </div>
  `);
}

export function docRejectedHtml(vars: {
  hireName: string;
  documentName: string;
  rejectionNote: string;
  uploadLink: string;
}): string {
  return wrap('Document Rejected — Action Required', `
    <h2 style="${H2_STYLE}">Action required: document rejected ❌</h2>
    <p style="${P_STYLE}">Hi ${vars.hireName},</p>
    <p style="${P_STYLE}">
      Your document <strong>"${vars.documentName}"</strong> has been reviewed and rejected.
      Please re-upload a corrected version.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="${LABEL_STYLE}">Reason for rejection</p>
      <p style="color:#dc2626;font-size:14px;margin:4px 0 0;">${vars.rejectionNote}</p>
    </div>
    <div style="text-align:center;">
      <a href="${vars.uploadLink}" style="${BTN_STYLE}">Re-upload Document</a>
    </div>
  `);
}

export function docApprovedHtml(vars: {
  hireName: string;
  documentName: string;
}): string {
  return wrap('Document Approved', `
    <h2 style="${H2_STYLE}">Document approved ✅</h2>
    <p style="${P_STYLE}">Hi ${vars.hireName},</p>
    <p style="${P_STYLE}">
      Great news! Your document <strong>"${vars.documentName}"</strong> has been reviewed
      and approved by HR.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#16a34a;font-weight:600;font-size:15px;margin:0;">✓ ${vars.documentName}</p>
    </div>
    <p style="${P_STYLE}">You can continue with your onboarding tasks.</p>
  `);
}

export function onboardingCompleteHtml(vars: {
  hireName: string;
  companyName: string;
}): string {
  return wrap('Onboarding Complete!', `
    <div style="text-align:center;padding:16px 0;">
      <p style="font-size:48px;margin:0;">🎉</p>
    </div>
    <h2 style="${H2_STYLE};text-align:center;">Congratulations, ${vars.hireName}!</h2>
    <p style="${P_STYLE};text-align:center;">
      You've successfully completed your onboarding at <strong>${vars.companyName}</strong>.
      Welcome to the team — we're excited to have you!
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <p style="color:#16a34a;font-weight:700;font-size:18px;margin:0;">Onboarding 100% Complete ✓</p>
    </div>
  `);
}

export function onboardingCompleteManagerHtml(vars: {
  managerName: string;
  hireName: string;
}): string {
  return wrap('Onboarding Complete', `
    <h2 style="${H2_STYLE}">Onboarding complete 🎉</h2>
    <p style="${P_STYLE}">Hi ${vars.managerName},</p>
    <p style="${P_STYLE}">
      <strong>${vars.hireName}</strong> has successfully completed all onboarding tasks
      and is now fully integrated into the team.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#16a34a;font-weight:600;font-size:15px;margin:0;">✓ ${vars.hireName} — Onboarding Complete</p>
    </div>
  `);
}

export function itProvisioningHtml(vars: {
  itAdminName: string;
  hireName: string;
  startDate: string;
  checklistLink: string;
}): string {
  return wrap('IT Setup Required', `
    <h2 style="${H2_STYLE}">IT setup needed 💻</h2>
    <p style="${P_STYLE}">Hi ${vars.itAdminName},</p>
    <p style="${P_STYLE}">
      A new hire is starting soon and needs their equipment and accounts provisioned.
    </p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="${LABEL_STYLE}">New hire</p>
      <p style="${VALUE_STYLE}">${vars.hireName}</p>
      <p style="${LABEL_STYLE};margin-top:12px;">Start date</p>
      <p style="color:#6366f1;font-weight:700;font-size:15px;">${vars.startDate}</p>
    </div>
    <p style="${P_STYLE}">Please complete the IT checklist before their start date.</p>
    <div style="text-align:center;">
      <a href="${vars.checklistLink}" style="${BTN_STYLE}">Open IT Checklist</a>
    </div>
  `);
}

export function managerAlertHtml(vars: {
  managerName: string;
  hireName: string;
  startDate: string;
  dashboardLink: string;
}): string {
  return wrap('New Hire Joining Your Team', `
    <h2 style="${H2_STYLE}">New hire joining your team 👋</h2>
    <p style="${P_STYLE}">Hi ${vars.managerName},</p>
    <p style="${P_STYLE}">
      A new team member is starting soon. Please review their onboarding plan
      and be ready to approve their progress.
    </p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="${LABEL_STYLE}">New hire</p>
      <p style="${VALUE_STYLE}">${vars.hireName}</p>
      <p style="${LABEL_STYLE};margin-top:12px;">Start date</p>
      <p style="color:#6366f1;font-weight:700;font-size:15px;">${vars.startDate}</p>
    </div>
    <div style="text-align:center;">
      <a href="${vars.dashboardLink}" style="${BTN_STYLE}">View Onboarding Plan</a>
    </div>
  `);
}

export function checkinReminderHtml(vars: {
  managerName: string;
  hireName: string;
  dayMark: number;
  checklistLink: string;
}): string {
  return wrap(`${vars.dayMark}-Day Check-in Due`, `
    <h2 style="${H2_STYLE}">${vars.dayMark}-day check-in due 📅</h2>
    <p style="${P_STYLE}">Hi ${vars.managerName},</p>
    <p style="${P_STYLE}">
      It's time for the <strong>${vars.dayMark}-day check-in</strong> with
      <strong>${vars.hireName}</strong>. Please schedule a review meeting and
      complete the check-in tasks.
    </p>
    <div style="background:#ede9fe;border:1px solid #c4b5fd;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="${LABEL_STYLE}">Hire</p>
      <p style="${VALUE_STYLE}">${vars.hireName}</p>
      <p style="${LABEL_STYLE};margin-top:12px;">Check-in milestone</p>
      <p style="color:#7c3aed;font-weight:700;font-size:15px;">Day ${vars.dayMark}</p>
    </div>
    <div style="text-align:center;">
      <a href="${vars.checklistLink}" style="${BTN_STYLE}">Open Check-in Tasks</a>
    </div>
  `);
}
