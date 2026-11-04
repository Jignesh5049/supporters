import { expect, test } from '@playwright/test';
import { createBusinessPage, jpeg, registerFreshUser } from './helpers';

test('a buyer messages a business; both see each other live, with read ticks and typing', async ({
  browser,
  page: owner,
}) => {
  test.slow();
  const suffix = String(Date.now()).slice(-6);
  const businessName = `E2E Chat Traders ${suffix}`;

  const scratch = await browser.newPage();
  const photo = await jpeg(scratch, '#2e3192');
  await scratch.close();

  // Owner: a business page, then the (empty) inbox, connected live.
  await registerFreshUser(owner, 'Owner Chatter');
  await createBusinessPage(owner, businessName);
  await owner.getByRole('link', { name: 'View public page' }).click();
  await expect(owner).toHaveURL(/\/business\/e2e-chat-traders-\d+/);
  const businessUrl = owner.url();
  await owner.goto('/messages');
  await expect(owner.getByText('No conversations yet.', { exact: false })).toBeVisible();

  // Buyer: "Message" on the business page opens the thread.
  const buyerContext = await browser.newContext();
  const buyer = await buyerContext.newPage();
  await registerFreshUser(buyer, 'Buyer Chatter');
  await buyer.goto(businessUrl);
  await buyer.getByRole('button', { name: 'Message', exact: true }).click();
  await expect(buyer).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
  await expect(buyer.getByRole('heading', { name: businessName })).toBeVisible();

  const buyerBox = buyer.getByRole('textbox', { name: `Message to ${businessName}` });
  await buyerBox.fill('Namaste, do you ship to Pune?');
  await buyerBox.press('Enter');
  const buyerLog = buyer.getByRole('log');
  await expect(buyerLog.getByRole('article').filter({ hasText: 'ship to Pune' })).toBeVisible();
  await expect(buyerLog.getByRole('img', { name: 'Sent' })).toBeVisible();

  // Owner: the thread arrives live with an unread badge, without a reload.
  const row = owner.getByRole('link', { name: /Buyer Chatter/ });
  await expect(row).toBeVisible();
  await expect(row.getByLabel('1 unread')).toBeVisible();
  await row.click();
  const ownerLog = owner.getByRole('log');
  await expect(ownerLog.getByText('Namaste, do you ship to Pune?')).toBeVisible();
  await expect(row.getByLabel('1 unread')).toHaveCount(0);

  // The buyer's tick turns to read once the owner opened it.
  await expect(buyerLog.getByRole('img', { name: 'Read' })).toBeVisible();

  // Typing shows on the other end.
  const ownerBox = owner.getByRole('textbox', { name: 'Message to Buyer Chatter' });
  await ownerBox.pressSequentially('Yes, we');
  await expect(buyer.getByText(`${businessName} is typing…`)).toBeVisible();

  await ownerBox.fill('Yes, we ship across India. See https://example.com/rates.');
  await ownerBox.press('Enter');
  await expect(buyerLog.getByText('Yes, we ship across India.')).toBeVisible();
  await expect(buyerLog.getByRole('link', { name: 'https://example.com/rates' })).toHaveAttribute(
    'rel',
    'noopener noreferrer nofollow ugc',
  );

  // A photo goes through presign (purpose chat) and opens only through the attachment route.
  await buyer.locator('input[type=file]').setInputFiles({
    name: 'sample.jpg',
    mimeType: 'image/jpeg',
    buffer: photo,
  });
  await expect(buyer.getByText('1 photo')).toBeVisible();
  await buyer.getByRole('button', { name: 'Send' }).click();
  const ownerPhoto = ownerLog.getByRole('img', { name: 'Photo 1 of 1' });
  await expect(ownerPhoto).toBeVisible();
  await expect(ownerPhoto).toHaveAttribute('src', /^\/v1\/attachments\/[0-9a-f-]{36}$/);

  // Delete for me: gone for the buyer, still there for the owner.
  const first = buyerLog.getByRole('article').filter({ hasText: 'ship to Pune' });
  await first.hover();
  await first.getByRole('button', { name: 'Delete for me' }).click();
  await buyer.getByRole('alertdialog').getByRole('button', { name: 'Delete for me' }).click();
  await expect(first).toHaveCount(0);
  await buyer.reload();
  await expect(buyer.getByRole('log').getByText('Yes, we ship across India.')).toBeVisible();
  await expect(buyer.getByRole('log').getByText('ship to Pune')).toHaveCount(0);
  await expect(ownerLog.getByText('Namaste, do you ship to Pune?')).toBeVisible();

  // Mute, then hide: the thread leaves the buyer's inbox and shows under Hidden.
  await buyer.getByRole('button', { name: 'Mute' }).click();
  await expect(buyer.getByRole('button', { name: 'Unmute' })).toBeVisible();
  await buyer.getByRole('button', { name: 'Hide' }).click();
  await expect(buyer.getByRole('button', { name: 'Unhide' })).toBeVisible();
  const inbox = buyer.getByRole('complementary', { name: 'Inbox' });
  await expect(inbox.getByRole('link', { name: new RegExp(businessName) })).toHaveCount(0);
  await buyer.getByRole('button', { name: 'Hidden' }).click();
  await expect(inbox.getByRole('link', { name: new RegExp(businessName) })).toBeVisible();

  // Block: neither side can send; the owner's attempt is refused. Then unblock.
  await buyer.getByRole('button', { name: 'Block' }).click();
  await buyer.getByRole('alertdialog').getByRole('button', { name: 'Block' }).click();
  await expect(
    buyer.getByText(`You blocked ${businessName}.`, { exact: false }).first(),
  ).toBeVisible();
  await expect(buyer.getByRole('textbox', { name: `Message to ${businessName}` })).toHaveCount(0);
  await ownerBox.fill('Are you still there?');
  await ownerBox.press('Enter');
  await expect(ownerLog.getByText('You can’t message this conversation.')).toBeVisible();
  await buyer.getByRole('button', { name: 'Unblock' }).click();
  await expect(buyer.getByRole('textbox', { name: `Message to ${businessName}` })).toBeVisible();

  await buyerContext.close();
});
