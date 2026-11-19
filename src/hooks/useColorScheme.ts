import { useCallback, useEffect, useState } from 'react';
import { nextPreference, readPreference, resolveScheme, type SchemePreference } from '../domain/color-scheme';

const systemScheme = (): 'light' | 'dark' =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/** 主题状态唯一入口：<meta> 为真相，localStorage 只存显式覆盖。 */
export function useColorScheme() {
  const [preference, setPreference] = useState<SchemePreference>(() =>
    readPreference(typeof document !== 'undefined'
      ? document.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ?? null
      : null));
  const [dark, setDark] = useState(() => resolveScheme(preference, systemScheme()) === 'dark');

  const apply = useCallback((next: SchemePreference) => {
    setPreference(next);
    setDark(resolveScheme(next, systemScheme()) === 'dark');
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', next);
    try {
      if (next === 'light dark') localStorage.removeItem('color-scheme');
      else localStorage.setItem('color-scheme', next);
    } catch { /* 存储被禁用时仍生效 */ }
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'color-scheme') apply(readPreference(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [apply]);

  return { dark, apply, toggle: () => apply(nextPreference(preference, systemScheme())) };
}
