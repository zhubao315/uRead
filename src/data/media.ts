import { SITE_BASE } from '../config';
import type { MediaManifest } from '../domain/media/types';

let cached: Promise<MediaManifest | null> | null = null;

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
