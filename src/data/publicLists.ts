/** 主题阅读 / 书单推荐：与公开笔记同源的只读产物，不进 IndexedDB。 */
import { SITE_BASE } from '../config';

export interface ListBook {
  name: string;
  author: string;
  note: string;
  note_slug: string;
  note_title: string;
  detail: string;
}

export interface PublicList {
  id: string;
  kind: 'theme' | 'booklist';
  slug: string;
  title: string;
  description: string;
  tags: string[];
  updated: string;
  body: string;
  books: ListBook[];
  book_count: number;
  linked_notes: number;
  source_ref: { path: string; sha: string };
  content_hash: string;
}

export interface ListsManifest {
  version: string;
  theme_count: number;
  booklist_count: number;
  generated_at: string;
  source: string;
  note_path: string;
}

export interface ListsResult {
  available: boolean;
  themes: PublicList[];
  booklists: PublicList[];
  manifest: ListsManifest | null;
  error: string;
}

const URLS = {
  manifest: `${SITE_BASE}lists/manifest.json`,
  themes: `${SITE_BASE}lists/themes.json`,
  booklists: `${SITE_BASE}lists/booklists.json`,
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return (await response.json()) as T;
}

export async function loadPublicLists(): Promise<ListsResult> {
  try {
    const manifest = await getJson<ListsManifest>(`${URLS.manifest}?t=${Date.now()}`);
    const [themes, booklists] = await Promise.all([
      getJson<PublicList[]>(`${URLS.themes}?v=${manifest.version}`),
      getJson<PublicList[]>(`${URLS.booklists}?v=${manifest.version}`),
    ]);
    return { available: true, themes, booklists, manifest, error: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      available: false,
      themes: [],
      booklists: [],
      manifest: null,
      error: message.startsWith('404') ? '尚未生成主题与书单' : `读取失败：${message}`,
    };
  }
}

/** 与笔记列表一样的 30 秒版本检查；版本没变就不回调。 */
export function watchPublicLists(
  currentVersion: string,
  onChange: (result: ListsResult) => void,
  intervalMs = 30_000,
): () => void {
  let stopped = false;
  let busy = false;
  const tick = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      const manifest = await getJson<ListsManifest>(`${URLS.manifest}?t=${Date.now()}`);
      if (!stopped && manifest.version !== currentVersion) {
        currentVersion = manifest.version;
        onChange(await loadPublicLists());
      }
    } catch { /* 弱网时下次再试，不打扰读者 */ } finally { busy = false; }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  return () => { stopped = true; clearInterval(timer); };
}

export function filterLists(lists: PublicList[], query: string): PublicList[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return lists;
  return lists.filter((item) => {
    const hay = [item.title, item.description, ...item.tags,
      ...item.books.map((book) => book.name + book.author)].join('\n').toLowerCase();
    return words.every((word) => hay.includes(word.toLowerCase()));
  });
}
