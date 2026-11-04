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

/** A real JPEG for upload checks (the API reads the magic bytes): a screenshot of a colour block. */
export async function jpeg(page: Page, color: string): Promise<Buffer> {
  await page.setContent(`<div style="width:480px;height:360px;background:${color}"></div>`);
  return page.screenshot({ type: 'jpeg', clip: { x: 0, y: 0, width: 480, height: 360 } });
}

/** From /onboarding, creates a business page (no logo) and lands on the Hub's products list. */
export async function createBusinessPage(page: Page, businessName: string) {
  await page.goto('/onboarding/business');
  await page.getByLabel('Business name').fill(businessName);
  await page.getByLabel('Business type').selectOption('wholesaler');
  await page.getByLabel('Category', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('State').selectOption({ label: 'Gujarat' });
  await expect(page.getByLabel('City')).toBeEnabled();
  await page.getByLabel('City').selectOption({ label: 'Surat' });
  await page.getByRole('button', { name: 'Create business page' }).click();
  await expect(page).toHaveURL('/business/products');
}
