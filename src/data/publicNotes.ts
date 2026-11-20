/**
 * 公开阅读笔记的浏览器侧取数。
 *
 * 与本地优先的 IndexedDB 仓储**刻意分开**：公开笔记是构建期生成的只读产物，
 * 不进那 8 个 store（进第 9 个会破坏备份口径与「清空 8 类」的既有断言）。
 *
 * 刷新链路：每 30 秒读一次 manifest.json（带 cache:'no-store'），
 * 只有 version 变了才重新拉 notes.json。页面上有人正在读时不会被静默换掉正文——
 * 回调拿到新数据后由视图自己提示「已更新」，必要时才重渲染。
 */

import { SITE_BASE } from '../config';

export interface PublicNoteRef {
  path: string;
  sha: string;
  url: string;
}

export interface PublicNote {
  slug: string;
  title: string;
  author: string;
  category: string;
  created: string;
  updated: string;
  source: string;
  status: string;
  tags: string[];
  aliases: string[];
  body: string;
  source_ref: PublicNoteRef;
  content_hash: string;
  audio: boolean;
}

export interface NotesManifest {
  version: string;
  generated_at: string;
  note_count: number;
  audio_count: number;
  source: string;
  repo: string;
  branch: string;
  note_path: string;
}

export interface PublicNotesResult {
  available: boolean;
  notes: PublicNote[];
  manifest: NotesManifest | null;
  error: string;
}

const URLS = {
  manifest: `${SITE_BASE}notes/manifest.json`,
  notes: `${SITE_BASE}notes/notes.json`,
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return (await response.json()) as T;
}

/** 取一次完整快照。产物不存在时返回 available:false，不把「没同步过」说成「出错」。 */
export async function loadPublicNotes(): Promise<PublicNotesResult> {
  try {
    const manifest = await getJson<NotesManifest>(`${URLS.manifest}?t=${Date.now()}`);
    const notes = await getJson<PublicNote[]>(`${URLS.notes}?v=${encodeURIComponent(manifest.version)}`);
    return { available: true, notes, manifest, error: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = message.startsWith('404');
    return {
      available: false,
      notes: [],
      manifest: null,
      error: missing ? '尚未生成公开笔记' : `读取公开笔记失败：${message}`,
    };
  }
}

/**
 * 轮询 manifest。返回停止函数；组件卸载时必须调用，否则切页面仍在打网络。
 * 判据是 version 变化，不是「又拉了一次」——同一版本不回调，避免无意义的重渲染。
 */
export function watchPublicNotes(
  currentVersion: string,
  onChange: (result: PublicNotesResult) => void,
  intervalMs = 30_000,
): () => void {
  let stopped = false;
  let busy = false;
  const tick = async () => {
    if (stopped || busy) {
      return;
    }
    busy = true;
    try {
      const manifest = await getJson<NotesManifest>(`${URLS.manifest}?t=${Date.now()}`);
      if (!stopped && manifest.version !== currentVersion) {
        currentVersion = manifest.version;
        onChange(await loadPublicNotes());
      }
    } catch {
      // 轮询失败不打扰正在阅读的人；下次再试。显式刷新由用户自己点。
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      void tick();
    }
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/** 正文搜索：标题、别名、标签、正文都算，空格分词取 AND。 */
export function filterNotes(notes: PublicNote[], query: string): PublicNote[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return notes;
  }
  const haystack = (note: PublicNote) =>
    [note.title, note.author, ...note.aliases, ...note.tags, note.body].join('\n').toLowerCase();
  return notes.filter((note) => {
    const text = haystack(note);
    return words.every((word) => text.includes(word.toLowerCase()));
  });
}

export interface NoteIndexItem {
  slug: string;
  title: string;
  author: string;
  category: string;
  updated: string;
  tags: string[];
  aliases: string[];
  excerpt: string;
  audio: boolean;
  content_hash: string;
  source_path: string;
}

/** 轻量索引：首页 / 继续阅读 / 列表首屏用，避免下载整份正文。 */
export async function loadNoteIndex(): Promise<NoteIndexItem[]> {
  const response = await fetch(`${SITE_BASE}notes/index.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} notes/index.json`);
  return (await response.json()) as NoteIndexItem[];
}

/** 列表用的轻量结果：正文以摘要代替，用于标题/标签/摘要筛选，不再下载 22MB 全文。 */
export async function loadNoteIndexResult(): Promise<PublicNotesResult> {
  const manifest = await getJson<NotesManifest>(`${URLS.manifest}?t=${Date.now()}`);
  const items = await loadNoteIndex();
  const notes: PublicNote[] = items.map((item) => ({
    slug: item.slug,
    title: item.title,
    author: item.author,
    category: item.category,
    created: '',
    updated: item.updated,
    source: '',
    status: '',
    tags: item.tags,
    aliases: item.aliases,
    body: item.excerpt,
    source_ref: { path: item.source_path, sha: '', url: '' },
    content_hash: item.content_hash,
    audio: item.audio,
  }));
  return { available: true, notes, manifest, error: '' };
}

/** 单篇按需加载：slug → hash 映射只有几十 KB，正文只有当前一篇。 */
export async function loadNoteDetail(slug: string): Promise<PublicNote | null> {
  const slugs = await getJson<Record<string, string>>(`${SITE_BASE}notes/slugs.json`);
  const hash = slugs[slug];
  if (!hash) return null;
  return getJson<PublicNote>(`${SITE_BASE}notes/detail/${encodeURIComponent(hash)}.json`);
}
