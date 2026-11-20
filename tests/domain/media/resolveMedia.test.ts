/** 媒体解析：策展资产优先且必须有审核；否则回退，且键按类型前缀隔离。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generatedBookCoverSrc, mediaKey, resolveMedia } from '../../../src/domain/media/resolveMedia';
import type { MediaManifest } from '../../../src/domain/media/types';

const base: MediaManifest = { schema_version: 1, assets: {} };
const approved = {
  type: 'book' as const,
  src: 'media/books/custom.webp',
  source_type: 'licensed' as const,
  alt: '已审核封面',
  is_official_cover: true,
  is_ai_generated: false,
  review_status: 'approved' as const,
};

describe('媒体解析', () => {
  it('键带类型前缀，避免不同实体 ID 冲突', () => {
    expect(mediaKey('book', 'abc')).toBe('book:abc');
    expect(mediaKey('theme', 'abc')).toBe('theme:abc');
  });

  it('未命中清单时使用传入的 fallback', () => {
    const result = resolveMedia('book:x', '/fallback.svg', base, '书名封面');
    expect(result.src).toBe('/fallback.svg');
    expect(result.sourceType).toBe('fallback');
    expect(result.isOfficialCover).toBe(false);
  });

  it('只有 approved 资产才被采用，pending 不生效', () => {
    const pending: MediaManifest = { schema_version: 1, assets: { 'book:x': { ...approved, review_status: 'pending' } } };
    expect(resolveMedia('book:x', '/fallback.svg', pending, 'x').src).toBe('/fallback.svg');
    const approvedManifest: MediaManifest = { schema_version: 1, assets: { 'book:x': approved } };
    const result = resolveMedia('book:x', '/fallback.svg', approvedManifest, 'x');
    expect(result.src).toContain('media/books/custom.webp');
    expect(result.isOfficialCover).toBe(true);
  });

  it('生成封面路径对同一 ID 稳定', () => {
    expect(generatedBookCoverSrc('abc')).toBe(generatedBookCoverSrc('abc'));
    expect(generatedBookCoverSrc('abc')).not.toBe(generatedBookCoverSrc('abd'));
  });
});
