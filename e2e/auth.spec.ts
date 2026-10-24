import { expect, test } from '@playwright/test';
import { registerThroughUi, signInThroughUi } from './support/helpers';

test('1. a visitor registers, signs out and signs back in', async ({ page }) => {
  const shopper = await registerThroughUi(page, 'Riley Shopper');
  await expect(page.getByRole('status')).toContainText('Welcome, Riley!');

  await page.getByRole('button', { name: 'Account menu for Riley Shopper' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

  // The session cookie is gone: the API now treats us as anonymous.
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);

  await signInThroughUi(page, shopper.email, shopper.password);
  await expect(page.getByRole('button', { name: 'Account menu for Riley Shopper' })).toBeVisible();
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
});

test('wrong credentials are rejected with a generic message', async ({ page }) => {
  await signInThroughUi(page, 'nobody@example.com', 'Wrong-password1');

  await expect(page.getByRole('alert')).toHaveText(/Invalid email or password/);
  await expect(page).toHaveURL(/\/login/);
});
