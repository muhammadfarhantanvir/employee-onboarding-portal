// tests/helpers/api-catalog.ts
import { SEED_IDS } from '../../prisma/seed.test';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type Role = 'hr_admin' | 'manager' | 'it_admin' | 'new_hire' | 'viewer';

export interface EndpointCase {
  method: HttpMethod;
  url: string;
  name: string;
  protected: boolean;
  body?: Record<string, unknown>;
  okRoles: Role[];
  expectedOk: number[];
}

const hireId = SEED_IDS.hires.primary;
const templateId = SEED_IDS.templates.softwareEngineer;
const taskId = SEED_IDS.tasks.documentUpload;
const documentId = SEED_IDS.documents.pendingReview;
const companyDocumentId = SEED_IDS.documents.companyPolicy;
const checklistId = SEED_IDS.it.checklist;
const checklistItemId = SEED_IDS.it.laptopItem;
const itTemplateId = SEED_IDS.it.template;
const itTemplateItemId = 'it-ti-0004';
const notificationId = SEED_IDS.notifications.hrUnread;
const jobId = SEED_IDS.notifications.jobPending;
const managerNoteId = SEED_IDS.manager.note;
const reuploadRequestId = 'missing-reupload-request-id';
const erasureRequestId = SEED_IDS.gdpr.erasureRequest;
const privacyPolicyId = SEED_IDS.gdpr.privacyPolicy;
const memberUserId = SEED_IDS.users.manager;

const hr = ['hr_admin'] as Role[];
const manager = ['manager'] as Role[];
const it = ['it_admin'] as Role[];
const hire = ['new_hire'] as Role[];
const viewer = ['viewer'] as Role[];
const readers = ['hr_admin', 'manager', 'viewer'] as Role[];
const allRoles = ['hr_admin', 'manager', 'it_admin', 'new_hire', 'viewer'] as Role[];
const hrManager = ['hr_admin', 'manager'] as Role[];
const hrIt = ['hr_admin', 'it_admin'] as Role[];
const documentReaders = ['hr_admin', 'manager', 'it_admin', 'viewer'] as Role[];

