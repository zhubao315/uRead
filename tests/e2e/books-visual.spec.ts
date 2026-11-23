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

test('顶部四张统计卡可点击筛选书籍列表', async ({ page }) => {
  await page.goto('books/');
  const visible = () => page.evaluate(() =>
    [...document.querySelectorAll('#list .card')].filter((card) => !(card as HTMLElement).hidden).length);

  expect(await visible()).toBe(1804);
  await page.locator('[data-filter="notes"]').click();
  await expect(page.locator('[data-filter="notes"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await visible()).toBe(1714);

  await page.locator('[data-filter="lists"]').click();
  expect(await visible()).toBe(680);

  // 电子书在独立区块，点击后隐藏 1804 条聚合列表，只显示 2 本可在线阅读的书。
  await page.locator('[data-filter="reader"]').click();
  await expect(page.locator('#list')).toBeHidden();
  await expect(page.locator('#library-section')).toBeVisible();
  await expect(page.locator('#library-section li.card')).toHaveCount(2);

  await page.locator('[data-filter="all"]').click();
  await expect(page.locator('#list')).toBeVisible();
  expect(await visible()).toBe(1804);
});

test('移动端书页仍有四宫格底栏与真实统计', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('books/');
  await expect(page.locator('.uread-bottom-nav a')).toHaveCount(4);
  await expect(page.locator('.uread-stat').first()).toContainText('1804');
});
