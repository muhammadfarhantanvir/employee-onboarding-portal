// tests/contract/consumer/hires.consumer.pact.ts
import request from 'supertest';
import { createTestApp, TestAppContext } from '../../setup/create-test-app';
import { loginAs } from '../../helpers/auth.helper';

describe('Consumer contract: hires API', () => {
  let ctx: TestAppContext;
  let token: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    token = (await loginAs('hr_admin', ctx.app)).token;
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  it('GET /api/hires returns list rows with frontend-critical fields', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/hires')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const rows = response.body.data ?? response.body.hires;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        fullName: expect.any(String),
        status: expect.any(String),
        completionPct: expect.any(Number),
      }),
    );
    expect(response.body.total ?? response.body.count).toEqual(expect.any(Number));
  });

  it('GET /api/documents/:id/url returns a signed URL contract', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/documents/doc-0001-0001-0001-000000000001/url')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.signedUrl ?? response.body.url).toEqual(expect.any(String));
    expect(response.body.expiresAt).toEqual(expect.any(String));
  });
});
