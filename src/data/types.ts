/**
 * uRead 领域类型。
 *
 * 与共享契约 `schemas/knowledge-asset.schema.json` 对齐：
 * 知识资产（book / note / knowledge_card）具备 source_refs、relations、
 * metadata、version、status、created_at、updated_at 全部基类字段。
 *
 * BookList 是 uRead 本地的收藏集合，不属于共享知识资产类型，
 * 因此不会出现在对外导出的知识资产中（导出时以 relations 表达归属）。
 */

export type AssetType =
  | 'book'
  | 'source'
  | 'highlight'
  | 'note'
  | 'knowledge_card'
  | 'concept'
  | 'claim'
  | 'evidence'
  | 'prompt'
  | 'skill'
  | 'agent';

export type AssetStatus = 'candidate' | 'review' | 'approved' | 'published' | 'archived';

export type RelationType =
  | 'related_to'
  | 'supports'
  | 'contradicts'
  | 'depends_on'
  | 'belongs_to'
  | 'derived_from'
  | 'applied_in'
  | 'summarized_from'
  | 'located_in';

export type Credibility = 'high' | 'medium' | 'low' | 'unknown';

export type AnchorKind =
  | 'pdf_page'
  | 'epub_cfi'
  | 'text_quote'
  | 'content_anchor'
  | 'url_fragment'
  | 'char_offset'
  // 共享契约要求的行区间锚点：SAG 的检索证据就是 path + start_line + end_line，
  // 缺少它会让 uRead 无法表达来自 SAG 的引用。
  | 'line_range';

export interface Anchor {
  kind: AnchorKind;
  /** 人可读的定位描述，例如 `docs/x.md:12-18` 或 `第 12 行`。 */
  value: string;
  page?: number;
  quote?: string;
  /**
   * 结构化行区间。SAG 的检索证据就是「文件 + 起止行」，
   * 没有这两个字段时，uRead 只能解析 value 字符串才能定位原文。
   */
  start_line?: number;
  end_line?: number;
}

export interface SourceRef {
  source_id: string;
  url?: string;
  title?: string;
  publisher?: string;
  author?: string;
  published_at?: string;
  retrieved_at: string;
  source_type?:
    | 'web'
    | 'paper'
    | 'book'
    | 'official'
    | 'news'
    | 'user_input'
    // SAG 检索证据指向本地文件（vault 内的已发布资产），必须能被 uRead 表达
    | 'local_file'
    | 'other';
  credibility?: Credibility;
  content_hash: string;
  anchors?: Anchor[];
  quote?: string;
}

export interface Relation {
  type: RelationType;
  target: string;
  target_type?: AssetType;
  note?: string;
}

export interface AssetMetadata {
  origin?: 'uread' | 'uwise' | 'uprompt' | 'uAI-Core' | 'human';
  tags?: string[];
  domain?: string;
  identity?: string;
  language?: string;
  ai_generated?: boolean;
  /** 内容归属标记；缺省的老数据按 HUMAN_WRITTEN 理解，不倒推历史。 */
  provenance?: ContentProvenance;
  reviewed_by?: string;
  // 契约的共享质量指标：uWise 计算、uRead 展示与筛选，
  // 显式声明后才能类型安全读取（否则只是索引签名里的 unknown）。
  evidence_coverage?: number;
  source_diversity?: number;
  freshness_score?: number;
  next_review_at?: string;
  review_backlog?: number;
  confidence?: number;
  token_count?: number;
  [key: string]: unknown;
}

export interface BaseAsset {
  id: string;
  type: AssetType;
  title: string;
  content: string;
  source_refs: SourceRef[];
  relations: Relation[];
  metadata: AssetMetadata;
  version: string;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
  /** 软删除时间。有值即进入回收站；列表与详情默认不可见，备份仍会保留。 */
  deleted_at?: string;
  /** 由哪条图书删除级联而来；恢复图书时据此恢复其笔记与卡片。 */
  deleted_with?: string;
}

export type ReadingStatus = 'wishlist' | 'reading' | 'completed';

export interface Book extends BaseAsset {
  type: 'book';
  author?: string;
  isbn?: string;
  publisher?: string;
  publish_year?: number;
  pages?: number;
  reading_status: ReadingStatus;
  rating?: number;
  /** 原始内容（导入的 Markdown / 纯文本），用于阅读器展示。 */
  body?: string;
}

/**
 * 笔记用途。
 *
 * intent = 读之前的「现实问题 / 为什么读这本书」；
 * feynman = 读之后的「用自己的话讲清楚 + 独立质疑 + 应用验证」。
 * 两者都复用 Note 存储，不新增 IndexedDB Store，因此八类备份契约不变。
 */
export type NoteKind = 'highlight' | 'note' | 'summary' | 'intent' | 'feynman';

/** 内容归属：AI 可以参考，但不能冒充人的理解。 */
export type ContentProvenance = 'HUMAN_WRITTEN' | 'AI_GENERATED' | 'AI_ASSISTED' | 'HUMAN_VERIFIED';

export interface Note extends BaseAsset {
  type: 'note';
  book_id?: string;
  note_kind: NoteKind;
  anchors: Anchor[];
  color?: string;
}

export type CardType = 'concept' | 'fact' | 'quote' | 'idea'
  | 'insight' | 'principle' | 'method' | 'evidence' | 'question';

/** 六类知识卡片与人工核验（0.17.0 起）；旧卡片没有这些字段，全部可选，备份格式不变。 */
export type KnowledgeType = 'fact' | 'insight' | 'principle' | 'method' | 'evidence' | 'question';
export type KnowledgeReviewStatus = 'suggestion' | 'reviewed' | 'rejected';

export interface KnowledgeCard extends BaseAsset {
  type: 'knowledge_card';
  book_id?: string;
  card_type: CardType;
  knowledge_type?: KnowledgeType;
  review_status?: KnowledgeReviewStatus;
  evidence_refs?: string[];
  confidence?: number;
  definition?: string;
  importance?: 'low' | 'medium' | 'high';
  reviewed: boolean;
}

export interface Highlight extends BaseAsset {
  type: 'highlight';
  book_id: string;
  anchors: Anchor[];
  color?: string;
}

export interface Annotation extends BaseAsset {
  type: 'highlight';
  book_id: string;
  anchor: Anchor;
  body: string;
}

export interface ReadingSession extends BaseAsset {
  type: 'note';
  book_id: string;
  started_at: string;
  ended_at?: string;
  progress: number;
}

export interface KnowledgeRelation {
  id: string;
  type: RelationType;
  source_id: string;
  target_id: string;
  note?: string;
  created_at: string;
}

/** uRead 本地收藏集合，不导出为共享知识资产。 */
export interface BookList {
  id: string;
  title: string;
  description?: string;
  type: 'personal' | 'curated' | 'shared';
  book_ids: string[];
  tags: string[];
  version: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface LibrarySnapshot {
  books: Book[];
  notes: Note[];
  knowledge_cards: KnowledgeCard[];
  booklists: BookList[];
  /**
   * v2 起补齐的四类。刻意全部可选：v1 备份文件里没有这些键，
   * 导入时必须**点名**它们缺失，而不是静默当成空集合——
   * 否则用户以为「导入成功=全部回来」，实际阅读记录与关系已永久丢失。
   */
  reading_sessions?: ReadingSession[];
  highlights?: Highlight[];
  annotations?: Annotation[];
  knowledge_relations?: KnowledgeRelation[];
}

export interface ExportBundle {
  format: 'uread-library';
  version: number;
  exported_at: string;
  data: LibrarySnapshot;
}
