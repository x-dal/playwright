import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://pub.dev/');
  await page.getByRole('searchbox', { name: 'Search' }).click();
  await page.getByRole('searchbox', { name: 'Search' }).fill('getx');
  await page.getByRole('searchbox', { name: 'Search' }).press('Enter');
  await page.getByRole('link', { name: 'get', exact: true }).click();
  await page.getByRole('img', { name: 'copy "get: ^4.7.3" to' }).click();
});