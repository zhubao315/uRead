/** 书页视觉升级回归：真实统计、共享导航、毛玻璃吸顶、明暗一致。 */
import { expect, test } from '@playwright/test';

test('书籍索引展示真实统计且导航为共享的毛玻璃栏', async ({ page }) => {
  await page.goto('books/');

  const stats = page.locator('.uread-stat');
  await expect(stats).toHaveCount(4);
  await expect(stats.nth(0)).toContainText('1804');
  await expect(stats.nth(1)).toContainText('1714');
  await expect(stats.nth(2)).toContainText('680');
  await expect(stats.nth(3)).toContainText('2');

  const nav = page.locator('.uread-site-nav');
  await expect(nav).toBeVisible();
  expect(await nav.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  expect(await nav.evaluate((element) => getComputedStyle(element).backdropFilter)).toContain('blur');
  await expect(page.locator('.uread-nav-link')).toHaveCount(5);
});

test('移动端书页仍有四宫格底栏与真实统计', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('books/');
  await expect(page.locator('.uread-bottom-nav a')).toHaveCount(4);
  await expect(page.locator('.uread-stat').first()).toContainText('1804');
});
