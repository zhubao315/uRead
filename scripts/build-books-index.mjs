#!/usr/bin/env node
/** 把真实笔记 + 书单聚合成静态书籍索引与详情，写入 dist/books/（不覆盖已有的书库文件）。 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBookCatalog, renderBookDetail, renderBookIndex } from './books-index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (file, fallback) => {
  try { return JSON.parse(await readFile(path.join(ROOT, file), 'utf8')); } catch { return fallback; }
};

const notes = await readJson('public/notes/notes.json', []);
const themes = await readJson('public/lists/themes.json', []);
const booklists = await readJson('public/lists/booklists.json', []);
const library = await readJson('dist/books/catalog.json', []);
const { books, summary } = buildBookCatalog(notes, [...themes, ...booklists], library);

const DIST_BOOKS = path.join(ROOT, 'dist', 'books');
await mkdir(DIST_BOOKS, { recursive: true });
await writeFile(path.join(DIST_BOOKS, 'index.html'), renderBookIndex(books, library), 'utf8');
await writeFile(path.join(DIST_BOOKS, 'aggregate.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  summary,
  books: books.map((book) => ({
    id: book.id,
    title: book.original_title,
    author: book.author,
    note_count: book.notes.length,
    list_count: book.lists.length,
    cover: book.cover,
  })),
}, null, 2), 'utf8');

for (const book of books) {
  const dir = path.join(DIST_BOOKS, book.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), renderBookDetail(book), 'utf8');
}
console.log(`书籍索引已生成：${summary.book_count} 条（书单 ${summary.from_booklist} / 笔记 ${summary.from_note}），关联笔记 ${summary.linked_notes}，未关联 ${summary.unlinked_notes}`);
