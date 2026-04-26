import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.axis.com/products');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.getByRole('link', { name: 'Axis IP camera mounted on the' }).click();
  await page.getByRole('link', { name: 'AXIS P3268-LVE viewed from' }).click();
});