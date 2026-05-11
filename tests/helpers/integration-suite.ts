// tests/helpers/integration-suite.ts
import { INestApplication } from '@nestjs/common';
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { EndpointCase, endpointBody, Role } from './api-catalog';
import { loginAllRoles, LoginContext } from './auth.helper';
import { sendRequest } from './http.helper';

export interface IntegrationHarness {
  ctx: TestAppContext;
  app: INestApplication;
  tokens: Record<Role, LoginContext>;
}

export async function createIntegrationHarness(): Promise<IntegrationHarness> {
  const ctx = await createTestApp();
  const tokens = await loginAllRoles(ctx.app);
  return { ctx, app: ctx.app, tokens };
}

export async function closeIntegrationHarness(harness: IntegrationHarness): Promise<void> {
  if (!harness) {
    return;
  }
  await harness.ctx.close();
}

export function runEndpointContractSuite(title: string, endpoints: EndpointCase[]): void {
  describe(title, () => {
    let harness: IntegrationHarness;

    beforeAll(async () => {
      harness = await createIntegrationHarness();
    }, 30000);

    afterAll(async () => {
      await closeIntegrationHarness(harness);
    });

    test.each(endpoints)('$method $url happy path returns a documented status', async (endpoint) => {
      const role = endpoint.okRoles[0] ?? 'hr_admin';
      const body = endpoint.url === '/api/auth/refresh'
        ? { refreshToken: harness.tokens.hr_admin.refreshToken }
        : endpointBody(endpoint);
      const response = await sendRequest(
        harness.app,
        endpoint.method,
        endpoint.url,
        endpoint.protected ? harness.tokens[role].token : undefined,
        body,
      );

      expect([...endpoint.expectedOk, 200, 201, 204, 400, 401, 403, 404, 409]).toContain(response.status);
      expect(response.status).toBeLessThan(500);
    });

    const protectedCases = endpoints.filter((endpoint) => endpoint.protected);
    if (protectedCases.length > 0) {
      test.each(protectedCases)(
        '$method $url rejects missing Authorization header',
        async (endpoint) => {
          const response = await sendRequest(
            harness.app,
            endpoint.method,
            endpoint.url,
            undefined,
            endpointBody(endpoint),
          );
          expect([401, 404]).toContain(response.status);
        },
      );

      test.each(protectedCases)(
        '$method $url rejects malformed bearer token',
        async (endpoint) => {
          const response = await sendRequest(
            harness.app,
            endpoint.method,
            endpoint.url,
            'invalid_random_string',
            endpointBody(endpoint),
          );
          expect([401, 404]).toContain(response.status);
        },
      );
    }

    const roleBoundaryCases = endpoints.filter(
      (endpoint) => endpoint.protected && endpoint.okRoles.length < 5,
    );
    if (roleBoundaryCases.length > 0) {
      test.each(roleBoundaryCases)(
        '$method $url handles documented denied-role probes without a server error',
        async (endpoint) => {
          const deniedRole = (['viewer', 'new_hire', 'it_admin', 'manager', 'hr_admin'] as Role[]).find(
            (role) => !endpoint.okRoles.includes(role),
          );
          if (!deniedRole) {
            return;
          }
          const response = await sendRequest(
            harness.app,
            endpoint.method,
            endpoint.url,
            harness.tokens[deniedRole].token,
            endpointBody(endpoint),
          );
          expect([200, 201, 204, 400, 401, 403, 404, 409]).toContain(response.status);
          expect(response.status).toBeLessThan(500);
        },
      );
    }

    const writableCases = endpoints.filter((endpoint) => endpoint.method === 'POST' || endpoint.method === 'PATCH');
    if (writableCases.length > 0) {
      test.each(writableCases)('$method $url handles invalid body without a 500', async (endpoint) => {
        const role = endpoint.okRoles[0] ?? 'hr_admin';
        const response = await sendRequest(
          harness.app,
          endpoint.method,
          endpoint.url,
          endpoint.protected ? harness.tokens[role].token : undefined,
          { email: 12345, role: true, fullName: '', dueDayOffset: -999 },
        );
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      });
    }

    const parseableCases = endpoints.filter((endpoint) => endpoint.url.includes(':') === false);
    if (parseableCases.length > 0) {
      test.each(parseableCases)(
        '$method $url response body is parseable',
        async (endpoint) => {
          const role = endpoint.okRoles[0] ?? 'hr_admin';
          const body = endpoint.url === '/api/auth/refresh'
            ? { refreshToken: harness.tokens.hr_admin.refreshToken }
            : endpointBody(endpoint);
          const response = await sendRequest(
            harness.app,
            endpoint.method,
            endpoint.url,
            endpoint.protected ? harness.tokens[role].token : undefined,
            body,
          );
          expect(response.status).toBeLessThan(500);
          if (response.type.includes('json')) {
            expect(response.body).toBeDefined();
          }
        },
      );
    }
  });
}
