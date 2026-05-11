// tests/unit/gdpr.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from '../../apps/api/src/documents/documents.service';
import { GdprService } from '../../apps/api/src/gdpr/gdpr.service';
import { HiresService } from '../../apps/api/src/hires/hires.service';
import { TemplatesService } from '../../apps/api/src/templates/templates.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('GdprService', () => {
  let moduleRef: TestingModule;
  let service: GdprService;
  const companyId = SEED_IDS.companies.testGmbh;
  const hrUserId = SEED_IDS.users.hrAdmin;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TemplatesService, HiresService, DocumentsService, GdprService],
    }).compile();
    service = moduleRef.get(GdprService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('access log and export', () => {
    it('logs access and exports hire data', () => {
      const entry = service.logAccess(companyId, {
        userId: hrUserId,
        action: 'hire.viewed',
        entityType: 'hire',
        entityId: SEED_IDS.hires.primary,
      });
      expect(service.getAccessLog(companyId).entries[0].id).toBe(entry.id);
      expect(service.exportHireData(companyId, SEED_IDS.hires.primary).hire.email).toContain('@');
    });
  });

  describe('erasure and policies', () => {
    it('creates and processes erasure requests', () => {
      const request = service.createErasureRequest(companyId, hrUserId, {
        hireId: SEED_IDS.hires.primary,
        reason: 'Unit erasure request',
      });
      expect(request.status).toBe('pending');
      expect(
        service.processErasureRequest(companyId, request.id, hrUserId, {
          status: 'rejected',
          notes: 'Retention still required',
        }).status,
      ).toBe('rejected');
    });

    it('creates and acknowledges privacy policies', () => {
      const policy = service.createPolicy(companyId, hrUserId, {
        version: `unit-${Date.now()}`,
        effectiveAt: new Date().toISOString(),
      });
      const ack = service.acknowledgePolicy(companyId, policy.id, SEED_IDS.users.newHire);
      expect(service.listPolicyAcknowledgements(companyId, policy.id)[0].id).toBe(ack.id);
      expect(() => service.acknowledgePolicy(companyId, 'missing-policy', SEED_IDS.users.newHire)).toThrow(
        NotFoundException,
      );
      expect(() => service.createPolicy(companyId, hrUserId, { version: '', effectiveAt: '' })).toThrow(
        BadRequestException,
      );
    });
  });
});
