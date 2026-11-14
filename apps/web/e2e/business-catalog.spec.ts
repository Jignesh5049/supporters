import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { registerFreshUser } from './helpers';

/**
 * A real JPEG for the upload checks (the API reads the magic bytes): a
 * screenshot of a solid block of colour.
 */
async function jpeg(page: Page, color: string): Promise<Buffer> {
  await page.setContent(`<div style="width:480px;height:360px;background:${color}"></div>`);
  return page.screenshot({ type: 'jpeg', clip: { x: 0, y: 0, width: 480, height: 360 } });
}

test('create a business, add a product with an image, view the public product page', async ({
  browser,
  page,
}) => {
  test.slow();
  const suffix = String(Date.now()).slice(-6);
  const businessName = `E2E Traders ${suffix}`;
  const title = `Cotton poplin ${suffix}`;

  // Images come from a scratch page, so the app page keeps its session state.
  const scratch = await browser.newPage();
  const [logo, photo] = [await jpeg(scratch, '#2e3192'), await jpeg(scratch, '#a3238e')];
  await scratch.close();

  await registerFreshUser(page);

  // Hub pages send an owner without a business to onboarding.
  await page.goto('/business/products');
  await expect(page).toHaveURL('/onboarding/business');

  // Onboarding: categories, states and cities come from the API.
  await page.getByLabel('Business name').fill(businessName);
  await page.getByLabel('Business type').selectOption('wholesaler');
  await page.getByLabel('Category', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('State').selectOption({ label: 'Gujarat' });
  await expect(page.getByLabel('City')).toBeEnabled();
  await page.getByLabel('City').selectOption({ label: 'Surat' });
  await page.getByLabel('About (optional)').fill('Wholesale fabrics from Surat.');
  await page.getByLabel('Contact phone (optional)').fill('98250 14890');
  await page
    .getByRole('group', { name: 'Logo' })
    .locator('input[type=file]')
    .setInputFiles({ name: 'logo.jpg', mimeType: 'image/jpeg', buffer: logo });
  await expect(page.getByRole('img', { name: 'Logo 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Create business page' }).click();

  await expect(page).toHaveURL('/business/products');
  await expect(page.getByText(businessName).first()).toBeVisible();
  await expect(page.getByText('0 of 25 published listings used')).toBeVisible();

  // Add a product: publishing without an image is refused by the API.
  await page.getByRole('link', { name: 'Add product' }).click();
  await expect(page).toHaveURL('/business/products/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByLabel('Description').fill('Soft 100% cotton poplin, 120 GSM.');
  await page.getByLabel('Price (₹)').fill('149.50');
  await page.getByLabel('Unit').selectOption('metre');
  await page.getByLabel('Minimum order quantity (optional)').fill('100');
  await page.getByLabel('Status').selectOption('published');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByText('Add at least one image to publish')).toBeVisible();

  await page
    .getByRole('group', { name: 'Photos' })
    .locator('input[type=file]')
    .setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(page.getByRole('img', { name: 'Photos 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Save product' }).click();

  await expect(page).toHaveURL('/business/products');
  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row).toContainText('₹149.50 / metre');
  await expect(row).toContainText('Published');
  await expect(page.getByText('1 of 25 published listings used')).toBeVisible();

  // The public product page, server-rendered with metadata and JSON-LD.
  await row.getByRole('link', { name: `View ${title} public page` }).click();
  await expect(page).toHaveURL(/\/product\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText('₹149.50').first()).toBeVisible();
  await expect(page).toHaveTitle(`${title} · ${businessName} | Supporters`);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', page.url());

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  );
  expect(jsonLd).toMatchObject({
    '@type': 'Product',
    name: title,
    offers: { '@type': 'Offer', price: '149.50', priceCurrency: 'INR' },
  });

  // The seller card leads to the business page, whose Products tab lists it.
  await page.getByRole('link', { name: 'View business profile' }).click();
  await expect(page).toHaveURL(/\/business\/e2e-traders-\d+/);
  await expect(page.getByRole('heading', { level: 1, name: businessName })).toBeVisible();
  await page.getByRole('tab', { name: /Products \(1\)/ }).click();
  await expect(page.getByRole('tabpanel').getByRole('link', { name: title }).first()).toBeVisible();
});
