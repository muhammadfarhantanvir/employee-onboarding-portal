// tests/contract/provider/pact-provider.spec.ts
import request from 'supertest';
import { createTestApp, TestAppContext } from '../../setup/create-test-app';
import { loginAs } from '../../helpers/auth.helper';

describe('Provider contract verification', () => {
  let ctx: TestAppContext;
  let hrToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    hrToken = (await loginAs('hr_admin', ctx.app)).token;
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  it('verifies priority consumer contracts against the running Nest provider', async () => {
    const server = ctx.app.getHttpServer();
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'hr@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' })
      .expect(200);
    expect(login.body.accessToken).toEqual(expect.any(String));
    expect(login.body.refreshToken).toEqual(expect.any(String));

    const me = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(me.body.company).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String), slug: expect.any(String) }));

    const hires = await request(server)
      .get('/api/hires')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(hires.body.hires[0]).toEqual(expect.objectContaining({ id: expect.any(String), fullName: expect.any(String), status: expect.any(String), completionPct: expect.any(Number) }));

    const tasks = await request(server)
      .get('/api/tasks/hire/hire-0001-0001-0001-000000000001')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(tasks.body.tasks[0]).toEqual(expect.objectContaining({ id: expect.any(String), title: expect.any(String), status: expect.any(String), taskType: expect.any(String), dueDate: expect.any(String) }));

    const signedUrl = await request(server)
      .get('/api/documents/doc-0001-0001-0001-000000000001/url')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(signedUrl.body.url ?? signedUrl.body.signedUrl).toEqual(expect.any(String));
    expect(signedUrl.body.expiresAt).toEqual(expect.any(String));
  });
});
