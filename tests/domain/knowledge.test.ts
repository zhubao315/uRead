/** 六种知识卡片与人工核验：AI 候选不能自动成为已核验知识。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { canPublish, createSuggestion, KNOWLEDGE_TYPES, normalizeKnowledgeType, reviewSuggestion } from '../../src/domain/knowledge';

const input = {
  title: '黑暗森林法则',
  content: '文明无法确认彼此善意时，先发制人是理性选择。',
  knowledge_type: 'insight',
  evidence_refs: ['book-1#line-42'],
  source_ids: ['book-1'],
  confidence: 0.7,
};

describe('六种知识类型', () => {
  it('新六类齐全，旧类型映射到对应新类型', () => {
    expect(KNOWLEDGE_TYPES).toEqual(['fact', 'insight', 'principle', 'method', 'evidence', 'question']);
    expect(normalizeKnowledgeType('concept')).toBe('insight');
    expect(normalizeKnowledgeType('quote')).toBe('evidence');
    expect(normalizeKnowledgeType('idea')).toBe('insight');
    expect(normalizeKnowledgeType('不认识')).toBe('insight');
  });
});

describe('人工核验流水线', () => {
  it('新建卡片一律是 suggestion，且不能发布', () => {
    const draft = createSuggestion(input);
    expect(draft.review_status).toBe('suggestion');
    expect(canPublish(draft)).toBe(false);
  });

  it('接受后才可发布；拒绝后即使有证据也不能发布', () => {
    const draft = createSuggestion(input);
    expect(canPublish(reviewSuggestion(draft, { accept: true }))).toBe(true);
    expect(canPublish(reviewSuggestion(draft, { accept: false, note: '证据不足' }))).toBe(false);
  });

  it('没有证据引用，接受也不能发布', () => {
    const draft = createSuggestion({ ...input, evidence_refs: [] });
    expect(canPublish(reviewSuggestion(draft, { accept: true }))).toBe(false);
  });

  it('编辑后接受可以改标题与类型，类型仍归一化', () => {
    const reviewed = reviewSuggestion(createSuggestion(input), {
      accept: true, edits: { title: '  修正标题  ', knowledge_type: 'principle' }, note: '已核对原文',
    });
    expect(reviewed.title).toBe('  修正标题  ');
    expect(reviewed.knowledge_type).toBe('principle');
    expect(reviewed.review_status).toBe('reviewed');
    expect(canPublish(reviewed)).toBe(true);
  });
});
