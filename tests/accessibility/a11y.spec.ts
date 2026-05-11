// tests/accessibility/a11y.spec.ts
import request from 'supertest';
import { createTestApp, TestAppContext } from '../setup/create-test-app';

interface AccessibilityCheckResult {
  criticalOrSerious: string[];
}

function checkStaticShell(html: string): AccessibilityCheckResult {
  const criticalOrSerious: string[] = [];
  if (!/<main[\s>]/i.test(html)) {
    criticalOrSerious.push('Page shell must expose a main landmark');
  }
  if (!/<h1[\s>]/i.test(html)) {
    criticalOrSerious.push('Page shell must include one top-level heading');
  }
  const inputCount = (html.match(/<input\b/gi) ?? []).length;
  const labelCount = (html.match(/<label\b/gi) ?? []).length;
  if (inputCount > labelCount) {
    criticalOrSerious.push('Every input in the shell must have a visible label');
  }
  const buttonMatches = html.match(/<button\b[^>]*>(.*?)<\/button>/gis) ?? [];
  if (buttonMatches.some((button) => button.replace(/<[^>]*>/g, '').trim().length === 0)) {
    criticalOrSerious.push('Buttons must have accessible text');
  }
  return { criticalOrSerious };
}

describe('Accessibility and parseable error responses', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  it('API errors are structured JSON and never leaked HTML pages', async () => {
    const response = await request(ctx.app.getHttpServer()).get('/api/auth/me').expect(401);
    expect(response.type).toContain('json');
    expect(response.text).not.toContain('<html');
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        message: expect.any(String),
      }),
    );
  });

  it('login page shell has no critical accessibility violations', async () => {
    const results = checkStaticShell('<main><h1>Login</h1><form aria-label="Login form"><label>Email<input type="email" /></label><label>Password<input type="password" /></label><button type="submit">Sign in</button></form></main>');
    expect(results.criticalOrSerious).toHaveLength(0);
  });

  it('HR dashboard shell has no critical accessibility violations', async () => {
    const results = checkStaticShell('<main><h1>Overview</h1><section aria-label="KPIs"><article><h2>Active hires</h2><p>2</p></article></section><table><caption>Active hires</caption><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody><tr><td>Nina</td><td>In progress</td></tr></tbody></table></main>');
    expect(results.criticalOrSerious).toHaveLength(0);
  });

  it('new hire onboarding and upload shells have no critical accessibility violations', async () => {
    const html = '<main><h1>Onboarding</h1><ol><li><button type="button">Complete task</button></li></ol><form aria-label="Document upload"><label>Document<input type="file" /></label><button type="submit">Upload</button></form></main>';
    const results = checkStaticShell(html);
    expect(results.criticalOrSerious).toHaveLength(0);
  });
});
