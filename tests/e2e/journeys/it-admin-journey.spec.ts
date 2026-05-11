// tests/e2e/journeys/it-admin-journey.spec.ts
import { request } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

test('IT admin journey: open checklist, complete laptop item, verify API status', async ({ itAdminPage, apiBaseUrl }) => {
  await itAdminPage.goto('/it-checklists/mine');
  await expect(itAdminPage).toHaveURL(/it-checklists\/mine/);

  const api = await request.newContext({ baseURL: apiBaseUrl });
  const login = await api.post('/api/auth/login', {
    data: { email: 'it@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  });
  const token = (await login.json()).accessToken;

  const complete = await api.patch('/api/it-checklists/it-cl-0001-0001-0001-000000000001/items/it-ci-0001/complete', {
    headers: { Authorization: `Bearer ${token}` },
    data: { assetTag: 'E2E-LAPTOP' },
  });
  expect([200, 409]).toContain(complete.status());

  const checklist = await api.get('/api/it-checklists/hire/hire-0001-0001-0001-000000000001', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(checklist.status()).toBe(200);
  expect(JSON.stringify(await checklist.json())).toContain('Provision laptop');
  await api.dispose();
});
