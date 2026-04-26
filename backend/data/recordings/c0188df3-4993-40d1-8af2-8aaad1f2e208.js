import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.axis.com/');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByRole('link', { name: 'Network cameras' }).first().click();
  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByRole('link', { name: 'Dome cameras', exact: true }).click();
});