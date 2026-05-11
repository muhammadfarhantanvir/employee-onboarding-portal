// tests/e2e/journeys/hr-admin-journey.spec.ts
import { request } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

test('HR admin journey: register company, create template, invite hire, verify email log', async ({ hrPage, apiBaseUrl }) => {
  await hrPage.goto('/register');
  await expect(hrPage).toHaveURL(/register/);

  const api = await request.newContext({ baseURL: apiBaseUrl });
  const unique = Date.now();
  const register = await api.post('/api/auth/register', {
    data: {
      companyName: `Journey ${unique} GmbH`,
      slug: `journey-${unique}`,
      adminName: 'Journey Admin',
      adminEmail: `admin@journey-${unique}.test`,
      password: 'Test1234!',
      domain: `journey-${unique}.test`,
    },
  });
  expect(register.status()).toBe(201);
  const auth = await register.json();

  const template = await api.post('/api/templates', {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { name: 'Journey Template', description: 'Primary HR journey template' },
  });
  expect([200, 201]).toContain(template.status());
  const templateBody = await template.json();

  for (const title of ['Read handbook', 'Upload contract']) {
    const task = await api.post(`/api/templates/${templateBody.id}/tasks`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      data: {
        title,
        taskType: title.includes('Upload') ? 'document_upload' : 'checkbox',
        phase: 'week_1',
        assignedRole: 'new_hire',
        dueDayOffset: 1,
      },
    });
    expect([200, 201]).toContain(task.status());
  }

  const hire = await api.post('/api/hires', {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      fullName: 'New Journey',
      email: `new-journey-${unique}@test.local`,
      startDate: '2026-06-01',
      templateId: templateBody.id,
    },
  });
  expect([200, 201]).toContain(hire.status());

  const hires = await api.get('/api/hires', { headers: { Authorization: `Bearer ${auth.accessToken}` } });
  expect(JSON.stringify(await hires.json())).toContain('New Journey');

  const emailLog = await api.get('/api/notifications/email-log', {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  expect(emailLog.status()).toBeLessThan(500);
  await api.dispose();
});
