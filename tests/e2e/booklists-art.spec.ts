/** 书单配图接入回归：49 项全部有独立封面，桌面/移动端都能正常显示与裁切。 */
import { expect, test } from '@playwright/test';

test('书单页 49 张独立封面已接入且使用 cover 裁切', async ({ page }) => {
  await page.goto('booklists/');

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

  const image = page.locator('main section > ul.grid > li img').first();
  await expect(image).toBeVisible();
  const box = await image.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(box!.height).toBeGreaterThan(0);
});
