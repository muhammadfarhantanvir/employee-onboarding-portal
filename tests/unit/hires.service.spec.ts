// tests/unit/hires.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { HiresService } from '../../apps/api/src/hires/hires.service';
import { TemplatesService } from '../../apps/api/src/templates/templates.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('HiresService', () => {
  let moduleRef: TestingModule;
  let service: HiresService;
  const companyId = SEED_IDS.companies.testGmbh;
  const hrUserId = SEED_IDS.users.hrAdmin;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TemplatesService, HiresService],
    }).compile();
    service = moduleRef.get(HiresService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('listHires/getHire', () => {
    it('returns seeded hires with status counts', () => {
      const response = service.listHires(companyId);
      expect(response.hires.length).toBeGreaterThan(0);
      expect(response.byStatus.in_progress).toBeGreaterThanOrEqual(1);
    });

    it('throws NotFoundException for an unknown hire', () => {
      expect(() => service.getHire(companyId, 'missing')).toThrow(NotFoundException);
    });
  });

  describe('createHire', () => {
    it('creates a hire and instantiates template tasks', () => {
      const hire = service.createHire(
        companyId,
        {
          fullName: 'Unit Hire',
          email: 'unit-hire@example.test',
          startDate: '2026-06-01',
          managerId: SEED_IDS.users.manager,
          templateId: SEED_IDS.templates.softwareEngineer,
        },
        hrUserId,
      );

      expect(hire.id).toEqual(expect.any(String));
      expect(hire.tasks).toBeDefined();
      expect(hire.tasks?.length).toBeGreaterThan(0);
    });

    it('rejects missing required fields', () => {
      expect(() =>
        service.createHire(companyId, { fullName: '', email: 'bad', startDate: 'tomorrow' }, hrUserId),
      ).toThrow(BadRequestException);
    });

    it('rejects duplicate active hire emails', () => {
      const input = {
        fullName: 'Duplicate Hire',
        email: 'duplicate-hire@example.test',
        startDate: '2026-06-01',
      };
      service.createHire(companyId, input, hrUserId);
      expect(() => service.createHire(companyId, input, hrUserId)).toThrow(ConflictException);
    });
  });

  describe('updateHire/delete/approve', () => {
    it('updates hire metadata', () => {
      const updated = service.updateHire(companyId, SEED_IDS.hires.primary, { notes: 'Unit note' });
      expect(updated.notes).toBe('Unit note');
    });

    it('marks a hire as completed', () => {
      const updated = service.approveHire(companyId, SEED_IDS.hires.primary);
      expect(updated.status).toBe('completed');
    });

    it('cancels a hire', () => {
      expect(service.cancelHire(companyId, SEED_IDS.hires.secondary)).toEqual({ success: true });
    });
  });
});
