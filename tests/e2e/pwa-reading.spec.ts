/** PWA 可安装性与阅读主题：GitHub Pages 子路径必须正确，主题设置要能持久化。 */
import { expect, test } from '@playwright/test';

test('PWA manifest 使用 /uRead/ 作为 start_url 与 scope', async ({ page, request }) => {
  const response = await request.get('manifest.webmanifest');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.start_url).toBe('/uRead/');
  expect(manifest.scope).toBe('/uRead/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

  await page.goto('./');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/uRead/manifest.webmanifest');
});

test('阅读主题可切换、作用于正文并在刷新后保留', async ({ page }) => {
  await page.goto('read');
  await page.locator('a[href*="/read/"]').first().click();
  const article = page.locator('article');
  await expect(article).toBeVisible();
  await expect(article).toHaveAttribute('data-reading-theme', 'paper');

  await page.getByRole('button', { name: '阅读主题：羊皮纸' }).click();
  await expect(article).toHaveAttribute('data-reading-theme', 'sepia');
  await expect(article).toHaveCSS('background-color', 'rgb(246, 241, 231)');

  await page.reload();
  await expect(article).toHaveAttribute('data-reading-theme', 'sepia');

  await page.getByRole('button', { name: '阅读主题：护眼绿' }).click();
  await expect(article).toHaveCSS('background-color', 'rgb(199, 237, 204)');
});
