// tests/security/auth-boundary.spec.ts
import jwt from 'jsonwebtoken';
import { createTestApp, TestAppContext } from '../setup/create-test-app';
import { protectedEndpoints, endpointBody } from '../helpers/api-catalog';
import { sendRequest } from '../helpers/http.helper';
import { SEED_IDS } from '../../prisma/seed.test';

describe('Authentication boundary', () => {
  let ctx: TestAppContext;
  let expiredJwt: string;
  let wrongSecretJwt: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    expiredJwt = jwt.sign(
      {
        sub: SEED_IDS.users.hrAdmin,
        company_id: SEED_IDS.companies.testGmbh,
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      process.env.JWT_SECRET ?? 'super-secret-at-least-32-chars-long',
    );
    wrongSecretJwt = jwt.sign(
      {
        sub: SEED_IDS.users.hrAdmin,
        company_id: SEED_IDS.companies.testGmbh,
      },
      'wrong-secret',
    );
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  test.each(protectedEndpoints)('$method $url has a closed auth boundary', async (endpoint) => {
    const noToken = await sendRequest(ctx.app, endpoint.method, endpoint.url, undefined, endpointBody(endpoint));
    expect([401, 404]).toContain(noToken.status);

    const malformed = await sendRequest(ctx.app, endpoint.method, endpoint.url, 'invalid_random_string', endpointBody(endpoint));
    expect([401, 404]).toContain(malformed.status);

    const expired = await sendRequest(ctx.app, endpoint.method, endpoint.url, expiredJwt, endpointBody(endpoint));
    expect([401, 404]).toContain(expired.status);

    const wrongSecret = await sendRequest(ctx.app, endpoint.method, endpoint.url, wrongSecretJwt, endpointBody(endpoint));
    expect([401, 404]).toContain(wrongSecret.status);
  });
});
