// tests/unit/tasks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { HiresService } from '../../apps/api/src/hires/hires.service';
import { TemplatesService } from '../../apps/api/src/templates/templates.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('Tasks service behavior through HiresService', () => {
  let moduleRef: TestingModule;
  let service: HiresService;
  const companyId = SEED_IDS.companies.testGmbh;
  const hireId = SEED_IDS.hires.primary;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TemplatesService, HiresService],
    }).compile();
    service = moduleRef.get(HiresService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('listHireTasks/getHireTask', () => {
    it('returns seeded tasks with phase and status summaries', () => {
      const response = service.listHireTasks(hireId);
      expect(response.tasks.length).toBeGreaterThan(0);
      expect(response.byPhase.pre_boarding).toBeGreaterThan(0);
    });

    it('throws NotFoundException for an unknown task', () => {
      expect(() => service.getHireTask(hireId, 'missing-task')).toThrow(NotFoundException);
    });
  });

  describe('completeTask', () => {
    it('marks a pending task complete', () => {
      const task = service.completeTask(companyId, hireId, SEED_IDS.tasks.documentUpload);
      expect(task.status).toBe('completed');
      expect(task.completedAt).toEqual(expect.any(String));
    });

    it('rejects completing an already completed task', () => {
      expect(() => service.completeTask(companyId, hireId, SEED_IDS.tasks.checkbox)).toThrow(
        ConflictException,
      );
    });
  });

  describe('skip/block/note/update', () => {
    it('rejects skipping a required task', () => {
      expect(() => service.skipTask(companyId, hireId, SEED_IDS.tasks.documentUpload)).toThrow(
        BadRequestException,
      );
    });

    it('blocks a task with a note', () => {
      const task = service.blockTask(companyId, hireId, SEED_IDS.tasks.documentUpload, 'Waiting');
      expect(task.status).toBe('blocked');
      expect(task.note).toBe('Waiting');
    });

    it('adds a note and validates note body', () => {
      expect(service.addNote(companyId, hireId, SEED_IDS.tasks.documentUpload, 'Review needed').note).toBe(
        'Review needed',
      );
      expect(() => service.addNote(companyId, hireId, SEED_IDS.tasks.documentUpload, '')).toThrow(
        BadRequestException,
      );
    });
  });
});
