/**
 * 表单草稿：把**未提交**的内容暂存在本机，切换页面或刷新不丢。
 *
 * 为什么需要它：四个表单页的字段都只存在组件状态里，用户敲了一段长笔记，
 * 点到导航栏、或者浏览器刷新，内容就整段消失——而界面从来没说会这样。
 * 这是本仓库里唯一会「吃掉用户输入」的地方（IndexedDB 那条路径至少会报错）。
 *
 * 三条边界，都是刻意的：
 * 1. **草稿不是知识**：只写 `localStorage`，绝不进 IndexedDB、不进 JSON 备份、
 *    不进 Markdown 导出（有测试锁住）。恢复时会明说「尚未保存」。
 * 2. **存不下就如实说**：隐私模式或禁用存储时 `setItem` 会抛异常。
 *    这里不吞掉它，而是标成 `blocked` 并由界面说明「离开页面会丢」——
 *    静默失败等于承诺了做不到的事。
 * 3. **写只在事件处理里**：不用 `useEffect` 回写（本仓库启用的
 *    `react-hooks/set-state-in-effect` 拒绝在 effect 里 setState，
 *    而且那会让「按一次键」变成两轮渲染）。
 */
import { useCallback, useState } from 'react';

const PREFIX = 'uread:draft:v1:';

export interface DraftState<T extends Record<string, string>> {
  values: T;
  /** 只改一部分字段：`set({ title: event.target.value })`。 */
  set: (patch: Partial<T>) => void;
  /** 提交成功或用户主动丢弃后清空。 */
  clear: () => void;
  /** 本次进入页面时是否恢复了草稿（界面据此显示「已恢复，尚未保存」）。 */
  restored: boolean;
  /** 本机不允许暂存（隐私模式 / 禁用存储），界面必须说明会丢。 */
  blocked: boolean;
}

function storageUnavailable(): boolean {
  try {
    const probe = `${PREFIX}__probe__`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return false;
  } catch {
    return true;
  }
}

/** 读出草稿；只认 initial 里声明过的键，字段增删不会带进脏数据。 */
function readDraft<T extends Record<string, string>>(storageKey: string, initial: T): T | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const source = parsed as Record<string, unknown>;
    const merged = { ...initial };
    let touched = false;
    for (const name of Object.keys(initial) as Array<keyof T>) {
      const value = source[name as string];
      if (typeof value === 'string' && value !== '') {
        merged[name] = value as T[typeof name];
        touched = true;
      }
    }
    return touched ? merged : null;
  } catch {
    return null;
  }
}

export function useDraft<T extends Record<string, string>>(key: string, initial: T): DraftState<T> {
  const storageKey = `${PREFIX}${key}`;
  // 只在挂载时读一次：写成普通语句的话，每次渲染都会跑一遍 localStorage。
  const [boot] = useState(() => {
    const unavailable = storageUnavailable();
    return { unavailable, hydrated: unavailable ? null : readDraft(storageKey, initial) };
  });

  const [values, setValues] = useState<T>(boot.hydrated ?? initial);
  const [restored, setRestored] = useState(boot.hydrated !== null);
  const [blocked, setBlocked] = useState(boot.unavailable);

  const set = useCallback(
    (patch: Partial<T>) => {
      const next = { ...values, ...patch };
      setValues(next);
      try {
        const anyValue = Object.values(next).some((value) => value !== '');
        if (anyValue) {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } catch {
        // 输入照常保留在当前页面（不打断用户），但「能恢复」这个承诺当场撤回。
        setBlocked(true);
      }
    },
    [storageKey, values],
  );

  const clear = useCallback(() => {
    setValues(initial);
    setRestored(false);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      setBlocked(true);
    }
  }, [initial, storageKey]);

  return { values, set, clear, restored, blocked };
}

/** 草稿在界面上怎么说自己：一句人话，加上「这不是已保存」的边界。 */
export const DRAFT_RESTORED_HINT = '已恢复上次未提交的内容（本机暂存，尚未保存）';
export const DRAFT_BLOCKED_HINT =
  '本机不允许暂存草稿：切换页面或刷新会丢失未保存的内容（保存本身仍会正常提示成功或失败）';
