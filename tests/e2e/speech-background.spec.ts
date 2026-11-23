/** 朗读后台能力：屏幕常亮请求 + 媒体会话控制，避免锁屏即停。 */
import { expect, test } from '@playwright/test';

test('朗读时申请屏幕常亮并注册锁屏播放控制', async ({ page }) => {
  await page.addInitScript(() => {
    const store = { requests: 0, released: 0, actions: [] as string[] };
    (window as unknown as { __speech: typeof store }).__speech = store;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          store.requests += 1;
          return {
            release: async () => { store.released += 1; },
            addEventListener: () => undefined,
          };
        },
      },
    });
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        playbackState: 'none',
        metadata: null,
        setActionHandler: (action: string) => { store.actions.push(action); },
      },
    });
  });

  await page.goto('read');
  await page.locator('a[href*="/read/"]').first().click();
  await expect(page.locator('article')).toBeVisible();
  await page.getByRole('button', { name: '收听' }).click();

  await expect.poll(() => page.evaluate(() => (window as unknown as { __speech: { requests: number } }).__speech.requests))
    .toBeGreaterThan(0);
  const actions = await page.evaluate(() => (window as unknown as { __speech: { actions: string[] } }).__speech.actions);
  expect(actions).toContain('play');
  expect(actions).toContain('pause');
  expect(actions).toContain('stop');
  expect(actions).toContain('nexttrack');
  expect(actions).toContain('previoustrack');

  await page.getByRole('button', { name: '停止' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __speech: { released: number } }).__speech.released))
    .toBeGreaterThan(0);
});
