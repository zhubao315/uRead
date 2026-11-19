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

test('公开笔记详情有来源与分区，音频缺失时不放假播放器', async ({ page }) => {
  await page.goto('read');
  const first = page.locator('a[href*="/read/"]').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.locator('article')).toBeVisible();
  await expect(page.getByRole('heading', { name: '相关阅读' })).toBeVisible();
  const audioCount = await page.locator('audio').count();
  const noAudio = await page.getByText('这篇笔记目前没有音频。').count();
  expect(audioCount > 0 || noAudio > 0).toBeTruthy();
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
