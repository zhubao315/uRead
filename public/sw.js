/* uRead 离线外壳。
 *
 * 策略（2026-11 修订）：
 *  - 页面导航：网络优先，断网回落到已缓存的首页壳；
 *  - /uRead/assets/ 下带 hash 的静态资源：Cache First，有限条目；
 *  - 少量目录 JSON：Stale While Revalidate，有限条目 + 体积上限；
 *  - 正文 notes.json / detail、书籍文件、音频、EPUB/PDF：一律直连，不进 Cache Storage。
 *
 * 旧版本会把 /uRead/notes/ 下所有请求（包括 22 MB 的 notes.json 和上千个 detail
 * 文件）写进缓存，且 manifest 的 ?t= 时间戳让每个请求都变成新 key。本版本通过
 * 白名单 + query 归一化 + 容量上限修复这两个问题。
 */
const SHELL_CACHE = 'uread-shell-v3';
const DATA_CACHE = 'uread-data-v3';
const ASSET_CACHE = 'uread-assets-v3';
const ALL_CACHES = [SHELL_CACHE, DATA_CACHE, ASSET_CACHE];
const SHELL = ['/uRead/', '/uRead/index.html', '/uRead/404.html'];

// 由 scripts/build-sw-precache.mjs 在构建期注入真实的首屏 JS/CSS 哈希文件。
const PRECACHE = [];

/** 只缓存这些体积可控的目录 JSON；正文与详情一律不缓存。 */
const DIRECTORY_JSON = new Set([
  '/uRead/notes/manifest.json',
  '/uRead/notes/index.json',
  '/uRead/notes/slugs.json',
  '/uRead/books/aggregate.json',
  '/uRead/media/manifest.json',
  '/uRead/lists/themes.json',
  '/uRead/lists/booklists.json',
  '/uRead/publishing/homepage.json',
  '/uRead/publishing/policy.json',
]);

const MAX_JSON_BYTES = 2 * 1024 * 1024;

/** 去掉 cache-busting 查询串，避免每次轮询都生成一个新的缓存 key。 */
function cacheKey(request) {
  const url = new URL(request.url);
  url.search = '';
  return new Request(url.toString(), { method: 'GET' });
}

async function putBounded(cacheName, request, response, maxEntries) {
  const cache = await caches.open(cacheName);
  await cache.put(cacheKey(request), response.clone());
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([...SHELL, ...PRECACHE])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('uread-') && !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // 页面导航：网络优先；断网时统一回落到缓存的首页（深链也能打开）。
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/uRead/index.html', { cacheName: SHELL_CACHE })),
    );
    return;
  }

  // 带 hash 的构建资源：一次缓存，长期复用。
  if (url.pathname.startsWith('/uRead/assets/')) {
    event.respondWith((async () => {
      // 首屏资源由构建期写进 SHELL_CACHE，后续按需资源在 ASSET_CACHE，两处都要查。
      const cached = await caches.match(cacheKey(event.request), { cacheName: SHELL_CACHE })
        || await caches.match(cacheKey(event.request), { cacheName: ASSET_CACHE });
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          event.waitUntil(putBounded(ASSET_CACHE, event.request, response, 60));
        }
        return response;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // 目录 JSON：先给缓存，后台更新；超过体积上限的响应不写入。
  if (DIRECTORY_JSON.has(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(cacheKey(event.request), { cacheName: DATA_CACHE });
      const network = fetch(event.request).then((response) => {
        const declared = Number(response.headers.get('content-length')) || 0;
        if (response.ok && declared < MAX_JSON_BYTES) {
          event.waitUntil(putBounded(DATA_CACHE, event.request, response, 24));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })());
    return;
  }

  // 其余请求（正文、详情、音频、书籍文件、EPUB/PDF）全部直连，不缓存。
});
