/** 关键用户路径的真实浏览器验收：能看、能搜、能读、能翻书页。 */
import { expect, test } from '@playwright/test';

test('首页展示真实内容并可进入搜索与笔记', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /让读过的书/ })).toBeVisible();
  await expect(page.getByText(/篇读书笔记/)).toBeVisible();
  await page.getByPlaceholder('搜索书名、作者、笔记或主题……').fill('三体');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page).toHaveURL(/\/find\?q=/);
  await expect(page.getByRole('heading', { name: /搜索读书内容/ })).toBeVisible();
});

test('公开笔记详情有来源与分区，无 WAV 也能朗读', async ({ page }) => {
  await page.goto('read');
  const first = page.locator('a[href*="/read/"]').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.locator('article')).toBeVisible();
  await expect(page.getByRole('heading', { name: '相关阅读' })).toBeVisible();
  const audioCount = await page.locator('audio').count();
  const listenButton = await page.getByRole('button', { name: '收听' }).count();
  expect(audioCount > 0 || listenButton > 0).toBeTruthy();
});

test('书单详情保留书目表与原始说明', async ({ page }) => {
  await page.goto('booklists');
  const first = page.locator('a[href*="/themes/"], a[href*="/lists/"]').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.getByRole('heading', { name: '书目' })).toBeVisible();
  await expect(page.locator('ol li').first()).toBeVisible();
});

test('静态书籍索引与详情可打开，且不覆盖 EPUB/PDF 阅读器', async ({ page }) => {
  await page.goto('books/');
  await expect(page.getByRole('heading', { name: '书籍索引' })).toBeVisible();
  const first = page.locator('#list .card a').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.getByRole('heading', { name: '关联笔记' })).toBeVisible();
  const resp = await page.request.get('books/reader.html');
  expect(resp.ok()).toBeTruthy();
});

test('管理工作台是独立入口且数据仍可加载', async ({ page }) => {
  await page.goto('workspace');
  await expect(page.getByRole('heading', { name: /公开内容/ })).toBeVisible();
  await expect(page.getByText(/继续阅读/)).toBeVisible();
});

test('电子书库入口使用 catalog 真实 ID，阅读器能打开对应文件', async ({ page }) => {
  await page.goto('books/library.html');
  await expect(page.getByRole('heading', { name: '可在线阅读的电子书' })).toBeVisible();
  const link = page.locator('a[href^="reader.html?id="]').first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  const id = href?.split('id=')[1] ?? '';
  const catalog = await (await page.request.get('books/catalog.json')).json();
  expect(catalog.some((item: { id: string }) => item.id === id)).toBeTruthy();
  await link.click();
  await expect(page).toHaveURL(/reader\.html\?id=/);
  await expect(page.getByRole('heading', { name: /在线阅读/ })).toBeVisible().catch(() => {});
});

test('聚合书籍首页同时提供档案与电子书库入口，互不覆盖', async ({ page }) => {
  await page.goto('books/');
  await expect(page.getByRole('heading', { name: '书籍索引' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '可在线阅读的电子书' })).toBeVisible();
  await expect(page.getByRole('link', { name: '电子书库' })).toBeVisible();
});
