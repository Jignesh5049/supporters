import { expect, test } from './fixtures';
import { createBusinessPage, registerFreshUser } from './helpers';

/**
 * Premium checkout against the local stack. The API runs with PAYMENTS_PROVIDER=fake (see
 * apps/api/.env.example), so the page shows its development checkout instead of Razorpay's popup;
 * that "payment" is still confirmed by a signed webhook through the real receiver, and the page
 * still waits for the API to report Premium active.
 */
test('buy Premium, see it confirmed by the webhook, then turn off auto-renew', async ({ page }) => {
  test.slow();
  await registerFreshUser(page);
  await createBusinessPage(page, `Premium Traders ${String(Date.now()).slice(-6)}`);

  await page.goto('/business/premium');
  await expect(page.getByRole('heading', { name: 'You are on the free plan' })).toBeVisible();
  await expect(page.getByText('₹999', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Unlimited published products and services')).toBeVisible();

  // The Razorpay script is on this page and no other: its hosts are in this page's CSP only.
  const csp = (await page.request.get('/business/premium', { maxRedirects: 0 })).headers();
  expect(csp['content-security-policy'] ?? '').toContain('https://checkout.razorpay.com');

  const buy = page.getByRole('button', { name: /Go Premium for ₹999/ });
  await expect(buy).toBeEnabled();
  await buy.click();
  const checkout = page.getByRole('dialog', { name: 'Development checkout' });
  await expect(checkout).toBeVisible();
  await checkout.getByRole('button', { name: /Pay ₹999/ }).click();

  // Never from the callback: the heading changes when GET /v1/me/business/premium says active.
  await expect(page.getByRole('heading', { name: 'Premium is active' })).toBeVisible();
  await expect(page.getByText(/Renews on/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Go Premium/ })).toHaveCount(0);
  // The GST invoice exists as soon as the payment is applied (the PDF follows from the worker).
  await expect(page.getByText(/^SUP\/\d{4}-\d{2}\/\d{6}$/)).toBeVisible();

  // It survives a reload: the status is the API's, not the page's.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Premium is active' })).toBeVisible();

  await page.getByRole('button', { name: 'Turn off auto-renew' }).click();
  await page.getByRole('button', { name: 'Yes, turn off auto-renew' }).click();
  await expect(
    page.getByRole('heading', { name: 'Premium is on, and will not renew' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn off auto-renew' })).toHaveCount(0);

  // The old route lands here.
  await page.goto('/subscription');
  await expect(page).toHaveURL('/business/premium');
});

test('Razorpay is allowed on the Premium page only', async ({ request }) => {
  for (const path of ['/login', '/discover', '/about']) {
    const headers = (await request.get(path, { maxRedirects: 0 })).headers();
    const csp =
      headers['content-security-policy'] ?? headers['content-security-policy-report-only'];
    expect(csp, path).not.toContain('razorpay');
  }
});
