import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.axis.com/');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByText('Network intercoms .cls-1{fill').click();
  await page.getByRole('link', { name: 'packshot intercoms Video' }).click();
  await page.getByRole('link', { name: 'A8207 AXIS A8207-VE Mk II' }).click();
  await page.locator('#show-more-tech-spec').getByText('View more View less').click();
});