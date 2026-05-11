// tests/contract/consumer/auth.consumer.pact.ts
import request from 'supertest';
import { createTestApp, TestAppContext } from '../../setup/create-test-app';

describe('Consumer contract: auth API', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  it('POST /api/auth/login returns tokens and user identity expected by the frontend', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'hr@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email: 'hr@demo-company.com',
          role: 'hr_admin',
        }),
      }),
    );
  });

  it('GET /api/auth/me returns the current user and company expected by the frontend', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'manager@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' })
      .expect(200);

    const response = await request(ctx.app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          id: expect.any(String),
          email: 'manager@demo-company.com',
          role: 'manager',
        }),
        company: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          slug: expect.any(String),
        }),
      }),
    );
  });
});
