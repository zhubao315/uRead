/** 书页视觉升级回归：真实统计、共享导航、毛玻璃吸顶、明暗一致。 */
import { expect, test } from '@playwright/test';

/**
 * 书目数随笔记/书库同步变化，测试从真实 aggregate.json 与 catalog.json 读取期望值，
 * 不再硬编码 1804 / 1714 / 680 / 2。
 */
async function expectedCounts(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const aggregate = await (await fetch('./aggregate.json')).json();
    const catalog = await (await fetch('./catalog.json')).json();
    return {
      total: aggregate.summary.book_count as number,
      linked: aggregate.summary.linked_notes as number,
      lists: aggregate.summary.from_booklist as number,
      library: (catalog as unknown[]).length,
    };
  });
}

test('书籍索引展示真实统计且导航为共享的毛玻璃栏', async ({ page }) => {
  await page.goto('books/');
  const expected = await expectedCounts(page);

  const stats = page.locator('.uread-stat');
  await expect(stats).toHaveCount(4);
  await expect(stats.nth(0)).toContainText(String(expected.total));
  await expect(stats.nth(1)).toContainText(String(expected.linked));
  await expect(stats.nth(2)).toContainText(String(expected.lists));
  await expect(stats.nth(3)).toContainText(String(expected.library));

  const nav = page.locator('.uread-site-nav');
  await expect(nav).toBeVisible();
  expect(await nav.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  expect(await nav.evaluate((element) => getComputedStyle(element).backdropFilter)).toContain('blur');
  await expect(page.locator('.uread-nav-link')).toHaveCount(5);
});

test('顶部四张统计卡可点击筛选书籍列表', async ({ page }) => {
  await page.goto('books/');
  const expected = await expectedCounts(page);
  const visible = () => page.evaluate(() =>
    [...document.querySelectorAll('#list .card')].filter((card) => !(card as HTMLElement).hidden).length);

  expect(await visible()).toBe(expected.total);
  await page.locator('[data-filter="notes"]').click();
  await expect(page.locator('[data-filter="notes"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await visible()).toBe(expected.linked);

  await page.locator('[data-filter="lists"]').click();
  expect(await visible()).toBe(expected.lists);

  // 电子书在独立区块，点击后隐藏聚合列表，只显示真实书库里的可在线阅读的书。
  await page.locator('[data-filter="reader"]').click();
  await expect(page.locator('#list')).toBeHidden();
  await expect(page.locator('#library-section')).toBeVisible();
  await expect(page.locator('#library-section li.card')).toHaveCount(expected.library);

  await page.locator('[data-filter="all"]').click();
  await expect(page.locator('#list')).toBeVisible();
  expect(await visible()).toBe(expected.total);
});

test('移动端书页仍有四宫格底栏与真实统计', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('books/');
  const expected = await expectedCounts(page);
  await expect(page.locator('.uread-bottom-nav a')).toHaveCount(4);
  await expect(page.locator('.uread-stat').first()).toContainText(String(expected.total));
});
