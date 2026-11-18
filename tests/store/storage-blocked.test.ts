// @vitest-environment jsdom
/**
 * 存储打不开时的行为：必须**结束**并给出可执行的下一步，而不是永远转圈。
 *
 * 回归背景：`indexedDB.open()` 只有 upgradeneeded / success / error 三个回调，
 * 被浏览器策略拦下时触发的是 `blocked`，而这里以前没有 onblocked，也没有超时——
 * Promise 永不落定，全站停在「正在读取本地数据…」的骨架屏上，
 * 既没有报错，也没有重试入口（`errors.ts` 里现成的中文指引根本走不到）。
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  // 只替换 open()：其余 IndexedDB 能力留给 fake-indexeddb，避免连带影响别的用例
  const factory = new Proxy({}, { get: () => undefined }) as unknown as IDBFactory;
  vi.stubGlobal('indexedDB', {
    ...factory,
    open: () => {
      const request = {} as Record<string, unknown>;
      setTimeout(() => (request.onblocked as () => void)(), 0);
      return request;
    },
  });
});

beforeEach(async () => {
  const db = await import('../../src/data/db');
  db.closeDatabase();
});

describe('IndexedDB 被阻塞', () => {
  it('open() 会失败而不是一直挂着', async () => {
    const db = await import('../../src/data/db');

    await expect(db.openDatabase()).rejects.toThrow(/占用|超时/);
  });

  it('失败后允许重试：不会缓存一个永不落定的 Promise', async () => {
    const db = await import('../../src/data/db');

    await expect(db.openDatabase()).rejects.toBeInstanceOf(db.IndexedDbBlockedError);
    // 第二次调用必须重新发起 open（而不是拿到同一个死 Promise）
    await expect(db.openDatabase()).rejects.toThrow(/占用|超时/);
  });

  it('错误能翻译成中文的可执行指引（而不是英文术语或沉默）', async () => {
    const db = await import('../../src/data/db');
    const { describeError } = await import('../../src/store/errors');

    const error = await db.openDatabase().catch((caught: unknown) => caught);
    const explained = describeError(error);

    expect(explained.message).toContain('打不开');
    expect(explained.hint).toMatch(/重试|无痕|存储/);
    expect(explained.hint).not.toContain('IndexedDB'); // 不把内部术语原样抛给用户
  });
});
