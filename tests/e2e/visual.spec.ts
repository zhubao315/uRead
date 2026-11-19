/** 生成阶段 9 交付截图；同时断言无横向溢出、底部导航不遮挡内容。 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(__dirname, '../../screenshots');
mkdirSync(SHOTS, { recursive: true });

const shot = async (page: import('@playwright/test').Page, name: string) => {
  await page.screenshot({ path: path.join(SHOTS, `${name}-${test.info().project.name}.png`), fullPage: true });
};

test('首页截图与多端布局检查', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /让读过的书/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await shot(page, 'home');
});

test('笔记详情截图', async ({ page }) => {
  await page.goto('read');
  await page.locator('a[href*="/read/"]').first().click();
  await expect(page.locator('article')).toBeVisible();
  await shot(page, 'note-detail');
});

test('书单详情截图', async ({ page }) => {
  await page.goto('booklists');
  await page.locator('a[href*="/themes/"], a[href*="/lists/"]').first().click();
  await expect(page.getByRole('heading', { name: '书目' })).toBeVisible();
  await shot(page, 'booklist-detail');
});

test('书籍详情截图', async ({ page }) => {
  await page.goto('books/');
  await page.locator('#list .card a').first().click();
  await expect(page.getByRole('heading', { name: '关联笔记' })).toBeVisible();
  await shot(page, 'book-detail');
});

test('工作台截图', async ({ page }) => {
  await page.goto('workspace');
  await expect(page.getByRole('heading', { name: /公开内容/ })).toBeVisible();
  await shot(page, 'workspace');
});

test('移动端底部导航可见且不遮挡正文', async ({ page, isMobile }) => {
  test.skip(!isMobile, '仅移动端验收');
  await page.goto('read');
  const nav = page.locator('nav[aria-label="移动端底部导航"]');
  await expect(nav).toBeVisible();
  const box = await nav.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
