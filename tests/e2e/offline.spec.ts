/** 离线验收：Service Worker 安装后，断网刷新仍能打开应用外壳，而不是空白页。 */
import { expect, test } from '@playwright/test';

test('预缓存应用外壳在断网后仍可启动', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /让读过的书/ })).toBeVisible();

  // 等待 Service Worker 真正激活（注册发生在 load 事件之后）。
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active?.state !== 'activated') {
      await new Promise<void>((resolve) => {
        const worker = registration.active;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve();
        });
      });
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /让读过的书/ })).toBeVisible();
  await expect(page.getByText(/联网后将自动恢复/)).toBeVisible();
  await context.setOffline(false);
});
