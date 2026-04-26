import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.axis.com/');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.getByRole('link', { name: 'Products', exact: true }).click();
  await page.getByRole('link', { name: 'Network intercoms' }).first().click();
  await page.getByText('Products Network cameras .cls').click();
  await page.getByRole('link', { name: 'Dome cameras' }).click();
});