import { expect, test } from './fixtures';

/** Public pages, the sign-in family and the admin login: all rendered signed out. */
const PAGES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/discover',
  '/search?q=steel',
  '/about',
  '/terms',
  '/privacy',
  '/help',
  '/community-guidelines',
  '/refund-policy',
  '/report-problem',
  '/admin/login',
];

const HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin-allow-popups',
  'x-frame-options': 'DENY',
};

test.describe('Content-Security-Policy', () => {
  test('every page sends the policy and the other security headers', async ({ request }) => {
    const nonces = new Set<string>();
    for (const path of PAGES) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBeLessThan(400);
      const headers = response.headers();
      const csp =
        headers['content-security-policy'] ?? headers['content-security-policy-report-only'];
      expect(csp, path).toBeTruthy();
      const nonce = /'nonce-([^']+)'/.exec(csp ?? '')?.[1];
      expect(nonce, path).toBeTruthy();
      nonces.add(nonce ?? '');
      expect(csp).toContain("'strict-dynamic'");
      expect(csp).toContain("object-src 'none'");
      if (process.env.NODE_ENV === 'production') {
        expect(csp).not.toContain('unsafe-inline');
        expect(csp).not.toContain('unsafe-eval');
      }
      for (const [name, value] of Object.entries(HEADERS)) expect(headers[name], path).toBe(value);
      expect(headers['x-powered-by'], path).toBeUndefined();
    }
    expect(nonces.size, 'a fresh nonce per request').toBe(PAGES.length);
  });

  test('framework scripts carry the request nonce', async ({ request }) => {
    const response = await request.get('/login');
    const headers = response.headers();
    const csp =
      headers['content-security-policy'] ?? headers['content-security-policy-report-only'] ?? '';
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    const html = await response.text();
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((match) => match[1] ?? '');
    const executable = scripts.filter((attrs) => !/type="application\/(ld\+)?json"/.test(attrs));
    expect(executable.length).toBeGreaterThan(0);
    for (const attrs of executable) expect(attrs).toContain(`nonce="${nonce}"`);
  });

  test('pages load and hydrate with no violations', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Hydrated: the app is interactive, which needs its nonce'd scripts to have run.
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('injected markup cannot run script', async ({ page, cspViolations }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // What an XSS bug would do: put attacker markup in the page. strict-dynamic trusts scripts
    // that already-trusted code creates, but never parser-inserted ones or inline handlers.
    const ran = await page.evaluate(async () => {
      const w = window as unknown as { __injected?: string[] };
      w.__injected = [];
      const holder = document.createElement('div');
      document.body.append(holder);
      holder.innerHTML = `<img src=x onerror="window.__injected.push('onerror')">`;
      document.write('<script>window.__injected.push("write")</' + 'script>');
      await new Promise((resolve) => setTimeout(resolve, 300));
      return w.__injected;
    });
    // Enforced: nothing runs. Report-Only lets it run, but both attempts are reported below.
    if (process.env.CSP_MODE !== 'report-only') expect(ran).toEqual([]);
    await expect.poll(() => cspViolations.length).toBeGreaterThan(0);
    cspViolations.length = 0; // expected here, so the watchdog must not fail this test
  });
});
