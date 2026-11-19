/** 主题切换的三态规则（由 <meta name="color-scheme"> 承载，JS 只写 localStorage）。 */
export type SchemePreference = 'light dark' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

export function readPreference(raw: string | null): SchemePreference {
  return raw === 'light' || raw === 'dark' ? raw : 'light dark';
}

export function resolveScheme(preference: SchemePreference, system: ResolvedScheme): ResolvedScheme {
  return preference === 'light dark' ? system : preference;
}

/** 两点式切换：目标是「当前看到的反面」；若与系统偏好一致，回到系统（清除存储）。 */
export function nextPreference(preference: SchemePreference, system: ResolvedScheme): SchemePreference {
  const rendered = resolveScheme(preference, system);
  const target: ResolvedScheme = rendered === 'dark' ? 'light' : 'dark';
  return target === system ? 'light dark' : target;
}
