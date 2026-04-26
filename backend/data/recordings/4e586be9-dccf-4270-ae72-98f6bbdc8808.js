import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.axis.com/');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.getByRole('link', { name: 'Learning organization' }).click();
  await page.getByRole('link', { name: 'Learn more' }).nth(5).click();
});