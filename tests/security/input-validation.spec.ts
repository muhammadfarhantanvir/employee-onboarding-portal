// tests/security/input-validation.spec.ts
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { postAndPatchEndpoints } from '../helpers/api-catalog';
import { loginAs } from '../helpers/auth.helper';
import { sendRequest } from '../helpers/http.helper';

const maliciousInputs: Array<Record<string, unknown>> = [
  { fullName: "'; DROP TABLE hires; --", email: "'; DROP TABLE users; --" },
  { fullName: "<script>alert('xss')</script>", title: "<script>alert('xss')</script>" },
  { fullName: "test\u0000name", title: "test\u0000name" },
  { fullName: "test\u202Ename", title: "test\u202Ename" },
  { fullName: 'a'.repeat(100000), title: 'a'.repeat(100000) },
  { dueDayOffset: -999, fileSize: -999 },
  { email: 12345, role: true },
  { fullName: '', title: '', name: '' },
];

describe('Input validation security', () => {
  let ctx: TestAppContext;
  let token: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    token = (await loginAs('hr_admin', ctx.app)).token;
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  test.each(postAndPatchEndpoints)('$method $url rejects malicious payloads without 500 responses', async (endpoint) => {
    for (const payload of maliciousInputs) {
      const response = await sendRequest(
        ctx.app,
        endpoint.method,
        endpoint.url,
        endpoint.protected ? token : undefined,
        payload,
      );
      expect(response.status).toBeLessThan(500);
      expect([200, 201, 204, 400, 401, 403, 404, 409, 413]).toContain(response.status);
    }
  });
});
