import { expect, test } from './fixtures';
import { createBusinessPage, jpeg, registerFreshUser } from './helpers';

test('an owner posts; another user sees it, likes, comments, follows and saves', async ({
  browser,
  page,
}) => {
  test.slow();
  const suffix = String(Date.now()).slice(-6);
  const businessName = `E2E Posters ${suffix}`;
  const body = `New season stock ${suffix}`;
  const commentText = `Interested, please share rates ${suffix}`;

  const scratch = await browser.newPage();
  const photo = await jpeg(scratch, '#a3238e');
  await scratch.close();

  // Owner: register, create a business, publish a post with a photo.
  await registerFreshUser(page, 'Owner Tester');
  await createBusinessPage(page, businessName);
  await page.goto('/business/posts');
  await expect(page.getByText('0 of 10 posts published in the last 7 days')).toBeVisible();
  await page.getByRole('link', { name: 'New post' }).click();
  await expect(page).toHaveURL('/business/posts/new');
  await page.getByLabel('Text').fill(body);
  await page.getByRole('button', { name: 'Save post' }).click();
  await expect(page.getByText('Add at least one image or a video to publish')).toBeVisible();
  await page
    .getByRole('group', { name: 'Images' })
    .locator('input[type=file]')
    .setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(page.getByRole('img', { name: 'Images 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Save post' }).click();
  await expect(page).toHaveURL('/business/posts');
  await expect(page.getByRole('link', { name: `Edit post: ${body}` })).toBeVisible();
  await expect(page.getByText('1 of 10 posts published in the last 7 days')).toBeVisible();

  // Another user: sees it in the feed, opens it, likes it and comments.
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await registerFreshUser(other, 'Buyer Tester');
  await other.goto('/');
  const card = other.getByRole('article').filter({ hasText: body });
  await expect(card).toBeVisible();
  await expect(card).toContainText('0 likes');
  await card.getByRole('button', { name: 'Like', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Liked' })).toBeVisible();
  await expect(card).toContainText('1 like');

  await card.getByRole('link', { name: 'Comment', exact: true }).click();
  await expect(other).toHaveURL(/\/post\/[0-9a-f-]{36}$/);
  await expect(other).toHaveTitle(new RegExp(`${businessName}: New season stock`));
  await other.getByLabel('Write a comment').fill(commentText);
  await other.getByRole('button', { name: 'Comment', exact: true }).click();
  const comment = other.getByRole('article', { name: 'Comment by Buyer Tester' });
  await expect(comment).toContainText(commentText);
  await expect(other.locator('span', { hasText: /^1 comment$/ })).toBeVisible();

  // Delete the comment (author), after confirming.
  await comment.getByRole('button', { name: 'Delete' }).click();
  await other.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(comment).toHaveCount(0);
  await expect(other.locator('span', { hasText: /^0 comments$/ })).toBeVisible();

  // The like is still there after a reload (it was saved by the API).
  await other.reload();
  await expect(other.getByRole('button', { name: 'Liked' })).toBeVisible();

  // Follow the business from its page (the first view marked the post as seen, so only
  // following keeps it in this feed), then save the post and find it under Saved.
  await other.getByRole('link', { name: businessName }).first().click();
  await expect(other).toHaveURL(/\/business\/e2e-posters-\d+/);
  await expect(other.getByTestId('follower-count')).toHaveText('0 followers');
  await other.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(other.getByRole('button', { name: 'Following' })).toBeVisible();
  await expect(other.getByTestId('follower-count')).toHaveText('1 follower');
  await other.getByRole('tab', { name: /Posts/ }).click();
  await expect(other.getByRole('tabpanel').getByText(body)).toBeVisible();

  await other.goto('/');
  const followed = other.getByRole('article').filter({ hasText: body });
  await followed.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(followed.getByRole('button', { name: 'Saved' })).toBeVisible();
  await other.goto('/saved?type=post');
  await expect(other.getByRole('article').filter({ hasText: body })).toBeVisible();
  await otherContext.close();
});
