// tests/smoke/smoke.spec.ts
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { loginAs } from '../helpers/auth.helper';

describe('Smoke tests: 10 critical endpoints', () => {
  let ctx: TestAppContext;
  let hrToken: string;
  let managerToken: string;
  let itToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    hrToken = (await loginAs('hr_admin', ctx.app)).token;
    managerToken = (await loginAs('manager', ctx.app)).token;
    itToken = (await loginAs('it_admin', ctx.app)).token;
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  it('GET /api/health -> 200', async () => {
    await request(ctx.app.getHttpServer()).get('/api/health').expect(200);
  });

  it('POST /api/auth/login -> 200 + accessToken', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'hr@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' })
      .expect(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('GET /api/auth/me -> 200 + user.email', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(response.body.user.email).toBe('hr@demo-company.com');
  });

  it('GET /api/hires -> 200 + data array', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/hires')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(Array.isArray(response.body.hires ?? response.body.data)).toBe(true);
  });

  it('GET /api/tasks -> 200 + data array', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/tasks')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(Array.isArray(response.body.tasks ?? response.body.data)).toBe(true);
  });

  it('GET /api/notifications/unread-count -> 200 + count number', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(response.body.count).toEqual(expect.any(Number));
  });

  it('GET /api/analytics/overview -> 200 + KPI object', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(response.body).toEqual(expect.objectContaining({ activeHires: expect.any(Number) }));
  });

  it('GET /api/documents/company -> 200 + data array', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/documents/company')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(Array.isArray(response.body.documents ?? response.body.data)).toBe(true);
  });

  it('GET /api/it-checklists/mine -> 200 + data array', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/it-checklists/mine')
      .set('Authorization', `Bearer ${itToken}`)
      .expect(200);
    expect(Array.isArray(response.body.checklists ?? response.body.data)).toBe(true);
  });

  it('GET /api/manager/dashboard -> 200 + hires array', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/manager/dashboard')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(Array.isArray(response.body.hires)).toBe(true);
  });
});
