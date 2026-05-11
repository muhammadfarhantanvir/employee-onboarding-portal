// tests/e2e/fixtures/auth.fixture.ts
import { test as base, expect, Page, request } from '@playwright/test';

type RolePage = Page;

interface AuthFixtures {
  hrPage: RolePage;
  managerPage: RolePage;
  hirePage: RolePage;
  itPage: RolePage;
  itAdminPage: RolePage;
  apiBaseUrl: string;
}

interface BrowserSession {
  accessToken: string;
  refreshToken: string;
  companySlug: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  userRole: string;
}

async function loginViaApi(role: string, email: string): Promise<BrowserSession> {
  const api = await request.newContext({ baseURL: process.env.API_BASE_URL ?? 'http://localhost:3001' });
  const response = await api.post('/api/auth/login', {
    data: { email, password: 'Demo1234!', companySlug: 'demo-company' },
  });
  if (!response.ok()) {
    throw new Error(`API login failed for ${role}: ${response.status()}`);
  }
  const body = await response.json();
  await api.dispose();
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    companySlug: body.company.slug,
    userId: body.user.id,
    userEmail: body.user.email,
    userFullName: body.user.fullName,
    userRole: body.user.role,
  };
}

async function rolePage(page: Page, role: string, email: string): Promise<Page> {
  const session = await loginViaApi(role, email);
  await page.addInitScript(
    ({ browserSession, userRole }: { browserSession: BrowserSession; userRole: string }) => {
      window.localStorage.setItem('onboarding_session', JSON.stringify(browserSession));
      window.localStorage.setItem('accessToken', browserSession.accessToken);
      window.localStorage.setItem('userRole', userRole);
    },
    { browserSession: session, userRole: role },
  );
  return page;
}

export const test = base.extend<AuthFixtures>({
  apiBaseUrl: async ({}, use) => {
    await use(process.env.API_BASE_URL ?? 'http://localhost:3001');
  },
  hrPage: async ({ page }, use) => {
    await use(await rolePage(page, 'hr_admin', 'hr@demo-company.com'));
  },
  managerPage: async ({ page }, use) => {
    await use(await rolePage(page, 'manager', 'manager@demo-company.com'));
  },
  hirePage: async ({ page }, use) => {
    await use(await rolePage(page, 'new_hire', 'newhire@demo-company.com'));
  },
  itPage: async ({ page }, use) => {
    await use(await rolePage(page, 'it_admin', 'it@demo-company.com'));
  },
  itAdminPage: async ({ page }, use) => {
    await use(await rolePage(page, 'it_admin', 'it@demo-company.com'));
  },
});

export { expect };
