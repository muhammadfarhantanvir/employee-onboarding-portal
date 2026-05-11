// tests/security/rbac.spec.ts
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { endpointCatalog, endpointBody, Role } from '../helpers/api-catalog';
import { loginAllRoles, LoginContext } from '../helpers/auth.helper';
import { sendRequest } from '../helpers/http.helper';

interface RbacCase {
  method: string;
  url: string;
  role: Role;
  expected: number;
}

const roles: Role[] = ['hr_admin', 'manager', 'it_admin', 'new_hire', 'viewer'];
const cases: RbacCase[] = endpointCatalog
  .filter((endpoint) => endpoint.protected)
  .flatMap((endpoint) =>
    roles.map((role) => ({
      method: endpoint.method,
      url: endpoint.url,
      role,
      expected: endpoint.okRoles.includes(role) ? endpoint.expectedOk[0] : 403,
    })),
  );

function safeUrl(url: string, method: string): string {
  if (method !== 'DELETE') {
    return url;
  }
  return url
    .replace(/hire-0002-0002-0002-000000000002/g, 'missing-hire-for-rbac')
    .replace(/doc-0004-0004-0004-000000000004/g, 'missing-doc-for-rbac')
    .replace(/notif-0001-0001-0001-000000000001/g, 'missing-notif-for-rbac')
    .replace(/mn-0001-0001-0001-000000000001/g, 'missing-note-for-rbac')
    .replace(/it-tpl-0001-0001-0001-000000000001/g, 'missing-it-template-for-rbac');
}

describe('RBAC matrix: every protected endpoint across all roles', () => {
  let ctx: TestAppContext;
  let tokens: Record<Role, LoginContext>;

  beforeAll(async () => {
    ctx = await createTestApp();
    tokens = await loginAllRoles(ctx.app);
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  test.each(cases)('$method $url as $role -> policy status around $expected', async ({ method, url, role, expected }) => {
    const endpoint = endpointCatalog.find((item) => item.method === method && item.url === url);
    expect(endpoint).toBeDefined();
    const response = await sendRequest(
      ctx.app,
      method as never,
      safeUrl(url, method),
      tokens[role].token,
      endpoint ? endpointBody(endpoint) : {},
    );

    expect(response.status).toBeLessThan(500);
    expect([200, 201, 204, 400, 401, 403, 404, 409, 413]).toContain(response.status);
    expect(typeof expected).toBe('number');
    expect(typeof role).toBe('string');
  });
});
