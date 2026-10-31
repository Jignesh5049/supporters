import { expect, test } from '@playwright/test';
import { readOtp } from './helpers';

test('register, verify the OTP, then signed in', async ({ page, context }) => {
  const phone = `98${String(Date.now()).slice(-8)}`;
  const password = `e2e-${crypto.randomUUID()}`;

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Playwright Tester');
  await page.getByLabel('Mobile number').fill(phone);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create Supporters Account' }).click();

  await expect(page).toHaveURL('/verify');
  await page.getByLabel('Confirmation code').fill(await readOtp(phone.slice(-4)));
  await page.getByRole('button', { name: 'Confirm & Proceed' }).click();

  // Onboarding renders only after the DAL's GET /v1/me succeeds.
  await expect(page).toHaveURL('/onboarding');
  await expect(page.getByRole('button', { name: 'User profile menu' })).toContainText('PT');

  const cookies = await context.cookies();
  const access = cookies.find((cookie) => cookie.name === '__Host-at');
  expect(access).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
  expect(cookies.find((cookie) => cookie.name === '__Host-csrf')?.httpOnly).toBe(false);

  // A signed-in route stays reachable on a full page load.
  await page.goto('/settings');
  await expect(page).toHaveURL('/settings');
});
