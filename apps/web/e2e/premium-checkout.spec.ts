import { test, expect } from '@playwright/test';

test.describe('Premium Subscription & Checkout Flow', () => {
  test('displays subscription plans and highlights supplier benefits', async ({ page }) => {
    // Navigate to /subscription (or /business/premium when redirected)
    await page.goto('/subscription');

    // Asserts key benefits and plan details are rendered
    await expect(page.getByText(/Verified|Supplier Badge|Membership|Supporters/i).first()).toBeVisible();
    await expect(page.getByText(/Priority Search|Discovery Boost|Analytics/i).first()).toBeVisible();
  });

  test('navigates to checkout or displays active membership status', async ({ page }) => {
    await page.goto('/subscription');
    // Button or badge indicating active plan or upgrade options
    const actionButton = page.getByRole('button', { name: /Upgrade|Manage|Choose|Pay|Get Started/i }).first();
    await expect(actionButton).toBeVisible();
  });
});
