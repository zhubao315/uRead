/** 阅读闭环：问题驱动的选书与费曼输出，必须能真正写入本机并被重新看到。 */
import { expect, test } from '@playwright/test';

test('记录阅读问题与费曼输出，AI 只提供参考不自动写入', async ({ page }) => {
  await page.goto('workspace/loop');
  await expect(page.getByRole('heading', { name: /为问题而读/ })).toBeVisible();

  await page.getByPlaceholder('例如：如何提高投资决策质量').fill('如何提高投资决策质量');
  await page.locator('form textarea').first().fill('我常在信息不足时做决定');
  await page.getByRole('button', { name: '保存阅读意图' }).click();
  await expect(page.getByText('如何提高投资决策质量').first()).toBeVisible();

  await page.getByRole('tab', { name: /用自己的话讲清楚/ }).click();
  await page.getByPlaceholder('例如：我如何理解《思考，快与慢》').fill('我如何理解《思考，快与慢》');
  await page.locator('form textarea').first().fill('系统 1 快而直觉，系统 2 慢而审慎');
  await page.getByRole('button', { name: '保存费曼输出' }).click();
  await expect(page.getByText('我如何理解《思考，快与慢》').first()).toBeVisible();

  await expect(page.getByText(/不调用任何 AI 服务/)).toBeVisible();
  await expect(page.getByText('AI 伴读参考（需主动触发）')).toBeVisible();
});

test('刷新后闭环内容仍在（复用 Note 存储，八类备份不变）', async ({ page }) => {
  await page.goto('workspace/loop');
  await page.getByPlaceholder('例如：如何提高投资决策质量').fill('如何在信息不足时决策');
  await page.locator('form textarea').first().fill('先写下自己的问题');
  await page.getByRole('button', { name: '保存阅读意图' }).click();
  await expect(page.getByText('如何在信息不足时决策').first()).toBeVisible();

  await page.reload();
  await expect(page.getByText('如何在信息不足时决策').first()).toBeVisible();
});
