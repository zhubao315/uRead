/**
 * store 的失败路径。
 *
 * 之前只有 happy path 有测试：`load()` 失败时到底给使用者看什么话，
 * 完全没人管——于是英文的 IndexedDB 异常直接进了界面。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const failure = { name: 'NotReadableError', message: 'The database is already open' };

vi.mock('../../src/data/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/data/repository')>();
  return {
    ...actual,
    listBooks: vi.fn(async () => {
      const error = new Error(failure.message);
      error.name = failure.name;
      throw error;
    }),
  };
});

import * as repo from '../../src/data/repository';
import { useLibraryStore } from '../../src/store/libraryStore';

beforeEach(() => {
  useLibraryStore.setState({
    books: [],
    notes: [],
    cards: [],
    booklists: [],
    loading: false,
    error: null,
    errorHint: null,
    initialized: false,
  });
  vi.clearAllMocks();
});

describe('load 失败时的状态', () => {
  it('给出中文原因与下一步动作，而不是原始异常', async () => {
    await useLibraryStore.getState().load();
    const state = useLibraryStore.getState();

    expect(state.error).toBe('浏览器拒绝打开本地数据库');
    expect(state.errorHint).toContain('重试');
    expect(state.error).not.toContain('database is already open');
  });

  it('失败后 loading 归位、initialized 置位（视图不会永远卡在骨架屏）', async () => {
    await useLibraryStore.getState().load();
    const state = useLibraryStore.getState();

    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });

  it('再次 load 成功要清掉旧的错误与提示', async () => {
    await useLibraryStore.getState().load();
    expect(useLibraryStore.getState().error).not.toBeNull();

    vi.mocked(repo.listBooks).mockResolvedValue([] as never);
    await useLibraryStore.getState().load();
    const state = useLibraryStore.getState();

    expect(state.error).toBeNull();
    expect(state.errorHint).toBeNull();
  });
});
