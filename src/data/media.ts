import { SITE_BASE } from '../config';
import type { MediaManifest } from '../domain/media/types';

let cached: Promise<MediaManifest | null> | null = null;

/** 笔记正文 ![[文件.jpg]] 的文件名 → 站点静态路径。 */
export type WikiImageMap = Record<string, string>;
interface WikiImagesFile { images?: Record<string, string> }
let cachedWikiImages: Promise<WikiImageMap> | null = null;

/**
 * 图片映射全站只取一次；缺失时降级为空，正文仍可读，只是图片位显示占位文字。
 * 值统一加 SITE_BASE，组件不需要知道站点部署在子路径还是根路径。
 */
export function loadWikiImages(): Promise<WikiImageMap> {
  if (!cachedWikiImages) {
    cachedWikiImages = fetch(`${SITE_BASE}media/wiki-images.json`, { cache: 'no-store' })
      .then(async (response): Promise<WikiImagesFile> => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return {};
        return await response.json() as WikiImagesFile;
      })
      .then((data): WikiImageMap => Object.fromEntries(
        Object.entries(data.images ?? {}).map(([target, src]): [string, string] => [
          target,
          /^(https?:)?\/\//.test(src) ? src : `${SITE_BASE}${src.replace(/^\/+/, '')}`,
        ]),
      ))
      .catch((): WikiImageMap => ({}));
  }
  return cachedWikiImages;
}

/** 媒体清单全站只取一次；404 或类型不对时降级为空清单，不阻塞内容渲染。 */
export function loadMediaManifest(): Promise<MediaManifest | null> {
  if (!cached) {
    cached = fetch(`${SITE_BASE}media/manifest.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
        return response.json() as Promise<MediaManifest>;
      })
      .catch(() => null);
  }
  return cached;
}
