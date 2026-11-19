/**
 * 发布治理闸门：默认拒绝、deny 优先、敏感检查不泄露正文、音频跟随正文权限。
 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { audioOrphans, evaluate, isNoteAllowed, scanSensitive } from '../../scripts/publish-policy.mjs';

const note = (slug: string, extra: Record<string, unknown> = {}) => ({
  slug, title: slug, body: '一段普通正文', tags: [], category: 'B1-文学虚构', ...extra,
});
const policy = {
  version: 1,
  mode: 'allowlist',
  allow: ['a'],
  deny: ['b'],
  category_allow: [],
  tag_deny: ['私密'],
  sensitive_patterns: [{ name: '令牌', pattern: 'sk-[A-Za-z0-9]{6,}' }],
};

describe('发布权限', () => {
  it('allowlist 模式下默认拒绝，只有显式授权或分类授权才通过', () => {
    expect(isNoteAllowed(note('a'), policy)).toBe(true);
    expect(isNoteAllowed(note('c'), policy)).toBe(false);
    expect(isNoteAllowed(note('c', { category: 'B1-文学虚构' }), { ...policy, category_allow: ['B1-文学虚构'] })).toBe(true);
  });

  it('deny 与 tag_deny 永远优先于 allow', () => {
    expect(isNoteAllowed(note('b'), { ...policy, allow: ['b'] })).toBe(false);
    expect(isNoteAllowed(note('a', { tags: ['私密'] }), policy)).toBe(false);
  });

  it('敏感检查只回规则名与位置，不把正文写进报告', () => {
    const hit = scanSensitive(note('a', { body: '密钥 sk-abcdef123456 在这里' }), policy);
    expect(hit).toHaveLength(1);
    expect(hit[0].rule).toBe('令牌');
    expect(JSON.stringify(hit)).not.toContain('abcdef123456');
  });

  it('评测结果的 allowed/blocked 互斥；孤儿音频按正文权限判定', () => {
    const result = evaluate([note('a'), note('b'), note('c')], policy);
    expect(result.allowed).toEqual(['a']);
    expect(result.blocked.map((item) => item.slug)).toEqual(['b', 'c']);
    expect(audioOrphans(['hash1', 'hash2'], ['a'], { hash1: 'a', hash2: 'b' })).toEqual(['hash2']);
    expect(audioOrphans(['unknown'], result.allowed, {})).toEqual(['unknown']);
  });
});
