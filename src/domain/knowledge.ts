/**
 * 知识卡片的六种类型与人工核验流水线（纯领域模块）。
 *
 * 铁律：AI 生成的卡片先进入 suggestion 候选区；
 * **未经人工确认，不能成为已核验知识**，也不能没有证据引用。
 * 旧类型 concept/quote/idea 保留兼容，读取时归一到新六类。
 */

export const KNOWLEDGE_TYPES = ['fact', 'insight', 'principle', 'method', 'evidence', 'question'] as const;
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];
export type ReviewStatus = 'suggestion' | 'reviewed' | 'rejected';

export interface KnowledgeDraft {
  title: string;
  content: string;
  knowledge_type: KnowledgeType;
  evidence_refs: string[];
  source_ids: string[];
  confidence?: number;
  review_status: ReviewStatus;
  review_note?: string;
  created_at: string;
}

const LEGACY: Record<string, KnowledgeType> = {
  concept: 'insight',
  idea: 'insight',
  quote: 'evidence',
  fact: 'fact',
};

export function normalizeKnowledgeType(input: string): KnowledgeType {
  if ((KNOWLEDGE_TYPES as readonly string[]).includes(input)) return input as KnowledgeType;
  return LEGACY[input] ?? 'insight';
}

/** 发布资格：人工已确认 + 有证据 + 有正文。三者缺一不可。 */
export function canPublish(draft: KnowledgeDraft): boolean {
  return draft.review_status === 'reviewed'
    && draft.evidence_refs.length > 0
    && draft.content.trim().length > 0;
}

export function createSuggestion(input: {
  title: string;
  content: string;
  knowledge_type: string;
  evidence_refs?: string[];
  source_ids?: string[];
  confidence?: number;
  created_at?: string;
}): KnowledgeDraft {
  return {
    title: input.title.trim(),
    content: input.content.trim(),
    knowledge_type: normalizeKnowledgeType(input.knowledge_type),
    evidence_refs: [...new Set(input.evidence_refs ?? [])],
    source_ids: [...new Set(input.source_ids ?? [])],
    confidence: input.confidence,
    review_status: 'suggestion',
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

/** 人工决定：接受 / 编辑后接受 / 拒绝。拒绝后不能靠 canPublish 溜进知识库。 */
export function reviewSuggestion(
  draft: KnowledgeDraft,
  decision: { accept: boolean; note?: string; edits?: Partial<Pick<KnowledgeDraft, 'title' | 'content' | 'knowledge_type'>> },
): KnowledgeDraft {
  if (!decision.accept) return { ...draft, review_status: 'rejected', review_note: decision.note };
  return {
    ...draft,
    ...decision.edits,
    knowledge_type: decision.edits?.knowledge_type
      ? normalizeKnowledgeType(decision.edits.knowledge_type)
      : draft.knowledge_type,
    review_status: 'reviewed',
    review_note: decision.note,
  };
}
