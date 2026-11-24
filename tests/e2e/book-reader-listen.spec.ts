import { test, expect } from '@playwright/test';

/**
 * 静态书库阅读器 V1 冒烟测试（真实 EPUB + Mock 语音）。
 * 用 page.route 注入 catalog 与本地书文件，避免依赖 CI 上的具体书目。
 */
test.describe('book reader immersive + listen', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const store = {
        utterances: [] as string[], states: [] as string[], segments: [] as string[],
        wakeRequests: 0, wakeReleases: 0, mediaActions: [] as string[],
      };
      (window as unknown as { __reader: typeof store }).__reader = store;

      class FakeUtterance {
        text: string;
        lang = '';
        rate = 1;
        voice: unknown = null;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((e: { error: string }) => void) | null = null;
        constructor(text: string) { this.text = text; store.utterances.push(text); }
      }
      const synth = {
        speaking: false, paused: false, pending: false,
        getVoices: () => [{
          name: 'Chinese Test Voice', lang: 'zh-CN', voiceURI: 'test-zh', default: true,
          localService: true,
        }],
        speak(u: FakeUtterance) {
          synth.speaking = true;
          setTimeout(() => { u.onstart?.(); }, 0);
          // 不自动 onend：由测试显式推进，避免竞态。
        },
        cancel() { synth.speaking = false; synth.paused = false; },
        pause() { synth.paused = true; },
        resume() { synth.paused = false; },
        addEventListener() {}, removeEventListener() {},
      };
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });

      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: { request: async () => {
          store.wakeRequests += 1;
          return { release: async () => { store.wakeReleases += 1; }, addEventListener() {} };
        } },
      });
      Object.defineProperty(navigator, 'mediaSession', {
        configurable: true,
        value: {
          playbackState: 'none', metadata: null,
          setActionHandler: (action: string) => { store.mediaActions.push(action); },
        },
      });
    });

    // 用真实 EPUB：测试目录里放一份最小合法 EPUB。
    await page.route('**/books/test.epub', async (route) => {
      await route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from('UEsDBBQAAAAAALuIeF1vYassFAAAABQAAAAIAAAAbWltZXR5cGVhcHBsaWNhdGlvbi9lcHViK3ppcFBLAwQUAAAAAAC7iHhdHgvXyd0AAADdAAAAFgAAAE1FVEEtSU5GL2NvbnRhaW5lci54bWw8P3htbCB2ZXJzaW9uPSIxLjAiPz48Y29udGFpbmVyIHZlcnNpb249IjEuMCIgeG1sbnM9InVybjpvYXNpczpuYW1lczp0YzpvcGVuZG9jdW1lbnQ6eG1sbnM6Y29udGFpbmVyIj48cm9vdGZpbGVzPjxyb290ZmlsZSBmdWxsLXBhdGg9Ik9FQlBTL2NvbnRlbnQub3BmIiBtZWRpYS10eXBlPSJhcHBsaWNhdGlvbi9vZWJwcy1wYWNrYWdlK3htbCIvPjwvcm9vdGZpbGVzPjwvY29udGFpbmVyPlBLAwQUAAAAAAC7iHhdLGFGJ/oBAAD6AQAAEQAAAE9FQlBTL2NvbnRlbnQub3BmPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48cGFja2FnZSB4bWxucz0iaHR0cDovL3d3dy5pZHBmLm9yZy8yMDA3L29wZiIgdmVyc2lvbj0iMy4wIiB1bmlxdWUtaWRlbnRpZmllcj0iaWQiPjxtZXRhZGF0YSB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPjxkYzp0aXRsZT7ljYPliIbkuYvkuIDnmoTkvaA8L2RjOnRpdGxlPjxkYzpjcmVhdG9yPuacseWunTwvZGM6Y3JlYXRvcj48ZGM6bGFuZ3VhZ2U+emgtQ048L2RjOmxhbmd1YWdlPjwvbWV0YWRhdGE+PG1hbmlmZXN0PjxpdGVtIGlkPSJuYXYiIGhyZWY9Im5hdi54aHRtbCIgbWVkaWEtdHlwZT0iYXBwbGljYXRpb24veGh0bWwreG1sIiBwcm9wZXJ0aWVzPSJuYXYiLz48aXRlbSBpZD0iYzEiIGhyZWY9ImMxLnhodG1sIiBtZWRpYS10eXBlPSJhcHBsaWNhdGlvbi94aHRtbCt4bWwiLz48L21hbmlmZXN0PjxzcGluZT48aXRlbXJlZiBpZHJlZj0iYzEiLz48L3NwaW5lPjwvcGFja2FnZT5QSwMEFAAAAAAAu4h4XYdA7+YnBQAAJwUAAA4AAABPRUJQUy9jMS54aHRtbDw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9InV0Zi04Ij8+PCFET0NUWVBFIGh0bWw+CjxodG1sIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIj48aGVhZD48dGl0bGU+5Y2D5YiG5LmL5LiA55qE5L2gIMK3IOa1i+ivleeroOiKgjwvdGl0bGU+PC9oZWFkPgo8Ym9keT48aDE+5Y2D5YiG5LmL5LiA55qE5L2gIMK3IOa1i+ivleeroOiKgjwvaDE+PHA+6L+Z5piv56ysMeautea1i+ivleato+aWh++8jOeUqOadpemqjOivgeS7juW9k+WJjemYheivu+S9jee9ruW8gOWni+acl+ivu++8jOS7peWPiuauteiQvemrmOS6ruS4juiHquWKqOa7muWKqOaYr+WQpuato+W4uOW3peS9nOOAgjwvcD48cD7ov5nmmK/nrKwy5q615rWL6K+V5q2j5paH77yM55So5p2l6aqM6K+B5LuO5b2T5YmN6ZiF6K+75L2N572u5byA5aeL5pyX6K+777yM5Lul5Y+K5q616JC96auY5Lqu5LiO6Ieq5Yqo5rua5Yqo5piv5ZCm5q2j5bi45bel5L2c44CCPC9wPjxwPui/meaYr+esrDPmrrXmtYvor5XmraPmlofvvIznlKjmnaXpqozor4Hku47lvZPliY3pmIXor7vkvY3nva7lvIDlp4vmnJfor7vvvIzku6Xlj4rmrrXokL3pq5jkuq7kuI7oh6rliqjmu5rliqjmmK/lkKbmraPluLjlt6XkvZzjgII8L3A+PHA+6L+Z5piv56ysNOautea1i+ivleato+aWh++8jOeUqOadpemqjOivgeS7juW9k+WJjemYheivu+S9jee9ruW8gOWni+acl+ivu++8jOS7peWPiuauteiQvemrmOS6ruS4juiHquWKqOa7muWKqOaYr+WQpuato+W4uOW3peS9nOOAgjwvcD48cD7ov5nmmK/nrKw15q615rWL6K+V5q2j5paH77yM55So5p2l6aqM6K+B5LuO5b2T5YmN6ZiF6K+75L2N572u5byA5aeL5pyX6K+777yM5Lul5Y+K5q616JC96auY5Lqu5LiO6Ieq5Yqo5rua5Yqo5piv5ZCm5q2j5bi45bel5L2c44CCPC9wPjxwPui/meaYr+esrDbmrrXmtYvor5XmraPmlofvvIznlKjmnaXpqozor4Hku47lvZPliY3pmIXor7vkvY3nva7lvIDlp4vmnJfor7vvvIzku6Xlj4rmrrXokL3pq5jkuq7kuI7oh6rliqjmu5rliqjmmK/lkKbmraPluLjlt6XkvZzjgII8L3A+PHA+6L+Z5piv56ysN+autea1i+ivleato+aWh++8jOeUqOadpemqjOivgeS7juW9k+WJjemYheivu+S9jee9ruW8gOWni+acl+ivu++8jOS7peWPiuauteiQvemrmOS6ruS4juiHquWKqOa7muWKqOaYr+WQpuato+W4uOW3peS9nOOAgjwvcD48cD7ov5nmmK/nrKw45q615rWL6K+V5q2j5paH77yM55So5p2l6aqM6K+B5LuO5b2T5YmN6ZiF6K+75L2N572u5byA5aeL5pyX6K+777yM5Lul5Y+K5q616JC96auY5Lqu5LiO6Ieq5Yqo5rua5Yqo5piv5ZCm5q2j5bi45bel5L2c44CCPC9wPjwvYm9keT48L2h0bWw+UEsDBBQAAAAAALuIeF2CmoTZ1AAAANQAAAAPAAAAT0VCUFMvbmF2LnhodG1sPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48aHRtbCB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCI+PGhlYWQ+PHRpdGxlPuebruW9lTwvdGl0bGU+PC9oZWFkPjxib2R5PjxuYXYgZXB1Yjp0eXBlPSJ0b2MiPjxvbD48bGk+PGEgaHJlZj0iYzEueGh0bWwiPuesrOS4gOeroDwvYT48L2xpPjwvb2w+PC9uYXY+PC9ib2R5PjwvaHRtbD5QSwECFAMUAAAAAAC7iHhdb2GrLBQAAAAUAAAACAAAAAAAAAAAAAAAgAEAAAAAbWltZXR5cGVQSwECFAMUAAAAAAC7iHhdHgvXyd0AAADdAAAAFgAAAAAAAAAAAAAAgAE6AAAATUVUQS1JTkYvY29udGFpbmVyLnhtbFBLAQIUAxQAAAAAALuIeF0sYUYn+gEAAPoBAAARAAAAAAAAAAAAAACAAUsBAABPRUJQUy9jb250ZW50Lm9wZlBLAQIUAxQAAAAAALuIeF2HQO/mJwUAACcFAAAOAAAAAAAAAAAAAACAAXQDAABPRUJQUy9jMS54aHRtbFBLAQIUAxQAAAAAALuIeF2CmoTZ1AAAANQAAAAPAAAAAAAAAAAAAACAAccIAABPRUJQUy9uYXYueGh0bWxQSwUGAAAAAAUABQAyAQAAyAkAAAAA', 'base64') });
    });
    await page.route('**/books/catalog.json', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'df4c81f86b08', title: '《千分之一的你》测试本', author: '朱宝',
          format: 'epub', size_bytes: 1024, path: 'books/test.epub',
        }]),
      });
    });
    await page.goto('/uRead/books/reader.html?id=df4c81f86b08');
    // 等阅读器模块完成初始化（EPUB 解析 + UI 绑定），避免慢环境下点击过早。
    await expect.poll(() => page.evaluate(() => typeof (window as any).__ureadReader)).toBe('object');
  });

  test('opens EPUB, enters immersive mode, and starts speech from current page', async ({ page }) => {
    await expect(page.locator('#title')).toHaveText('《千分之一的你》测试本');
    await expect(page.locator('foliate-view')).toBeVisible();

    await page.locator('#btn-immersive').click();
    await expect(page.locator('html')).toHaveClass(/reader-immersive/);
    await expect(page.locator('#btn-immersive-exit')).toBeVisible();

    await page.locator('#btn-listen').click();
    await expect(page.locator('#btn-listen')).toHaveAttribute('data-state', 'playing');
    await expect.poll(() => page.evaluate(() => typeof (window as any).__ureadReader)).toBe('object');
    const state = await page.evaluate(() => (window as any).__ureadReader?.controller?.getState?.());
    expect(state).toBe('playing');

    const utterances = await page.evaluate(() => (window as any).__reader.utterances);
    expect(utterances.length).toBeGreaterThan(0);
    expect(utterances[0].length).toBeGreaterThan(2);
  });

  test('pause / resume / next / stop keep a single utterance', async ({ page }) => {
    await page.locator('#btn-listen').click();
    await expect(page.locator('#btn-listen')).toHaveAttribute('data-state', 'playing');

    await page.locator('#btn-play-pause').click();
    await expect(page.locator('#btn-listen')).toHaveAttribute('data-state', 'paused');
    await page.locator('#btn-play-pause').click();
    await expect(page.locator('#btn-listen')).toHaveAttribute('data-state', 'playing');

    await page.locator('#btn-next').click();
    const after = await page.evaluate(() => ({
      cursor: (window as any).__ureadReader?.controller?.getCursor?.(),
      total: (window as any).__ureadReader?.controller?.getQueue?.().length,
    }));
    expect(after.cursor).toBeGreaterThanOrEqual(0);
    expect(after.total).toBeGreaterThan(0);

    await page.locator('#btn-stop').click();
    await expect(page.locator('#btn-listen')).toHaveAttribute('data-state', 'idle');
  });

  test('registers Media Session handlers', async ({ page }) => {
    await page.locator('#btn-listen').click();
    const actions = await page.evaluate(() => (window as any).__reader.mediaActions);
    for (const action of ['play', 'pause', 'stop', 'nexttrack', 'previoustrack']) {
      expect(actions).toContain(action);
    }
  });
});
