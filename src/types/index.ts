/**
 * 类型出口。
 *
 * 业务领域类型统一放在 `src/data/types.ts`（与共享契约对齐），
 * 这里只做向后兼容的再导出，并保留 API 响应包装类型。
 */

export type {
  Anchor,
  AnchorKind,
  AssetMetadata,
  AssetStatus,
  AssetType,
  BaseAsset,
  Book,
  BookList,
  CardType,
  Credibility,
  ExportBundle,
  Highlight,
  KnowledgeCard,
  KnowledgeRelation,
  LibrarySnapshot,
  Note,
  NoteKind,
  ReadingSession,
  ReadingStatus,
  Relation,
  RelationType,
  SourceRef,
} from '../data/types';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages?: number;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}
