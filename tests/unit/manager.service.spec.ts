// tests/unit/manager.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HiresService } from '../../apps/api/src/hires/hires.service';
import { ManagerService } from '../../apps/api/src/manager/manager.service';
import { NotificationsService } from '../../apps/api/src/notifications/notifications.service';
import { TemplatesService } from '../../apps/api/src/templates/templates.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('ManagerService', () => {
  let moduleRef: TestingModule;
  let service: ManagerService;
  const companyId = SEED_IDS.companies.testGmbh;
  const managerId = SEED_IDS.users.manager;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TemplatesService, HiresService, NotificationsService, ManagerService],
    }).compile();
    service = moduleRef.get(ManagerService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('dashboard and hire view', () => {
    it('returns manager-owned hires and rejects unrelated managers', () => {
      expect(service.getManagerDashboard(companyId, managerId).count).toBeGreaterThan(0);
      expect(service.getManagerHireView(companyId, SEED_IDS.hires.primary, managerId).id).toBe(
        SEED_IDS.hires.primary,
      );
      expect(() =>
        service.getManagerHireView(companyId, SEED_IDS.hires.primary, SEED_IDS.users.hrAdmin),
      ).toThrow(ForbiddenException);
    });
  });

  describe('notes, phases, and reupload requests', () => {
    it('creates, updates, lists, and deletes manager notes', () => {
      const note = service.createManagerNote(companyId, SEED_IDS.hires.primary, managerId, {
        body: 'Unit manager note',
      });
      const notes = service.listManagerNotes(companyId, SEED_IDS.hires.primary, managerId);
      expect(notes.some((managerNote) => managerNote.id === note.id)).toBe(true);
      expect(
        service.updateManagerNote(companyId, SEED_IDS.hires.primary, note.id, managerId, {
          body: 'Updated note',
        }).body,
      ).toBe('Updated note');
      service.deleteManagerNote(companyId, SEED_IDS.hires.primary, note.id, managerId);
      expect(() =>
        service.updateManagerNote(companyId, SEED_IDS.hires.primary, note.id, managerId, { body: 'x' }),
      ).toThrow(NotFoundException);
    });

    it('validates phase approvals and reupload requests', () => {
      expect(() =>
        service.approvePhase(companyId, SEED_IDS.hires.primary, managerId, {
          phase: 'week_1',
          note: 'Cannot yet approve',
        }),
      ).toThrow(BadRequestException);
      const request = service.requestDocumentReupload(companyId, SEED_IDS.hires.primary, managerId, {
        documentId: SEED_IDS.documents.pendingReview,
        reason: 'Need a clearer scan',
      });
      expect(service.cancelReuploadRequest(companyId, SEED_IDS.hires.primary, request.id, managerId).status).toBe(
        'cancelled',
      );
    });
  });
});
