// tests/e2e/journeys/manager-journey.spec.ts
import { request } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

test('Manager journey: dashboard, hire detail, private note, phase approval visibility', async ({ managerPage, apiBaseUrl }) => {
  await managerPage.goto('/manager/dashboard');
  await expect(managerPage).toHaveURL(/manager\/dashboard/);

  const api = await request.newContext({ baseURL: apiBaseUrl });
  const login = await api.post('/api/auth/login', {
    data: { email: 'manager@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  });
  const token = (await login.json()).accessToken;

  const dashboard = await api.get('/api/manager/dashboard', { headers: { Authorization: `Bearer ${token}` } });
  expect(dashboard.status()).toBe(200);

  const note = await api.post('/api/manager/hires/hire-0001-0001-0001-000000000001/notes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { body: 'E2E private manager note' },
  });
  expect([200, 201]).toContain(note.status());

  const approval = await api.post('/api/manager/hires/hire-0001-0001-0001-000000000001/approve-phase', {
    headers: { Authorization: `Bearer ${token}` },
    data: { phase: 'pre_boarding', note: 'Already approved or ready' },
  });
  expect([200, 201, 409]).toContain(approval.status());

  const phases = await api.get('/api/manager/hires/hire-0001-0001-0001-000000000001/phases', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(phases.status()).toBe(200);
  expect(JSON.stringify(await phases.json())).toContain('pre_boarding');
  await api.dispose();
});
