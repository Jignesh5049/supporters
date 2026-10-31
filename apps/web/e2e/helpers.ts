import { readFile } from 'node:fs/promises';
import { type Page, expect } from '@playwright/test';
import { API_LOG } from '../playwright.config';

/** Polls the API log for the OTP sent to a number ending in `lastFour`. */
export async function readOtp(lastFour: string): Promise<string> {
  const pattern = new RegExp(String.raw`\[dev sms\] OTP for \+91\*+${lastFour}: (\d{6})`, 'g');
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const matches = [...(await readFile(API_LOG, 'utf8')).matchAll(pattern)];
    const code = matches.at(-1)?.[1];
    if (code) return code;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('No OTP in the API log');
}

/** Registers a fresh account through the UI and lands on /onboarding, signed in. */
export async function registerFreshUser(page: Page, name = 'Playwright Tester') {
  const phone = `98${String(Date.now()).slice(-8)}`;
  const password = `e2e-${crypto.randomUUID()}`;

  await page.goto('/register');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Mobile number').fill(phone);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create Supporters Account' }).click();

  await expect(page).toHaveURL('/verify');
  await page.getByLabel('Confirmation code').fill(await readOtp(phone.slice(-4)));
  await page.getByRole('button', { name: 'Confirm & Proceed' }).click();
  await expect(page).toHaveURL('/onboarding');
  return { phone };
}
