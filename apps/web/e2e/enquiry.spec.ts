import { expect, test } from '@playwright/test';
import { createBusinessPage, jpeg, registerFreshUser } from './helpers';

test('a buyer sends an enquiry; the owner sees it live, replies, and the buyer sees the reply', async ({
  browser,
  page: owner,
}) => {
  test.slow();
  const suffix = String(Date.now()).slice(-6);
  const businessName = `E2E Enquiry Mills ${suffix}`;
  const title = `Poplin cotton ${suffix}`;
  const request = `Need 200 metres of ${title} delivered to Pune, with GST invoice.`;

  const scratch = await browser.newPage();
  const photo = await jpeg(scratch, '#a3238e');
  await scratch.close();

  // Owner: business with one published product, then waits on the live enquiry inbox.
  await registerFreshUser(owner, 'Owner Seller');
  await createBusinessPage(owner, businessName);
  await owner.goto('/business/products/new');
  await owner.getByLabel('Title').fill(title);
  await owner.getByLabel('Category').selectOption({ index: 1 });
  await owner.getByLabel('Description').fill('Soft cotton poplin, 120 GSM.');
  await owner.getByLabel('Price (₹)').fill('150');
  await owner.getByLabel('Unit').selectOption('metre');
  await owner.getByLabel('Status').selectOption('published');
  await owner
    .getByRole('group', { name: 'Photos' })
    .locator('input[type=file]')
    .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(owner.getByRole('img', { name: 'Photos 1' })).toBeVisible();
  await owner.getByRole('button', { name: 'Save product' }).click();
  await expect(owner).toHaveURL('/business/products');
  await owner
    .getByRole('row', { name: new RegExp(title) })
    .getByRole('link', { name: /public page/ })
    .click();
  await expect(owner).toHaveURL(/\/product\/[0-9a-f-]{36}$/);
  const productUrl = owner.url();
  await owner.goto('/business/enquiries');
  await expect(owner.getByText('No enquiries yet.')).toBeVisible();

  // Buyer: Contact supplier on the product page, with the shared-phone consent.
  const buyerContext = await browser.newContext();
  const buyer = await buyerContext.newPage();
  await registerFreshUser(buyer, 'Buyer Asker');
  await buyer.goto(productUrl);
  await buyer.getByRole('button', { name: 'Contact supplier' }).click();
  const dialog = buyer.getByRole('dialog');
  await expect(dialog.getByLabel('Product or service')).toHaveValue(title);

  await dialog.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(dialog.getByText('Write between 20 and 1,000 characters.')).toBeVisible();

  await dialog.getByLabel('Quantity').fill('200');
  await dialog.getByLabel('Unit').selectOption('metre');
  await dialog.getByLabel('Delivery state').selectOption({ label: 'Maharashtra' });
  await expect(dialog.getByLabel('Delivery city')).toBeEnabled();
  await dialog.getByLabel('Delivery city').selectOption({ label: 'Pune' });
  await dialog.getByLabel('Message').fill(request);
  await dialog.getByLabel(/Share my verified phone number/).click();
  await dialog.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(dialog.getByText('Enquiry sent')).toBeVisible();

  // Owner: the enquiry appears without a reload, New, with the shared phone.
  const card = owner.getByRole('article', { name: 'Enquiry from Buyer Asker' });
  await expect(card).toBeVisible();
  await expect(card).toContainText(request);
  await expect(card).toContainText('New');
  await expect(card).toContainText('Qty 200 metre');
  await expect(card.getByRole('link', { name: /^\+?91?\d/ })).toBeVisible();

  // Owner replies from the enquiry: it opens the thread, where the card is highlighted.
  await card.getByRole('link', { name: 'Reply' }).click();
  await expect(owner).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
  await expect(owner.getByRole('log').getByText(request)).toBeVisible();
  await expect(owner.getByRole('log').getByText('Enquiry', { exact: true })).toBeVisible();
  const box = owner.getByRole('textbox', { name: 'Message to Buyer Asker' });
  await box.fill('Yes, 200 metres is available at ₹140 a metre.');
  await box.press('Enter');

  // Buyer: sees the reply live in the chat.
  await dialog.getByRole('link', { name: 'Open the chat' }).click();
  await expect(buyer).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
  await expect(buyer.getByRole('log').getByText('200 metres is available')).toBeVisible();

  // The first reply moved the enquiry to Responded on both lists.
  await buyer.goto('/enquiries');
  await expect(buyer.getByRole('article').filter({ hasText: request })).toContainText('Responded');
  await owner.goto('/business/enquiries');
  await owner.getByRole('button', { name: 'Responded' }).click();
  const responded = owner.getByRole('article', { name: 'Enquiry from Buyer Asker' });
  await expect(responded).toBeVisible();

  // Owner closes it; it moves to Closed.
  await responded.getByRole('button', { name: 'Close' }).click();
  await owner.getByRole('alertdialog').getByRole('button', { name: 'Close enquiry' }).click();
  await expect(responded).toHaveCount(0);
  await owner.getByRole('button', { name: 'Closed' }).click();
  await expect(owner.getByRole('article', { name: 'Enquiry from Buyer Asker' })).toContainText(
    'Closed',
  );

  // A second enquiry about the same listing within 24 hours is refused, with the limit shown.
  await buyer.goto(productUrl);
  await buyer.getByRole('button', { name: 'Contact supplier' }).click();
  const again = buyer.getByRole('dialog');
  await again.getByLabel('Message').fill(request);
  await again.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(
    again.getByRole('alert').filter({ hasText: 'one enquiry per listing' }),
  ).toBeVisible();

  await buyerContext.close();
});
