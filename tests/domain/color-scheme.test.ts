/** 主题切换：系统默认 / 显式覆盖 / 撤销覆盖三态，不能把「跟随系统」丢掉。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nextPreference, readPreference, resolveScheme } from '../../src/domain/color-scheme';

describe('color-scheme 三态', () => {
  it('未存储时跟随系统，显式值覆盖系统', () => {
    expect(readPreference(null)).toBe('light dark');
    expect(readPreference('dark')).toBe('dark');
    expect(resolveScheme('light dark', 'dark')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  it('切到与系统相反时存字面值，切回系统时清除', () => {
    expect(nextPreference('light dark', 'light')).toBe('dark');
    expect(nextPreference('dark', 'light')).toBe('light dark');
    expect(nextPreference('light dark', 'dark')).toBe('light');
    expect(nextPreference('light', 'dark')).toBe('light dark');
  });

  it('系统偏好后来变了，也不自动抹掉用户已固定的选择', () => {
    expect(readPreference('dark')).toBe('dark');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});
