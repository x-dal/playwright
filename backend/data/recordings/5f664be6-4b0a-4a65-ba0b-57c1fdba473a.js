import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.google.com/');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.getByRole('combobox', { name: 'Search' }).click();
  await page.getByRole('combobox', { name: 'Search' }).fill('hello world');
  await page.goto('https://www.google.com/sorry/index?continue=https://www.google.com/search%3Fq%3Dhello%2Bworld%26sca_esv%3Dffb1a34a2d49d962%26source%3Dhp%26ei%3DRDDtaZauCMyl1fIPjsaQsQk%26iflsig%3DAFdpzrgAAAAAae0-VF-wY12ScoZNNU6TMs7Xx8GG5alj%26ved%3D0ahUKEwiW4O6t94mUAxXMUlUIHQ4jJJYQ4dUDCBQ%26uact%3D5%26oq%3Dhello%2Bworld%26gs_lp%3DEgdnd3Mtd2l6IgtoZWxsbyB3b3JsZDIFEAAYgAQyBRAAGIAEMgUQABiABDIFEC4YgAQyBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAEMgUQABiABDIFEAAYgARIvy9Q7QxY3StwAXgAkAEAmAFVoAHzBaoBAjExuAEDyAEA-AEBmAILoAKmBqgCAMICCxAuGIAEGMcBGNEDmAMC8QVber2kWuAACJIHAjExoAfsbLIHAjExuAemBsIHBTAuMy44yAcpgAgB%26sclient%3Dgws-wiz%26sei%3DWDDtaZCCDs68wPAPnODBgAk&q=EgTVWWOzGNjgtM8GIjDcHkcR68fogy0WHiIGc19vNwBjHuJPpFHvWcGcJ49xro_ZpqZwTEzfyxdgNqnh_UwyAVJaAUM');
  await page.locator('iframe[name="a-ysv3xm7tklm7"]').contentFrame().getByRole('checkbox', { name: 'I\'m not a robot' }).click();
  await page.locator('iframe[name="c-ysv3xm7tklm7"]').contentFrame().locator('[id="7"]').click();
  await page.locator('iframe[name="c-ysv3xm7tklm7"]').contentFrame().locator('[id="1"]').click();
  await page.locator('iframe[name="c-ysv3xm7tklm7"]').contentFrame().locator('[id="8"]').click();
  await page.locator('iframe[name="c-ysv3xm7tklm7"]').contentFrame().locator('[id="8"]').click();
  await page.locator('iframe[name="c-ysv3xm7tklm7"]').contentFrame().getByRole('button', { name: 'Verify' }).click();
  await page.goto('https://www.google.com/search?q=hello+world&sca_esv=ffb1a34a2d49d962&source=hp&ei=RDDtaZauCMyl1fIPjsaQsQk&iflsig=AFdpzrgAAAAAae0-VF-wY12ScoZNNU6TMs7Xx8GG5alj&ved=0ahUKEwiW4O6t94mUAxXMUlUIHQ4jJJYQ4dUDCBQ&uact=5&oq=hello+world&gs_lp=Egdnd3Mtd2l6IgtoZWxsbyB3b3JsZDIFEAAYgAQyBRAAGIAEMgUQABiABDIFEC4YgAQyBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAEMgUQABiABDIFEAAYgARIvy9Q7QxY3StwAXgAkAEAmAFVoAHzBaoBAjExuAEDyAEA-AEBmAILoAKmBqgCAMICCxAuGIAEGMcBGNEDmAMC8QVber2kWuAACJIHAjExoAfsbLIHAjExuAemBsIHBTAuMy44yAcpgAgB&sclient=gws-wiz&sei=dzDtaceLN67AwPAPz57e8A4');
});