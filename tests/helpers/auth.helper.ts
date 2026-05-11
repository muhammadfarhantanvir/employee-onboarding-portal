// tests/helpers/auth.helper.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { TEST_USERS, SeedRole, SEED_IDS } from '../../prisma/seed.test';

export type TestRole = Exclude<SeedRole, 'hr2_admin'>;

export interface LoginContext {
  token: string;
  refreshToken: string;
  userId: string;
  companyId: string;
  role: SeedRole;
}

export async function loginAs(role: SeedRole, app: INestApplication): Promise<LoginContext> {
  const credentials = TEST_USERS[role];
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({
      email: credentials.email,
      password: credentials.password,
      companySlug: credentials.companySlug,
    });

  if (response.status !== 200) {
    throw new Error(`Unable to log in as ${role}: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return {
    token: response.body.accessToken as string,
    refreshToken: response.body.refreshToken as string,
    userId: response.body.user?.id as string,
    companyId: response.body.company?.id ?? SEED_IDS.companies.testGmbh,
    role,
  };
}

export async function authHeader(role: SeedRole, app: INestApplication): Promise<Record<string, string>> {
  const { token } = await loginAs(role, app);
  return { Authorization: `Bearer ${token}` };
}

export async function loginAllRoles(app: INestApplication): Promise<Record<TestRole, LoginContext>> {
  const roles: TestRole[] = ['hr_admin', 'manager', 'it_admin', 'new_hire', 'viewer'];
  const entries = await Promise.all(roles.map(async (role) => [role, await loginAs(role, app)] as const));
  return Object.fromEntries(entries) as Record<TestRole, LoginContext>;
}