export const endpointCatalog: EndpointCase[] = [
  { method: 'GET', url: '/api', name: 'system root', protected: false, okRoles: allRoles, expectedOk: [200] },
  { method: 'GET', url: '/api/health', name: 'health', protected: false, okRoles: allRoles, expectedOk: [200] },
  { method: 'POST', url: '/api/auth/register', name: 'register', protected: false, okRoles: allRoles, expectedOk: [201] },
  { method: 'POST', url: '/api/auth/login', name: 'login', protected: false, okRoles: allRoles, expectedOk: [200] },
  { method: 'POST', url: '/api/auth/refresh', name: 'refresh', protected: false, okRoles: allRoles, expectedOk: [200] },
  { method: 'POST', url: '/api/auth/logout', name: 'logout', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'GET', url: '/api/auth/me', name: 'me', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'POST', url: '/api/auth/accept-invite', name: 'accept invite', protected: false, okRoles: allRoles, expectedOk: [201, 404, 409] },
  { method: 'POST', url: '/api/auth/forgot-password', name: 'forgot password', protected: false, okRoles: allRoles, expectedOk: [200, 404] },
  { method: 'POST', url: '/api/auth/reset-password', name: 'reset password', protected: false, okRoles: allRoles, expectedOk: [200, 404] },
  { method: 'GET', url: '/api/company/availability?slug=journey-gmbh&domain=journey.test', name: 'company availability', protected: false, okRoles: allRoles, expectedOk: [200] },
  { method: 'GET', url: '/api/company/resolve/demo-company', name: 'company resolve', protected: false, okRoles: allRoles, expectedOk: [200] },
  { method: 'GET', url: '/api/company', name: 'company get', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'PATCH', url: '/api/company', name: 'company update', protected: true, body: { timezone: 'Europe/Berlin' }, okRoles: hr, expectedOk: [200] },
  { method: 'POST', url: '/api/company/domain/verification', name: 'domain verification', protected: true, body: { domain: 'demo-company.com' }, okRoles: hr, expectedOk: [201, 409] },
  { method: 'POST', url: '/api/company/domain/verify', name: 'domain verify', protected: true, body: { token: 'invalid-token' }, okRoles: hr, expectedOk: [200, 409] },
  { method: 'POST', url: '/api/company/logo', name: 'company logo', protected: true, body: { logoUrl: 'https://example.test/logo.png' }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'GET', url: '/api/company/members', name: 'company members', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'GET', url: '/api/company/billing', name: 'company billing', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'PATCH', url: '/api/company/billing', name: 'company billing update', protected: true, body: { plan: 'pro' }, okRoles: hr, expectedOk: [200] },
  { method: 'POST', url: '/api/company/members/invite', name: 'member invite', protected: true, body: { email: 'invitee@example.test', fullName: 'Invitee User', role: 'viewer' }, okRoles: hr, expectedOk: [201, 409] },
  { method: 'PATCH', url: `/api/company/members/${memberUserId}/role`, name: 'member role update', protected: true, body: { role: 'manager' }, okRoles: hr, expectedOk: [200] },
  { method: 'DELETE', url: `/api/company/members/${memberUserId}`, name: 'member delete', protected: true, okRoles: hr, expectedOk: [200, 204] },
  { method: 'PATCH', url: '/api/company/owner', name: 'owner transfer', protected: true, body: { userId: memberUserId }, okRoles: hr, expectedOk: [200] },
  { method: 'GET', url: '/api/hires', name: 'hires list', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'POST', url: '/api/hires', name: 'hires create', protected: true, body: { fullName: 'Catalog Hire', email: 'catalog-hire@example.test', startDate: '2026-06-01' }, okRoles: hr, expectedOk: [201, 200, 409] },
  { method: 'GET', url: `/api/hires/${hireId}`, name: 'hire get', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'PATCH', url: `/api/hires/${hireId}`, name: 'hire update', protected: true, body: { notes: 'Catalog update' }, okRoles: hr, expectedOk: [200] },
  { method: 'DELETE', url: `/api/hires/${SEED_IDS.hires.secondary}`, name: 'hire delete', protected: true, okRoles: hr, expectedOk: [200, 204] },
  { method: 'PATCH', url: `/api/hires/${hireId}/approve`, name: 'hire approve', protected: true, okRoles: hr, expectedOk: [200, 409] },
  { method: 'POST', url: `/api/hires/${hireId}/resend-invite`, name: 'hire resend invite', protected: true, okRoles: hr, expectedOk: [201, 200, 409] },
  { method: 'GET', url: '/api/templates', name: 'templates list', protected: true, okRoles: hrManager, expectedOk: [200] },
  { method: 'POST', url: '/api/templates', name: 'templates create', protected: true, body: { name: 'Catalog Template' }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'GET', url: `/api/templates/${templateId}`, name: 'template get', protected: true, okRoles: hrManager, expectedOk: [200] },
  { method: 'PATCH', url: `/api/templates/${templateId}`, name: 'template update', protected: true, body: { description: 'Updated by catalog' }, okRoles: hr, expectedOk: [200] },
  { method: 'DELETE', url: `/api/templates/${templateId}`, name: 'template delete', protected: true, okRoles: hr, expectedOk: [200, 204, 409] },
  { method: 'POST', url: `/api/templates/${templateId}/duplicate`, name: 'template duplicate', protected: true, okRoles: hr, expectedOk: [201, 200] },
  { method: 'POST', url: `/api/templates/${templateId}/tasks`, name: 'template task create', protected: true, body: { title: 'Catalog Task', taskType: 'checkbox', phase: 'week_1', assignedRole: 'new_hire', dueDayOffset: 1 }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'PATCH', url: `/api/templates/${templateId}/tasks/${SEED_IDS.templateTasks.checkbox}`, name: 'template task update', protected: true, body: { title: 'Updated Checkbox Task' }, okRoles: hr, expectedOk: [200] },
  { method: 'DELETE', url: `/api/templates/${templateId}/tasks/${SEED_IDS.templateTasks.meeting}`, name: 'template task delete', protected: true, okRoles: hr, expectedOk: [200, 204] },
  { method: 'POST', url: `/api/templates/${templateId}/tasks/reorder`, name: 'template tasks reorder', protected: true, body: { taskIds: [SEED_IDS.templateTasks.checkbox, SEED_IDS.templateTasks.documentUpload, SEED_IDS.templateTasks.acknowledgement, SEED_IDS.templateTasks.meeting] }, okRoles: hr, expectedOk: [201, 200, 400] },
  { method: 'GET', url: '/api/tasks', name: 'tasks mine', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'GET', url: `/api/tasks/hire/${hireId}`, name: 'tasks by hire', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: `/api/tasks/${taskId}?hireId=${hireId}`, name: 'task get', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'PATCH', url: `/api/tasks/${taskId}?hireId=${hireId}`, name: 'task update', protected: true, body: { note: 'Catalog note' }, okRoles: allRoles, expectedOk: [200] },
  { method: 'PATCH', url: `/api/tasks/${taskId}/complete?hireId=${hireId}`, name: 'task complete', protected: true, okRoles: allRoles, expectedOk: [200, 409] },
  { method: 'PATCH', url: `/api/tasks/${taskId}/skip?hireId=${hireId}`, name: 'task skip', protected: true, okRoles: hrManager, expectedOk: [200, 400, 409] },
  { method: 'PATCH', url: `/api/tasks/${taskId}/block?hireId=${hireId}`, name: 'task block', protected: true, body: { note: 'Blocked by catalog' }, okRoles: hrManager, expectedOk: [200, 409] },
  { method: 'POST', url: `/api/tasks/${taskId}/note?hireId=${hireId}`, name: 'task note', protected: true, body: { note: 'Manager catalog note' }, okRoles: manager, expectedOk: [201, 200] },
  { method: 'GET', url: '/api/documents/company', name: 'company documents', protected: true, okRoles: documentReaders, expectedOk: [200] },
  { method: 'GET', url: '/api/documents/pending-review', name: 'pending documents', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'GET', url: `/api/documents/hire/${hireId}`, name: 'hire documents', protected: true, okRoles: documentReaders, expectedOk: [200] },
  { method: 'GET', url: `/api/documents/${documentId}`, name: 'document get', protected: true, okRoles: documentReaders, expectedOk: [200] },
  { method: 'PATCH', url: `/api/documents/${documentId}`, name: 'document update', protected: true, body: { name: 'Updated Document' }, okRoles: hr, expectedOk: [200] },
  { method: 'DELETE', url: `/api/documents/${documentId}`, name: 'document delete', protected: true, okRoles: hr, expectedOk: [200, 204] },
  { method: 'GET', url: `/api/documents/${companyDocumentId}/url`, name: 'document signed url', protected: true, okRoles: documentReaders, expectedOk: [200] },
  { method: 'GET', url: `/api/documents/${companyDocumentId}/versions`, name: 'document versions', protected: true, okRoles: documentReaders, expectedOk: [200] },
  { method: 'GET', url: `/api/documents/${companyDocumentId}/acknowledgements`, name: 'document acknowledgements', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'POST', url: '/api/documents', name: 'document create', protected: true, body: { name: 'Catalog Doc', originalName: 'catalog.pdf', filePath: 'catalog/catalog.pdf', category: 'policy', isCompanyDoc: true, mimeType: 'application/pdf' }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'POST', url: `/api/documents/${documentId}/version`, name: 'document version', protected: true, body: { name: 'Catalog Version', originalName: 'catalog-v2.pdf', filePath: 'catalog/catalog-v2.pdf', category: 'policy', mimeType: 'application/pdf' }, okRoles: hr, expectedOk: [201, 200, 409] },
  { method: 'PATCH', url: `/api/documents/${documentId}/approve`, name: 'document approve', protected: true, okRoles: hr, expectedOk: [200, 409] },
  { method: 'PATCH', url: `/api/documents/${documentId}/reject`, name: 'document reject', protected: true, body: { reason: 'Catalog rejection' }, okRoles: hr, expectedOk: [200, 409] },
  { method: 'POST', url: `/api/documents/${companyDocumentId}/acknowledge`, name: 'document acknowledge', protected: true, body: { hireId }, okRoles: allRoles, expectedOk: [201, 200, 400] },
  { method: 'GET', url: '/api/analytics/overview', name: 'analytics overview', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/active-hires', name: 'analytics active hires', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/completion-by-department', name: 'analytics department', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/phase-time', name: 'analytics phase time', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/overdue-tasks', name: 'analytics overdue', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/document-review-queue', name: 'analytics docs', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/hire-cohort', name: 'analytics cohort', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/realtime-config', name: 'analytics realtime', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/export/hires', name: 'analytics hires export', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'GET', url: '/api/analytics/export/tasks', name: 'analytics tasks export', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'GET', url: `/api/analytics/report/hire/${hireId}`, name: 'analytics hire report', protected: true, okRoles: readers, expectedOk: [200] },
  { method: 'GET', url: '/api/notifications', name: 'notifications list', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'GET', url: '/api/notifications/unread-count', name: 'notifications unread', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'PATCH', url: '/api/notifications/read-all', name: 'notifications read all', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'PATCH', url: `/api/notifications/${notificationId}/read`, name: 'notification read', protected: true, okRoles: hr, expectedOk: [200, 404] },
  { method: 'DELETE', url: `/api/notifications/${notificationId}`, name: 'notification delete', protected: true, okRoles: hr, expectedOk: [200, 204, 404] },
  { method: 'GET', url: '/api/notifications/jobs', name: 'jobs list', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'POST', url: '/api/notifications/jobs', name: 'jobs create', protected: true, body: { type: 'send_task_reminder', payload: { taskId }, scheduledAt: new Date(Date.now() + 60000).toISOString() }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'PATCH', url: `/api/notifications/jobs/${jobId}/cancel`, name: 'job cancel', protected: true, okRoles: hr, expectedOk: [200, 400] },
  { method: 'PATCH', url: `/api/notifications/jobs/${jobId}/retry`, name: 'job retry', protected: true, okRoles: hr, expectedOk: [200, 400] },
  { method: 'POST', url: '/api/notifications/jobs/tick', name: 'jobs tick', protected: true, okRoles: hr, expectedOk: [201, 200] },
  { method: 'POST', url: '/api/notifications/trigger', name: 'notification trigger', protected: true, body: { event: 'doc_uploaded', payload: { documentId, hireId, documentName: 'Catalog trigger.pdf', uploadedBy: SEED_IDS.users.hrAdmin } }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'GET', url: '/api/notifications/email-log', name: 'email log', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'GET', url: '/api/it-checklists/templates', name: 'it templates', protected: true, okRoles: hrIt, expectedOk: [200] },
  { method: 'POST', url: '/api/it-checklists/templates', name: 'it template create', protected: true, body: { name: 'Catalog IT Template' }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'GET', url: `/api/it-checklists/templates/${itTemplateId}`, name: 'it template get', protected: true, okRoles: hrIt, expectedOk: [200] },
  { method: 'PATCH', url: `/api/it-checklists/templates/${itTemplateId}`, name: 'it template update', protected: true, body: { description: 'Catalog IT update' }, okRoles: hr, expectedOk: [200] },
  { method: 'DELETE', url: `/api/it-checklists/templates/${itTemplateId}`, name: 'it template delete', protected: true, okRoles: hr, expectedOk: [200, 204] },
  { method: 'POST', url: `/api/it-checklists/templates/${itTemplateId}/items`, name: 'it template item create', protected: true, body: { title: 'Catalog IT Item', category: 'hardware' }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'PATCH', url: `/api/it-checklists/templates/${itTemplateId}/items/${itTemplateItemId}`, name: 'it template item update', protected: true, body: { title: 'Catalog Updated IT Item' }, okRoles: hr, expectedOk: [200] },
  { method: 'DELETE', url: `/api/it-checklists/templates/${itTemplateId}/items/${itTemplateItemId}`, name: 'it template item delete', protected: true, okRoles: hr, expectedOk: [200, 204] },
  { method: 'POST', url: `/api/it-checklists/templates/${itTemplateId}/items/reorder`, name: 'it template reorder', protected: true, body: { itemIds: ['it-ti-0001', 'it-ti-0002', 'it-ti-0003', 'it-ti-0004', 'it-ti-0005', 'it-ti-0006', 'it-ti-0007', 'it-ti-0008', 'it-ti-0009'] }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'GET', url: '/api/it-checklists', name: 'it checklists', protected: true, okRoles: hrIt, expectedOk: [200] },
  { method: 'POST', url: '/api/it-checklists', name: 'it checklist create', protected: true, body: { hireId: 'catalog-hire-id', assignedTo: SEED_IDS.users.itAdmin }, okRoles: hr, expectedOk: [201, 200, 409] },
  { method: 'GET', url: '/api/it-checklists/mine', name: 'it checklists mine', protected: true, okRoles: it, expectedOk: [200] },
  { method: 'GET', url: `/api/it-checklists/hire/${hireId}`, name: 'it checklist by hire', protected: true, okRoles: hrIt, expectedOk: [200] },
  { method: 'GET', url: `/api/it-checklists/${checklistId}`, name: 'it checklist get', protected: true, okRoles: hrIt, expectedOk: [200] },
  { method: 'PATCH', url: `/api/it-checklists/${checklistId}`, name: 'it checklist update', protected: true, body: { notes: 'Catalog checklist update' }, okRoles: hrIt, expectedOk: [200] },
  { method: 'POST', url: `/api/it-checklists/${checklistId}/items`, name: 'it checklist item create', protected: true, body: { title: 'Catalog Checklist Item', category: 'hardware' }, okRoles: hrIt, expectedOk: [201, 200] },
  { method: 'PATCH', url: `/api/it-checklists/${checklistId}/items/${checklistItemId}`, name: 'it checklist item update', protected: true, body: { note: 'Catalog item update' }, okRoles: hrIt, expectedOk: [200] },
  { method: 'PATCH', url: `/api/it-checklists/${checklistId}/items/${checklistItemId}/complete`, name: 'it checklist item complete', protected: true, body: { assetTag: 'CATALOG-1' }, okRoles: hrIt, expectedOk: [200, 409] },
  { method: 'PATCH', url: `/api/it-checklists/${checklistId}/items/${checklistItemId}/block`, name: 'it checklist item block', protected: true, body: { note: 'Catalog block' }, okRoles: hrIt, expectedOk: [200, 409] },
  { method: 'GET', url: '/api/manager/dashboard', name: 'manager dashboard', protected: true, okRoles: manager, expectedOk: [200] },
  { method: 'GET', url: `/api/manager/hires/${hireId}`, name: 'manager hire get', protected: true, okRoles: manager, expectedOk: [200] },
  { method: 'POST', url: `/api/manager/hires/${hireId}/approve-phase`, name: 'manager phase approve', protected: true, body: { phase: 'week_1', note: 'Catalog approval' }, okRoles: manager, expectedOk: [201, 200, 400, 409] },
  { method: 'DELETE', url: `/api/manager/hires/${hireId}/phases/pre_boarding`, name: 'manager phase delete', protected: true, okRoles: manager, expectedOk: [200, 204, 404] },
  { method: 'GET', url: `/api/manager/hires/${hireId}/phases`, name: 'manager phases', protected: true, okRoles: manager, expectedOk: [200] },
  { method: 'POST', url: `/api/manager/hires/${hireId}/final-approval`, name: 'manager final approval', protected: true, body: { note: 'Catalog final approval' }, okRoles: manager, expectedOk: [201, 200, 409] },
  { method: 'GET', url: `/api/manager/hires/${hireId}/notes`, name: 'manager notes', protected: true, okRoles: manager, expectedOk: [200] },
  { method: 'POST', url: `/api/manager/hires/${hireId}/notes`, name: 'manager note create', protected: true, body: { body: 'Catalog manager note' }, okRoles: manager, expectedOk: [201, 200] },
  { method: 'PATCH', url: `/api/manager/hires/${hireId}/notes/${managerNoteId}`, name: 'manager note update', protected: true, body: { body: 'Updated catalog note' }, okRoles: manager, expectedOk: [200] },
  { method: 'DELETE', url: `/api/manager/hires/${hireId}/notes/${managerNoteId}`, name: 'manager note delete', protected: true, okRoles: manager, expectedOk: [200, 204, 404] },
  { method: 'GET', url: `/api/manager/hires/${hireId}/reupload-requests`, name: 'manager reupload list', protected: true, okRoles: manager, expectedOk: [200] },
  { method: 'POST', url: `/api/manager/hires/${hireId}/reupload-requests`, name: 'manager reupload create', protected: true, body: { documentId, reason: 'Catalog reupload request' }, okRoles: manager, expectedOk: [201, 200] },
  { method: 'DELETE', url: `/api/manager/hires/${hireId}/reupload-requests/${reuploadRequestId}`, name: 'manager reupload delete', protected: true, okRoles: manager, expectedOk: [200, 204, 404] },
  { method: 'GET', url: '/api/gdpr/access-log', name: 'gdpr access log', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'POST', url: '/api/gdpr/access-log', name: 'gdpr access log create', protected: true, body: { action: 'view', resourceType: 'hire', resourceId: hireId, legalBasis: 'legitimate_interest' }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'GET', url: `/api/gdpr/export/hire/${hireId}`, name: 'gdpr hire export', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'POST', url: `/api/gdpr/anonymise/hire/${hireId}`, name: 'gdpr anonymise', protected: true, body: { reason: 'Catalog anonymise' }, okRoles: hr, expectedOk: [201, 200, 409] },
  { method: 'GET', url: '/api/gdpr/erasure-requests', name: 'gdpr erasure list', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'POST', url: '/api/gdpr/erasure-requests', name: 'gdpr erasure create', protected: true, body: { hireId, reason: 'Catalog erasure request' }, okRoles: hr.concat(hire), expectedOk: [201, 200, 409] },
  { method: 'PATCH', url: `/api/gdpr/erasure-requests/${erasureRequestId}`, name: 'gdpr erasure update', protected: true, body: { status: 'approved' }, okRoles: hr, expectedOk: [200, 404] },
  { method: 'GET', url: '/api/gdpr/retention/expired', name: 'gdpr retention expired', protected: true, okRoles: hr, expectedOk: [200] },
  { method: 'GET', url: '/api/gdpr/privacy-policy', name: 'gdpr privacy policy', protected: true, okRoles: allRoles, expectedOk: [200] },
  { method: 'POST', url: '/api/gdpr/privacy-policy', name: 'gdpr privacy policy create', protected: true, body: { version: `v${Date.now()}`, content: 'Catalog privacy policy', effectiveAt: new Date().toISOString() }, okRoles: hr, expectedOk: [201, 200] },
  { method: 'POST', url: `/api/gdpr/privacy-policy/${privacyPolicyId}/acknowledge`, name: 'gdpr privacy acknowledge', protected: true, okRoles: allRoles, expectedOk: [201, 200, 404] },
  { method: 'GET', url: `/api/gdpr/privacy-policy/${privacyPolicyId}/acknowledgements`, name: 'gdpr privacy acknowledgements', protected: true, okRoles: hr, expectedOk: [200, 404] },
];

