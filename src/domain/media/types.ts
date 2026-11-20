/** 媒体资产类型：与 media/manifest.schema.json 一一对应。 */

export type MediaType = 'book' | 'booklist' | 'theme' | 'category' | 'note' | 'fallback';
export type MediaSourceType = 'licensed' | 'ai_generated' | 'generated_svg' | 'official_cover';
export type ReviewStatus = 'approved' | 'pending' | 'rejected';

export interface MediaAsset {
  type: MediaType;
  src: string;
  source_type: MediaSourceType;
  source_url?: string;
  license?: string;
  attribution?: string;
  alt: string;
  is_official_cover: boolean;
  is_ai_generated: boolean;
  review_status: ReviewStatus;
}

export interface MediaManifest {
  schema_version: number;
  note?: string;
  assets: Record<string, MediaAsset>;
}

/** 解析结果：src 已处理子路径；fallback 表示未命中策展资产。 */
export interface ResolvedMedia {
  src: string;
  alt: string;
  isOfficialCover: boolean;
  sourceType: MediaSourceType | 'fallback';
}
