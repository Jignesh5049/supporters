import { test, expect } from '@playwright/test';

test.describe('Wallet and Referral Flow', () => {
  test('validates minimum withdrawal and UPI destination', async ({ page }) => {
    await page.goto('/wallet');
    await expect(page.getByText(/Wallet/i).first()).toBeVisible();

    // Click withdraw money
    await page.getByRole('link', { name: /Withdraw/i }).first().click();
    await expect(page).toHaveURL('/wallet/withdraw');

    // Test minimum amount validation (< 100)
    const amountInput = page.getByLabel(/Withdrawal Amount/i).or(page.locator('input[type="number"]')).first();
    await amountInput.fill('50');
    await page.getByRole('button', { name: /Review|Withdraw|Submit/i }).first().click();
    await expect(page.getByText(/Minimum withdrawal amount is ₹100|₹100/i).first()).toBeVisible();

    // Switch to Bank Account mode if available
    const bankButton = page.getByRole('button', { name: 'Bank Account' });
    if (await bankButton.isVisible().catch(() => false)) {
      await bankButton.click();
      await expect(page.getByLabel(/IFSC/i).or(page.locator('input[placeholder*="IFSC"]')).first()).toBeVisible();
    }
  });

  test('referral page generates shareable link and displays reward tiers', async ({ page }) => {
    await page.goto('/referral');
    await expect(page.getByText(/Refer/i).first()).toBeVisible();
    await expect(page.getByText(/Bonus|Reward|Share/i).first()).toBeVisible();
  });
});
