/** 书单配图接入回归：49 项全部有独立封面，桌面/移动端都能正常显示与裁切。 */
import { expect, test, type Page } from '@playwright/test';

/** 策展清单异步加载；等 49 张都从 SVG 回退切到 WebP 再断言，避免竞态。 */
async function waitForCuratedCovers(page: Page) {
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('main section > ul.grid > li img')];
    return images.length === 49 && images.every((image) => (image.getAttribute('src') ?? '').includes('/media/booklists/'));
  }, null, { timeout: 15_000 });
}

test('书单页 49 张独立封面已接入且使用 cover 裁切', async ({ page }) => {
  await page.goto('booklists/');
  await waitForCuratedCovers(page);

  const cards = page.locator('main section > ul.grid > li');
  await expect(cards).toHaveCount(49);

  const images = page.locator('main section > ul.grid > li img');
  await expect(images).toHaveCount(49);
  const sources = await images.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src') ?? ''));
  expect(new Set(sources).size).toBe(49);
  for (const src of sources) expect(src).toMatch(/\/uRead\/media\/booklists\/[^/]+\.webp$/);

  const first = images.first();
  await expect(first).toHaveAttribute('loading', 'lazy');
  await expect(first).toHaveJSProperty('complete', true);
  expect(await first.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await first.evaluate((node) => getComputedStyle(node).objectFit)).toBe('cover');
});

test('移动端书单封面不溢出视口', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('booklists/');
  await waitForCuratedCovers(page);

  const image = page.locator('main section > ul.grid > li img').first();
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();
  const box = await image.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(box!.height).toBeGreaterThan(0);
});
