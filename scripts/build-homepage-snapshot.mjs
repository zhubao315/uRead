#!/usr/bin/env node
/**
 * 生成首页专用轻量快照（dist/publishing/homepage-snapshot.json）。
 *
 * 首页只需要 6 本书 / 6 份书单 / 6 篇最新笔记 / 主题入口和几个计数，
 * 不应该为了这点内容下载 1.5 MB 笔记索引 + 361 KB 书籍聚合。
 * 本脚本在 books:index 之后运行，直接复用已生成的构建产物。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (file, fallback) => {
  try { return JSON.parse(await readFile(path.join(ROOT, file), 'utf8')); } catch { return fallback; }
};

const config = await readJson('publishing/homepage.json', {});
const noteIndex = await readJson('public/notes/index.json', []);
const themes = await readJson('public/lists/themes.json', []);
const booklists = await readJson('public/lists/booklists.json', []);
const aggregate = await readJson('dist/books/aggregate.json', { books: [], summary: {} });
const manifest = await readJson('public/notes/manifest.json', {});

const pickByIds = (items, ids, limit) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const chosen = (ids ?? []).map((id) => byId.get(id)).filter(Boolean);
  return (chosen.length ? chosen : items).slice(0, limit);
};

const featuredBooks = pickByIds(aggregate.books ?? [], config.featured_book_ids, 6)
  .map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author ?? '',
    format: book.format ?? '',
    cover: book.cover ?? '',
  }));

const featuredLists = pickByIds(
  [
    ...booklists.map((list) => ({ ...list, kind: 'booklist' })),
    ...themes.map((list) => ({ ...list, kind: 'theme' })),
  ],
  config.featured_booklist_ids,
  6,
).map(({ id, kind, title, description, book_count }) => ({ id, kind, title, description, book_count }));

const latestNotes = [...noteIndex]
  .sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''))
  .slice(0, 6)
  .map(({ slug, title, author, category, updated, excerpt, audio, content_hash }) => ({
    slug, title, author, category, updated,
    // 摘要只留 120 字：列表卡片用不到整段摘录。
    excerpt: (excerpt ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
    audio: Boolean(audio),
    content_hash,
  }));

const snapshot = {
  version: 1,
  generated_at: new Date().toISOString(),
  counts: {
    notes: manifest.note_count ?? noteIndex.length,
    audio: manifest.audio_count ?? noteIndex.filter((note) => note.audio).length,
    themes: themes.length,
    booklists: booklists.length,
  },
  featured_book_ids: (config.featured_book_ids ?? []).slice(0, 6),
  featured_books: featuredBooks,
  featured_lists: featuredLists,
  themes: themes.map(({ id, title, book_count }) => ({ id, title, book_count })),
  latest_notes: latestNotes,
};

const output = path.join(ROOT, 'dist', 'publishing', 'homepage-snapshot.json');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(
  `首页快照已生成：${featuredBooks.length} 本书 / ${featuredLists.length} 份精选 / ` +
  `${latestNotes.length} 篇最新笔记（${(JSON.stringify(snapshot).length / 1024).toFixed(1)} KB）`,
);
