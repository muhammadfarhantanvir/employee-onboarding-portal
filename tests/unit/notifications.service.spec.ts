// tests/unit/notifications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../../apps/api/src/notifications/notifications.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('NotificationsService', () => {
  let moduleRef: TestingModule;
  let service: NotificationsService;
  const companyId = SEED_IDS.companies.testGmbh;
  const userId = SEED_IDS.users.hrAdmin;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({ providers: [NotificationsService] }).compile();
    service = moduleRef.get(NotificationsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('notifications', () => {
    it('creates, lists, reads, and deletes notifications', () => {
      const created = service.create({ companyId, userId, type: 'doc_uploaded', title: 'Unit notification' });
      expect(service.listForUser(userId).notifications[0].id).toBe(created.id);
      expect(service.markAsRead(userId, created.id).isRead).toBe(true);
      service.deleteNotification(userId, created.id);
      expect(() => service.markAsRead(userId, created.id)).toThrow(NotFoundException);
    });

    it('marks all notifications as read', () => {
      service.create({ companyId, userId, type: 'task_assigned', title: 'Read me' });
      expect(service.markAllRead(userId).updated).toBeGreaterThan(0);
      expect(service.getUnreadCount(userId)).toBe(0);
    });
  });

  describe('workflow jobs', () => {
    it('schedules, lists, cancels, and retries jobs', () => {
      const job = service.scheduleJob(companyId, 'send_task_reminder', { taskId: 'unit' }, new Date());
      expect(service.listJobs(companyId).jobs.some((item) => item.id === job.id)).toBe(true);
      expect(service.cancelJob(companyId, job.id).status).toBe('cancelled');
    });

    it('handles failed job state transitions', () => {
      const job = service.scheduleJob(companyId, 'send_task_reminder', {}, new Date());
      service.markJobRunning(job.id, companyId);
      const failed = service.markJobFailed(job.id, companyId, 'temporary failure');
      expect(failed?.status).toBe('pending');
      expect(() => service.retryJob(companyId, job.id)).toThrow(BadRequestException);
      expect(() => service.cancelJob(companyId, 'missing-job')).toThrow(NotFoundException);
    });
  });
});
