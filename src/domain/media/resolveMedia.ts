import { SITE_BASE } from '../../config';
import type { MediaManifest, ResolvedMedia } from './types';

/** 键格式统一为 `type:id`，避免不同实体的 ID 冲突。 */
export const mediaKey = (type: string, id: string): string => `${type}:${id}`;

/** 确定性 SVG 主题视觉的静态路径；同一书籍 ID 永远得到同一张图。 */
export const generatedBookCoverSrc = (id: string): string =>
  `${SITE_BASE}media/books/${encodeURIComponent(id)}.svg`;

/** 真实电子书封面的静态路径（来自 EPUB 内嵌封面）。 */
export const realBookCoverSrc = (cover: string): string =>
  `${SITE_BASE}books/${cover}`;

/**
 * 解析优先级：已审核的策展资产 → 调用方传入的 fallback（真实封面 / 生成 SVG）。
 * 只有 `review_status === 'approved'` 的资产才会被采用；图片失效由组件层一次性回退。
 */
export function resolveMedia(
  key: string,
  fallbackSrc: string,
  manifest: MediaManifest | null,
  alt: string,
): ResolvedMedia {
  const asset = manifest?.assets?.[key];
  if (asset && asset.review_status === 'approved' && asset.src) {
    const src = /^(https?:)?\/\//.test(asset.src)
      ? asset.src
      : asset.src.startsWith('/')
        ? asset.src
        : `${SITE_BASE}${asset.src}`;
    return {
      src,
      alt: asset.alt || alt,
      isOfficialCover: asset.is_official_cover,
      sourceType: asset.source_type,
    };
  }
  return { src: fallbackSrc, alt, isOfficialCover: false, sourceType: 'fallback' };
}
