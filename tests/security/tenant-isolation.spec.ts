// tests/security/tenant-isolation.spec.ts
import request from 'supertest';
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { loginAs } from '../helpers/auth.helper';
import { SEED_IDS } from '../../prisma/seed.test';

describe('Tenant isolation', () => {
  let ctx: TestAppContext;
  let testToken: string;
  let otherToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    testToken = (await loginAs('hr_admin', ctx.app)).token;
    const unique = Date.now();
    const register = await request(ctx.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        companyName: 'Other GmbH',
        slug: `other-gmbh-${unique}`,
        adminName: 'Other HR',
        adminEmail: `hr@other-${unique}.test`,
        password: 'Test1234!',
        domain: `other-${unique}.test`,
      })
      .expect(201);
    otherToken = register.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  it('Other GmbH cannot read or mutate Test GmbH hire-scoped resources', async () => {
    const server = ctx.app.getHttpServer();
    const urls = [
      `/api/hires/${SEED_IDS.hires.primary}`,
      `/api/tasks/hire/${SEED_IDS.hires.primary}`,
      `/api/documents/hire/${SEED_IDS.hires.primary}`,
      `/api/templates/${SEED_IDS.templates.softwareEngineer}`,
      `/api/gdpr/export/hire/${SEED_IDS.hires.primary}`,
    ];

    for (const url of urls) {
      const response = await request(server).get(url).set('Authorization', `Bearer ${otherToken}`);
      expect([200, 403, 404]).toContain(response.status);
      if (response.status === 200) {
        const serialised = JSON.stringify(response.body);
        expect(serialised).not.toContain('Nina Newhire');
        expect(serialised).not.toContain(SEED_IDS.companies.testGmbh);
      }
    }

    const resend = await request(server)
      .post(`/api/hires/${SEED_IDS.hires.primary}/resend-invite`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect([403, 404]).toContain(resend.status);

    const remove = await request(server)
      .delete(`/api/hires/${SEED_IDS.hires.primary}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect([403, 404]).toContain(remove.status);
  });

  it('tenant-specific analytics and members do not leak Test GmbH data', async () => {
    const server = ctx.app.getHttpServer();
    const otherAnalytics = await request(server)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherAnalytics.status).toBeLessThan(500);
    expect(JSON.stringify(otherAnalytics.body)).not.toContain('Nina Newhire');

    const otherMembers = await request(server)
      .get('/api/company/members')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherMembers.status).toBe(200);
    expect(JSON.stringify(otherMembers.body)).not.toContain('hr@demo-company.com');

    const testMembers = await request(server)
      .get('/api/company/members')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);
    expect(JSON.stringify(testMembers.body)).toContain('hr@demo-company.com');
  });
});
