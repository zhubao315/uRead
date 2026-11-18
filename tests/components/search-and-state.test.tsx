/**
 * 过滤与页面状态判定是纯逻辑，先在这里锁住口径；
 * 组件层的渲染断言见 tests/components/state-and-search.test.tsx。
 */
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SEARCH_DEBOUNCE_MS,
  matchesQuery,
  useDebouncedValue,
} from '../../src/components/Search';
import { resolveState } from '../../src/components/StateBlock';

describe('matchesQuery 多词 AND 过滤', () => {
  it('空查询命中一切（调用方不必为“没输入”写分支）', () => {
    expect(matchesQuery('', ['任何内容'])).toBe(true);
    expect(matchesQuery('   ', ['任何内容'])).toBe(true);
  });

  it('多个词必须同时命中（“认知 卡片”不匹配只含“认知”的条目）', () => {
    expect(matchesQuery('认知 卡片', ['认知科学', '知识卡片'])).toBe(true);
    expect(matchesQuery('认知 卡片', ['认知科学'])).toBe(false);
  });

  it('不区分大小写', () => {
    expect(matchesQuery('Cache', ['缓存一致性 Cache Coherence'])).toBe(true);
    expect(matchesQuery('cache coherence', ['Cache Coherence'])).toBe(true);
  });

  it('跨字段合并匹配，并忽略 undefined / null 字段', () => {
    const fields = [undefined, '《深入理解计算机系统》', null, '作者：Bryant'];

    expect(matchesQuery('bryant 计算机系统', fields)).toBe(true);
    expect(matchesQuery('bryant 操作系统', fields)).toBe(false);
  });

  it('按空白分词（含全角空格与换行）', () => {
    expect(matchesQuery('知识\n治理', ['知识治理方法论'])).toBe(true);
    expect(matchesQuery('知识 治理', ['只含知识'])).toBe(false);
  });
});

describe('useDebouncedValue 防抖', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useFakeTimers());

  it('输入过程中不立即生效，停顿后才生效', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: '' },
    });

    rerender({ value: '知' });
    rerender({ value: '知识' });
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(result.current).toBe('知识');
  });

  it('中途重置计时器：不会把半个关键词当成完整查询', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });
});

describe('resolveState 状态优先级（出错 > 首次加载 > 空 > 内容）', () => {
  it('出错优先于空：故障不能显示成新手引导', () => {
    expect(
      resolveState({ error: '浏览器拒绝打开本地数据库', loading: false, initialized: true, isEmpty: true }),
    ).toBe('error');
  });

  it('出错时即使 initialized 为假也显示错误而不是骨架', () => {
    expect(resolveState({ error: '读取失败', loading: true, initialized: false })).toBe('error');
  });

  it('首次加载显示加载态，不是空状态', () => {
    expect(resolveState({ loading: true, initialized: false, isEmpty: true })).toBe('loading');
  });

  it('加载完成后的空数组才是空状态', () => {
    expect(resolveState({ loading: false, initialized: true, isEmpty: true })).toBe('empty');
  });

  it('已有数据后的后台刷新不打断内容', () => {
    expect(resolveState({ loading: true, initialized: true, isEmpty: false })).toBe('content');
  });

  it('有内容就是内容态', () => {
    expect(resolveState({ loading: false, initialized: true, isEmpty: false })).toBe('content');
  });
});
