// tests/unit/analytics.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../../apps/api/src/analytics/analytics.service';
import { DocumentsService } from '../../apps/api/src/documents/documents.service';
import { HiresService } from '../../apps/api/src/hires/hires.service';
import { TemplatesService } from '../../apps/api/src/templates/templates.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('AnalyticsService', () => {
  let moduleRef: TestingModule;
  let service: AnalyticsService;
  const companyId = SEED_IDS.companies.testGmbh;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TemplatesService, HiresService, DocumentsService, AnalyticsService],
    }).compile();
    service = moduleRef.get(AnalyticsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('getOverview', () => {
    it('returns dashboard KPIs', () => {
      expect(service.getOverview(companyId)).toEqual(
        expect.objectContaining({
          activeHires: expect.any(Number),
          pendingDocuments: expect.any(Number),
          refreshedAt: expect.any(String),
        }),
      );
    });
  });

  describe('reports and exports', () => {
    it('returns active hires, department, phase, overdue, queue, and cohort data', () => {
      expect(service.getActiveHires(companyId).hires.length).toBeGreaterThan(0);
      expect(service.getCompletionByDepartment(companyId)[0]).toHaveProperty('department');
      expect(service.getPhaseTimeMetrics(companyId)[0]).toHaveProperty('phase');
      expect(service.getOverdueTasks(companyId)).toHaveProperty('count');
      expect(service.getDocumentReviewQueue(companyId)).toHaveProperty('documents');
      expect(service.getHireCohort(companyId, 3)).toHaveLength(3);
    });

    it('exports CSV and hire summary JSON', () => {
      expect(service.exportHiresCsv(companyId)).toContain('Full Name');
      expect(service.exportTasksCsv(companyId)).toContain('Task Title');
      expect(service.getHireSummaryReport(companyId, SEED_IDS.hires.primary).hire.id).toBe(
        SEED_IDS.hires.primary,
      );
    });
  });
});
