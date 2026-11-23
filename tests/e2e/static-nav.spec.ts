/** 静态书页与 React 主站的导航必须同构，尤其是移动端底栏。 */
import { expect, test } from '@playwright/test';

const EXPECT_LABELS = ['首页', '笔记', '书单', '书籍'];

test('移动端：书页底部导航与主站一致，且「书籍」处于激活态', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('books/');

  const bottom = page.locator('.uread-bottom-nav');
  await expect(bottom).toBeVisible();
  await expect(bottom.locator('.uread-bottom-link')).toHaveCount(4);
  await expect(bottom.locator('.uread-bottom-link span')).toHaveText(EXPECT_LABELS);
  await expect(bottom.locator('.uread-bottom-link[aria-current="page"]')).toContainText('书籍');

  // 桌面五栏目在移动端应隐藏，操作转到底栏与第二行。
  await expect(page.locator('.uread-nav-links')).toBeHidden();
  await expect(page.locator('.uread-mobile-bar')).toBeVisible();
  await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeVisible();

  await page.getByRole('button', { name: '打开导航菜单' }).click();
  await expect(page.locator('#uread-mobile-menu')).toBeVisible();
});

test('移动端：主站底栏与书页底栏使用同一组入口', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const appLabels = await page.locator('nav[aria-label="移动端底部导航"] a span:last-child').allTextContents();
  expect(appLabels).toEqual(EXPECT_LABELS);
});

test('桌面端：书页保留五栏目与搜索，主题开关只有一处可见', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('books/');
  await expect(page.locator('.uread-nav-link')).toHaveCount(5);
  await expect(page.locator('.uread-nav-search input')).toBeVisible();
  await expect(page.locator('.uread-bottom-nav')).toBeHidden();
  await expect(page.locator('.uread-theme-toggle:visible')).toHaveCount(1);
});
