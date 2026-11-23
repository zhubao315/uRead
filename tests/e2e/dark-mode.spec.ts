/** 暗色阅读：主题真相是 meta，所有页面都不能留下刺眼的白色卡片。 */
import { expect, test } from '@playwright/test';

const nearWhiteSurfaces = () =>
  // 在浏览器里统计可见的近白色背景，避免把 Tailwind 类名当样式断言。
  [...document.querySelectorAll('main *, nav *, article *, aside *')]
    .filter((element) => element.getClientRects().length > 0)
    .filter((element) => /^rgb\(2[4-5]\d,\s*2[4-5]\d,\s*2[4-5]\d\)$/.test(getComputedStyle(element).backgroundColor))
    .length;

test('暗色模式：主站与书页都无残留白块，刷新后保留', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText(/篇读书笔记/).first()).toBeVisible();
  await page.locator('button[aria-label="切换到夜间模式"]:visible').first().click();
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
  // 卡片带 transition，过渡结束前会读到中间帧，先等它稳定。
  await page.waitForTimeout(400);
  expect(await page.evaluate(nearWhiteSurfaces)).toBe(0);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 23, 42)');

  await page.reload();
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 23, 42)');

  await page.goto('books/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  expect(await page.evaluate(nearWhiteSurfaces)).toBe(0);
});
