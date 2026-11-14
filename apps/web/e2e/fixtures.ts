import { expect, test as base } from '@playwright/test';

/**
 * `test` with a CSP watchdog: every page in every test fails the test if the browser reports a
 * Content-Security-Policy violation, whether the policy is enforced (console "Refused to ...")
 * or Report-Only (a `securitypolicyviolation` event, a POST to the report sink).
 */
/**
 * Known and accepted: the home, discover and about pages still render `lib/mock-data`, whose avatars
 * are Unsplash URLs. The CSP rightly blocks them (only the media CDN is allowed); they go away when
 * those pages read real data. Anything else is a failure.
 */
const KNOWN_MOCK_IMAGES = 'images.unsplash.com';

export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ context }, use) => {
      const violations: string[] = [];
      await context.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          if (event.blockedURI.includes('images.unsplash.com')) return;
          const w = window as unknown as { __csp?: string[] };
          (w.__csp ??= []).push(
            `${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} (${event.sourceFile}:${event.lineNumber})`,
          );
          // Pages navigate away; surface it through the console too so it is not lost.
          console.error(
            `CSP violation: ${event.effectiveDirective} ${event.blockedURI} [${event.sourceFile}:${event.lineNumber}] ${event.sample.slice(0, 100)}`,
          );
        });
      });
      const watch = (page: import('@playwright/test').Page) => {
        page.on('console', (message) => {
          const text = message.text();
          if (text.includes(KNOWN_MOCK_IMAGES)) return;
          if (
            /Content Security Policy|CSP violation|Refused to (apply|load|execute|connect)/i.test(
              text,
            )
          ) {
            violations.push(`${page.url()}: ${text.slice(0, 300)}`);
          }
        });
      };
      for (const page of context.pages()) watch(page);
      context.on('page', watch);
      await use(violations);
      expect(violations, 'CSP violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
