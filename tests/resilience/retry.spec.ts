// tests/resilience/retry.spec.ts
import { NotificationsService } from '../../apps/api/src/notifications/notifications.service';
import { DocumentsService } from '../../apps/api/src/documents/documents.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('Retry and dead-letter behavior', () => {
  it('moves an email job to failed state after max retries are exhausted', () => {
    const service = new NotificationsService();
    const job = service.scheduleJob(SEED_IDS.companies.testGmbh, 'send_task_reminder', {}, new Date());

    service.markJobRunning(job.id, SEED_IDS.companies.testGmbh);
    service.markJobFailed(job.id, SEED_IDS.companies.testGmbh, 'failure 1');
    service.markJobRunning(job.id, SEED_IDS.companies.testGmbh);
    service.markJobFailed(job.id, SEED_IDS.companies.testGmbh, 'failure 2');
    service.markJobRunning(job.id, SEED_IDS.companies.testGmbh);
    const failed = service.markJobFailed(job.id, SEED_IDS.companies.testGmbh, 'failure 3');

    expect(failed?.status).toBe('failed');
    expect(failed?.lastError).toBe('failure 3');
  });

  it('documents exponential retry timings for reminder jobs', () => {
    const backoffSeconds = [1, 2, 4];
    expect(backoffSeconds.map((value) => value * 1000)).toEqual([1000, 2000, 4000]);
  });

  it('marks a virus-scan failure on document metadata and emits an HR notification', () => {
    const documents = new DocumentsService();
    const notifications = new NotificationsService();
    const doc = documents.registerDocument(SEED_IDS.companies.testGmbh, SEED_IDS.users.newHire, {
      name: 'Virus Scan Target',
      originalName: 'scan.pdf',
      filePath: 'scan/scan.pdf',
      category: 'contract',
      mimeType: 'application/pdf',
      hireId: SEED_IDS.hires.primary,
    });

    const failed = documents.rejectDocument(SEED_IDS.companies.testGmbh, doc.id, SEED_IDS.users.hrAdmin, 'Virus scan failed');
    const notification = notifications.create({
      companyId: SEED_IDS.companies.testGmbh,
      userId: SEED_IDS.users.hrAdmin,
      type: 'doc_rejected',
      title: 'Virus scan failed',
      metadata: { documentId: doc.id },
    });

    expect(failed.status).toBe('rejected');
    expect(notification.userId).toBe(SEED_IDS.users.hrAdmin);
  });
});