export const protectedEndpoints = endpointCatalog.filter((endpoint) => endpoint.protected);
export const postAndPatchEndpoints = endpointCatalog.filter(
  (endpoint) => endpoint.method === 'POST' || endpoint.method === 'PATCH',
);

export function endpointBody(endpoint: EndpointCase): Record<string, unknown> {
  if (endpoint.url === '/api/auth/login') {
    return { email: 'hr@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' };
  }
  if (endpoint.url === '/api/auth/register') {
    const unique = Date.now();
    return {
      companyName: `Catalog ${unique} GmbH`,
      adminEmail: `admin-${unique}@catalog-${unique}.test`,
      adminName: 'Catalog Admin',
      password: 'Test1234!',
      domain: `catalog-${unique}.test`,
      slug: `catalog-${unique}`,
    };
  }
  if (endpoint.url === '/api/auth/refresh') {
    return { refreshToken: 'refresh-token-must-be-provided-by-test' };
  }
  return endpoint.body ?? {};
}

export const criticalGetEndpoints = [
  '/api/health',
  '/api/auth/me',
  '/api/hires',
  '/api/tasks',
  '/api/notifications/unread-count',
  '/api/analytics/overview',
  '/api/documents/company',
  '/api/it-checklists/mine',
  '/api/manager/dashboard',
  `/api/analytics/report/hire/${hireId}`,
] as const;
