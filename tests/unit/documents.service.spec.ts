// tests/unit/documents.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from '../../apps/api/src/documents/documents.service';
import { SEED_IDS } from '../../prisma/seed.test';

describe('DocumentsService', () => {
  let moduleRef: TestingModule;
  let service: DocumentsService;
  const companyId = SEED_IDS.companies.testGmbh;
  const hrUserId = SEED_IDS.users.hrAdmin;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({ providers: [DocumentsService] }).compile();
    service = moduleRef.get(DocumentsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('list/get/register', () => {
    it('lists company and hire documents', () => {
      expect(service.listCompanyDocuments(companyId).documents.length).toBeGreaterThan(0);
      expect(service.listHireDocuments(companyId, SEED_IDS.hires.primary).documents.length).toBeGreaterThan(0);
    });

    it('registers a pending review document', () => {
      const doc = service.registerDocument(companyId, hrUserId, {
        name: 'Unit Policy',
        originalName: 'unit-policy.pdf',
        filePath: 'unit/unit-policy.pdf',
        category: 'policy',
        mimeType: 'application/pdf',
        isCompanyDoc: true,
      });
      expect(doc.status).toBe('pending_review');
    });

    it('rejects invalid document payloads', () => {
      expect(() =>
        service.registerDocument(companyId, hrUserId, {
          name: '',
          originalName: 'x.exe',
          filePath: 'x.exe',
          category: 'policy',
          mimeType: 'application/x-msdownload',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('review/version/delete', () => {
    it('approves, versions, and signs documents', () => {
      const approved = service.approveDocument(companyId, SEED_IDS.documents.pendingReview, hrUserId);
      expect(approved.status).toBe('approved');
      const signed = service.getSignedUrl(companyId, approved.id, hrUserId);
      expect(signed.url).toContain('token=');
      const version = service.uploadNewVersion(companyId, approved.id, hrUserId, {
        name: 'Unit Policy v2',
        originalName: 'unit-policy-v2.pdf',
        filePath: 'unit/unit-policy-v2.pdf',
        category: 'policy',
        mimeType: 'application/pdf',
      });
      expect(version.version).toBe(approved.version + 1);
    });

    it('rejects approving a superseded document', () => {
      const doc = service.uploadNewVersion(companyId, SEED_IDS.documents.pendingReview, hrUserId, {
        name: 'Superseding',
        originalName: 'superseding.pdf',
        filePath: 'unit/superseding.pdf',
        category: 'policy',
      });
      expect(doc.parentId).toBe(SEED_IDS.documents.pendingReview);
      expect(() => service.approveDocument(companyId, SEED_IDS.documents.pendingReview, hrUserId)).toThrow(
        ConflictException,
      );
    });

    it('enforces delete ownership and not-found rules', () => {
      expect(() => service.getDocument(companyId, 'missing-doc')).toThrow(NotFoundException);
      expect(() =>
        service.deleteDocument(companyId, SEED_IDS.documents.companyPolicy, SEED_IDS.users.newHire, false),
      ).toThrow(ForbiddenException);
    });
  });
});
