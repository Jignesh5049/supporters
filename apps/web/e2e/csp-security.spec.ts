import { test, expect } from '@playwright/test';

test.describe('Content Security Policy & Security Headers', () => {
  test('serves essential security headers on public routes', async ({ request }) => {
    const response = await request.get('/login');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  });

  test('login page loads without CSP violation console errors', async ({ page }) => {
    const cspViolations: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (
        msg.type() === 'error' &&
        (text.includes('Content Security Policy') || text.includes('CSP') || text.includes('violates'))
      ) {
        cspViolations.push(text);
      }
    });

    await page.goto('/login');
    expect(cspViolations).toEqual([]);
  });
});
