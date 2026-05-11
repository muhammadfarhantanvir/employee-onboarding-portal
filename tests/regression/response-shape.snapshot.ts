// tests/regression/response-shape.snapshot.ts
import expectedShapes from './golden/critical-shapes.json';
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { loginAs } from '../helpers/auth.helper';
import { sendRequest, shapeOf } from '../helpers/http.helper';

function expectShape(actual: Record<string, unknown>, expected: Record<string, unknown>): void {
  for (const [key, expectedType] of Object.entries(expected)) {
    expect(actual).toHaveProperty(key);
    const actualValue = actual[key];
    if (expectedType === 'object') {
      expect(typeof actualValue === 'object').toBe(true);
    } else {
      expect(actualValue).toBe(expectedType);
    }
  }
}

describe('Critical response golden shapes', () => {
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

  test.each([
    ['health', 'GET', '/api/health', undefined],
    ['me', 'GET', '/api/auth/me', 'hr'],
    ['hires', 'GET', '/api/hires', 'hr'],
    ['tasks', 'GET', '/api/tasks', 'hr'],
    ['notificationsUnread', 'GET', '/api/notifications/unread-count', 'hr'],
    ['analyticsOverview', 'GET', '/api/analytics/overview', 'hr'],
    ['companyDocuments', 'GET', '/api/documents/company', 'hr'],
    ['itMine', 'GET', '/api/it-checklists/mine', 'it'],
    ['managerDashboard', 'GET', '/api/manager/dashboard', 'manager'],
    ['hireReport', 'GET', '/api/analytics/report/hire/hire-0001-0001-0001-000000000001', 'hr'],
  ] as const)('%s matches its golden response family', async (key, method, url, tokenKind) => {
    const token = tokenKind === 'manager' ? managerToken : tokenKind === 'it' ? itToken : tokenKind === 'hr' ? hrToken : undefined;
    const response = await sendRequest(ctx.app, method, url, token);
    expect(response.status).toBeLessThan(500);
    const actualShape = shapeOf(response.body);
    expectShape(actualShape as Record<string, unknown>, expectedShapes[key] as Record<string, unknown>);
  });
});
