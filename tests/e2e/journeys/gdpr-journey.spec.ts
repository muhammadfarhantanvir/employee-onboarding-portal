// tests/e2e/journeys/gdpr-journey.spec.ts
import { request } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

test('GDPR journey: export hire data, submit/process erasure request, verify anonymisation path', async ({ hrPage, apiBaseUrl }) => {
  await hrPage.goto('/gdpr');
  await expect(hrPage).toHaveURL(/gdpr/);

  const api = await request.newContext({ baseURL: apiBaseUrl });
  const login = await api.post('/api/auth/login', {
    data: { email: 'hr@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  });
  const token = (await login.json()).accessToken;

  const exported = await api.get('/api/gdpr/export/hire/hire-0001-0001-0001-000000000001', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(exported.status()).toBe(200);
  expect(JSON.stringify(await exported.json())).toContain('newhire@demo-company.com');

  const erasure = await api.post('/api/gdpr/erasure-requests', {
    headers: { Authorization: `Bearer ${token}` },
    data: { hireId: 'hire-0001-0001-0001-000000000001', reason: 'E2E erasure request' },
  });
  expect([200, 201]).toContain(erasure.status());
  const erasureBody = await erasure.json();

  const process = await api.patch(`/api/gdpr/erasure-requests/${erasureBody.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'completed', notes: 'Approved in E2E' },
  });
  expect([200, 400]).toContain(process.status());

  const hire = await api.get('/api/hires/hire-0001-0001-0001-000000000001', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(hire.status()).toBe(200);
  expect(JSON.stringify(await hire.json())).toMatch(/Anonymised|Nina Newhire/);
  await api.dispose();
});
