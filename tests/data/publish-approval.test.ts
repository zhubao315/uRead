/** 发布审批：require_approval 必须真的阻断，且只比较 slug/hash，不含正文。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { approvalBlocked, diffAgainstBaseline } from '../../scripts/publish-policy.mjs';

const note = (slug: string, hash = 'h1') => ({
  slug,
  title: slug,
  body: '正文不进入报告',
  content_hash: hash,
  source_ref: { path: `books/${slug}.md` },
});
const policy = (require_approval: boolean) => ({ version: 1, mode: 'allow_all_legacy', require_approval });
const baseline = {
  version: 1,
  approved_at: '2026-11-20T00:00:00Z',
  scope: 'x',
  note_count: 1,
  notes: [{ slug: 'a', content_hash: 'h1', source_path: 'books/a.md' }],
  audio: {},
};

describe('发布审批基线', () => {
  it('无变化时不阻断', () => {
    const diff = diffAgainstBaseline([note('a')], baseline);
    expect(diff).toEqual({ added: [], modified: [], removed: [] });
    expect(approvalBlocked(policy(true), diff)).toBe(false);
  });

  it('新增 / 修改 / 删除分别识别', () => {
    expect(diffAgainstBaseline([note('a'), note('b')], baseline).added.map((x) => x.slug)).toEqual(['b']);
    expect(diffAgainstBaseline([note('a', 'h2')], baseline).modified.map((x) => x.slug)).toEqual(['a']);
    expect(diffAgainstBaseline([], baseline).removed.map((x) => x.slug)).toEqual(['a']);
  });

  it('require_approval=true 时有任何未批准变更即阻断', () => {
    expect(approvalBlocked(policy(true), diffAgainstBaseline([note('a'), note('b')], baseline))).toBe(true);
  });

  it('require_approval=false 时不阻断，报告不含正文', () => {
    const diff = diffAgainstBaseline([note('a'), note('b')], baseline);
    expect(approvalBlocked(policy(false), diff)).toBe(false);
    expect(JSON.stringify(diff)).not.toContain('正文不进入报告');
  });
});
