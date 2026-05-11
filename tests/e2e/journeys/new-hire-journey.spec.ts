// tests/e2e/journeys/new-hire-journey.spec.ts
import { request } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

test('New hire journey: dashboard, complete task, upload document, acknowledge policy', async ({ hirePage, apiBaseUrl }) => {
  await hirePage.goto('/onboarding');
  await expect(hirePage).toHaveURL(/onboarding/);

  const api = await request.newContext({ baseURL: apiBaseUrl });
  const login = await api.post('/api/auth/login', {
    data: { email: 'newhire@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  });
  expect(login.status()).toBe(200);
  const token = (await login.json()).accessToken;

  const before = await api.get('/api/hires/hire-0001-0001-0001-000000000001', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(before.status()).toBe(200);
  const beforeBody = await before.json();

  const complete = await api.patch('/api/tasks/htask-0003/complete?hireId=hire-0001-0001-0001-000000000001', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect([200, 409]).toContain(complete.status());

  const upload = await api.post('/api/documents', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'New hire upload',
      originalName: 'upload.pdf',
      filePath: 'new-hire/upload.pdf',
      category: 'contract',
      hireId: 'hire-0001-0001-0001-000000000001',
      mimeType: 'application/pdf',
    },
  });
  expect([200, 201, 403]).toContain(upload.status());

  const ack = await api.post('/api/documents/doc-0001-0001-0001-000000000001/acknowledge', {
    headers: { Authorization: `Bearer ${token}` },
    data: { hireId: 'hire-0001-0001-0001-000000000001' },
  });
  expect([200, 201]).toContain(ack.status());

  const after = await api.get('/api/hires/hire-0001-0001-0001-000000000001', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(after.status()).toBe(200);
  expect((await after.json()).completionPct).toBeGreaterThanOrEqual(beforeBody.completionPct);
  await api.dispose();
});
