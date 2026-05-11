// tests/contract/consumer/tasks.consumer.pact.ts
import request from 'supertest';
import { createTestApp, TestAppContext } from '../../setup/create-test-app';
import { loginAs } from '../../helpers/auth.helper';

describe('Consumer contract: tasks API', () => {
  let ctx: TestAppContext;
  let token: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    token = (await loginAs('hr_admin', ctx.app)).token;
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  it('GET /api/tasks returns task rows with frontend-critical fields', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const rows = response.body.data ?? response.body.tasks;
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) {
      expect(rows[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          status: expect.any(String),
          taskType: expect.any(String),
        }),
      );
    }
  });
});
