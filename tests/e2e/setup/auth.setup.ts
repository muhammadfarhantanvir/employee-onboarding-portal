// tests/e2e/setup/auth.setup.ts
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { test, request } from '@playwright/test';

const roles = [
  ['hr_admin', 'hr@demo-company.com'],
  ['manager', 'manager@demo-company.com'],
  ['new_hire', 'newhire@demo-company.com'],
  ['it_admin', 'it@demo-company.com'],
] as const;

test('saves storageState per role to e2e/.auth', async ({ baseURL }) => {
  const api = await request.newContext({ baseURL: process.env.API_BASE_URL ?? 'http://localhost:3001' });
  const authDir = path.resolve(__dirname, '../.auth');
  await mkdir(authDir, { recursive: true });

  for (const [role, email] of roles) {
    const login = await api.post('/api/auth/login', {
      data: { email, password: 'Demo1234!', companySlug: 'demo-company' },
    });
    if (!login.ok()) {
      throw new Error(`Unable to create e2e auth state for ${role}: ${login.status()}`);
    }
    const body = await login.json();
    const session = {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      companySlug: body.company.slug,
      userId: body.user.id,
      userEmail: body.user.email,
      userFullName: body.user.fullName,
      userRole: body.user.role,
    };
    const state = {
      cookies: [],
      origins: [
        {
          origin: baseURL ?? 'http://localhost:3000',
          localStorage: [
            { name: 'onboarding_session', value: JSON.stringify(session) },
            { name: 'accessToken', value: body.accessToken },
            { name: 'refreshToken', value: body.refreshToken },
            { name: 'userRole', value: role },
          ],
        },
      ],
    };
    await writeFile(path.join(authDir, `${role}.json`), JSON.stringify(state, null, 2));
  }

  await api.dispose();
});
