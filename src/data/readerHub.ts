/**
 * 阅读入口：把「公开笔记的可听篇目」与「静态书库的书」汇成一个只读列表。
 * 只读取已生成的公开产物，不写 IndexedDB、不增加第 9 个 store。
 */
import { SITE_BASE } from '../config';
import { loadPublicNotes, type PublicNote } from './publicNotes';

export interface ReaderBook {
  id: string;
  title: string;
  author: string;
  format: string;
  path: string;
  cover: string;
}

export interface ReaderSource {
  kind: 'note' | 'book';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  progressKey: string;
}

export interface ReaderHubResult {
  available: boolean;
  sources: ReaderSource[];
  notes: number;
  books: number;
  error: string;
}

export const noteAudioKey = (note: PublicNote) => `uread:audio:${note.content_hash}`;
export const bookProgressKey = (id: string) => `uread:book:${id}`;

export async function loadReaderHub(): Promise<ReaderHubResult> {
  const [notesResult, booksResponse] = await Promise.all([
    loadPublicNotes(),
    fetch(`${SITE_BASE}books/catalog.json`, { cache: 'no-store' }).catch(() => null),
  ]);
  const books: ReaderBook[] = booksResponse?.ok ? await booksResponse.json() : [];
  const noteSources: ReaderSource[] = notesResult.notes
    .filter((note) => note.audio)
    .map((note) => ({
      kind: 'note',
      id: note.slug,
      title: note.title,
      subtitle: `${note.category || '未分类'} · 可听`,
      href: `/read/${encodeURIComponent(note.slug)}`,
      progressKey: noteAudioKey(note),
    }));
  const bookSources: ReaderSource[] = books.map((book) => ({
    kind: 'book',
    id: book.id,
    title: book.title,
    subtitle: `${book.author || '作者未标注'} · ${book.format.toUpperCase()}`,
    href: `${SITE_BASE}books/reader.html?id=${encodeURIComponent(book.id)}`,
    progressKey: bookProgressKey(book.id),
  }));
  return {
    available: notesResult.available || books.length > 0,
    sources: [...noteSources, ...bookSources],
    notes: noteSources.length,
    books: bookSources.length,
    error: notesResult.available ? '' : notesResult.error,
  };
}

/** 继续阅读排在最前：有本机进度且不是 0 的优先，其余保持原顺序。 */
export function withProgress(sources: ReaderSource[], read: (key: string) => number): ReaderSource[] {
  return [...sources].sort((a, b) => {
    const pa = read(a.progressKey);
    const pb = read(b.progressKey);
    return (pb > 0 ? pb : 0) - (pa > 0 ? pa : 0);
  });
}
