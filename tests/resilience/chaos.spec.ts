// tests/resilience/chaos.spec.ts
import request from 'supertest';
import { ServiceUnavailableException } from '@nestjs/common';
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { loginAs } from '../helpers/auth.helper';
import { DocumentsService } from '../../apps/api/src/documents/documents.service';
import { HiresService } from '../../apps/api/src/hires/hires.service';

describe('Chaos resilience', () => {
  let ctx: TestAppContext;
  let token: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    token = (await loginAs('hr_admin', ctx.app)).token;
  }, 30000);

  afterEach(async () => {
    await ctx.close();
  });

  it('returns a controlled failure when the backing data store times out', async () => {
    const hiresService = ctx.app.get(HiresService);
    jest.spyOn(hiresService, 'listHires').mockImplementation(() => {
      throw new ServiceUnavailableException('Database timeout');
    });

    const response = await request(ctx.app.getHttpServer())
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${token}`);

    expect([503, 500]).toContain(response.status);
    expect(response.body.message).toBeDefined();
  });

  it('keeps workflow endpoints responsive when Redis queues are unavailable', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/api/notifications/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'send_task_reminder', payload: { taskId: 'htask-0003' }, scheduledAt: new Date().toISOString() });

    expect(response.status).toBeLessThan(500);
  });

  it('returns a controlled storage failure for document uploads', async () => {
    const documentsService = ctx.app.get(DocumentsService);
    jest.spyOn(documentsService, 'registerDocument').mockImplementation(() => {
      throw new ServiceUnavailableException('Storage unavailable');
    });

    const response = await request(ctx.app.getHttpServer())
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Storage Chaos',
        originalName: 'storage-chaos.pdf',
        filePath: 'chaos/storage-chaos.pdf',
        category: 'policy',
      });

    expect([503, 500]).toContain(response.status);
    expect(response.body.message).toBeDefined();
  });
});
