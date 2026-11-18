/**
 * 列表内联搜索与防抖。
 *
 * 之前导航栏放着一个搜索图标，但整个应用**没有搜索功能**——这是最伤信任的一类
 * 「易用性」问题：界面上给了 affordance，点下去什么也不会发生。
 * 这里补上真正可用的过滤，并让导航栏的搜索框与列表页共享同一个 `?q=` 参数。
 */
import { useEffect, useState } from 'react';

/** 输入停顿多久才开始过滤（毫秒）。本地数据量大时避免每次按键都重排列表。 */
export const SEARCH_DEBOUNCE_MS = 200;

/**
 * 把输入值延迟到用户停手后才生效。
 *
 * 不做防抖的话，每敲一个字都要重排一次列表，输入焦点与滚动位置都会抖；
 * 但延迟也不能长，否则用户会以为搜索没反应，于是再敲一遍。
 */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    if (value === settled) {
      return;
    }
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, settled]);

  return settled;
}

/**
 * 多词 AND 匹配（不区分大小写）。
 *
 * 「认知 卡片」应当命中同时包含两个词的条目；空查询返回 true，
 * 让调用方不需要为「没输入」写分支。
 */
export function matchesQuery(query: string, fields: Array<string | undefined | null>): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = fields
    .filter((field): field is string => Boolean(field))
    .join('\n')
    .toLowerCase();
  return needle.split(/\s+/).every((term) => haystack.includes(term));
}

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

/** 带可访问名称的搜索框；Esc 清空，便于键盘用户退出过滤。 */
export const SearchBox = ({
  value,
  onChange,
  placeholder = '搜索标题、正文、标签…',
  label = '搜索当前列表',
}: SearchBoxProps) => (
  <div className="relative">
    <label htmlFor="uread-search" className="sr-only">
      {label}
    </label>
    <input
      id="uread-search"
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onChange('');
        }
      }}
      placeholder={placeholder}
      aria-label={label}
      className="w-full sm:w-80 px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter bg-white"
    />
  </div>
);
