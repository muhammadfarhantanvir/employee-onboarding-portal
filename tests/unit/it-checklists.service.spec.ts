// tests/unit/it-checklists.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ItChecklistService } from '../../apps/api/src/it-checklist/it-checklist.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('ItChecklistService', () => {
  let moduleRef: TestingModule;
  let service: ItChecklistService;
  const companyId = SEED_IDS.companies.testGmbh;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({ providers: [ItChecklistService] }).compile();
    service = moduleRef.get(ItChecklistService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('templates', () => {
    it('creates, updates, reorders, and deletes template items', () => {
      const template = service.createTemplate(companyId, { name: 'Unit IT Template' }, SEED_IDS.users.hrAdmin);
      const item = service.addTemplateItem(companyId, template.id, { title: 'Laptop', category: 'hardware' });
      expect(service.updateTemplateItem(companyId, template.id, item.id, { title: 'Laptop Pro' }).title).toBe(
        'Laptop Pro',
      );
      expect(service.reorderTemplateItems(companyId, template.id, [item.id]).items[0].sortOrder).toBe(0);
      service.deleteTemplateItem(companyId, template.id, item.id);
      service.deleteTemplate(companyId, template.id);
      expect(() => service.getTemplate(companyId, template.id)).toThrow(NotFoundException);
    });

    it('validates template payloads', () => {
      expect(() => service.createTemplate(companyId, { name: '' }, SEED_IDS.users.hrAdmin)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('checklists', () => {
    it('lists and updates seeded checklists', () => {
      expect(service.listChecklists(companyId).count).toBeGreaterThan(0);
      expect(service.getChecklistByHire(companyId, SEED_IDS.hires.primary).id).toBe(SEED_IDS.it.checklist);
      expect(service.updateChecklist(companyId, SEED_IDS.it.checklist, { notes: 'Unit update' }).notes).toBe(
        'Unit update',
      );
    });

    it('creates checklist items and handles item transitions', () => {
      const item = service.addChecklistItem(companyId, SEED_IDS.it.checklist, {
        title: 'Unit Item',
        category: 'hardware',
      });
      expect(service.blockChecklistItem(companyId, SEED_IDS.it.checklist, item.id, 'Waiting').status).toBe(
        'blocked',
      );
      expect(
        service.completeChecklistItem(companyId, SEED_IDS.it.checklist, item.id, SEED_IDS.users.itAdmin).status,
      ).toBe('completed');
      expect(() =>
        service.completeChecklistItem(companyId, SEED_IDS.it.checklist, item.id, SEED_IDS.users.itAdmin),
      ).toThrow(ConflictException);
    });
  });
});
