// tests/regression/api-schema.snapshot.ts
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { endpointCatalog } from '../helpers/api-catalog';
import { loginAs } from '../helpers/auth.helper';
import { sendRequest, shapeOf } from '../helpers/http.helper';

describe('API schema snapshots', () => {
  let ctx: TestAppContext;
  let token: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    token = (await loginAs('hr_admin', ctx.app)).token;
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  test.each(endpointCatalog.filter((endpoint) => endpoint.method === 'GET'))(
    '$method $url response shape is stable',
    async (endpoint) => {
      const response = await sendRequest(
        ctx.app,
        endpoint.method,
        endpoint.url,
        endpoint.protected ? token : undefined,
      );
      expect(response.status).toBeLessThan(500);
      if (response.type.includes('json')) {
        expect(shapeOf(response.body)).toMatchSnapshot(endpoint.name);
      }
    },
  );
});
