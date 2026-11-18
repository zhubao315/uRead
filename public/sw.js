/* uRead 离线外壳：只缓存「壳 + 目录 JSON」，不缓存 115 MB 音频与 62 MB 书。 */
const CACHE = 'uread-shell-v1';
const SHELL = ['/uRead/', '/uRead/index.html', '/uRead/404.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先；断网时统一回落到缓存的主页（深链也能打开）。
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/uRead/index.html')),
    );
    return;
  }

  // 目录与书单：先给缓存，后台再更新；体积小的 JSON 才值得缓存。
  if (url.pathname.startsWith('/uRead/notes/') || url.pathname.startsWith('/uRead/books/catalog.json')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request).then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        }).catch(() => cached);
        return cached || network;
      }),
    );
  }
  // 音频 / EPUB / PDF 一律直连，避免把大文件塞进 Cache Storage。
});
