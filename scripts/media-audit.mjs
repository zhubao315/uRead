#!/usr/bin/env node
/** 媒体覆盖审计：从真实产物统计各实体配图覆盖率、生成封面数与清单缺失项。 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));
const aggregate = await readJson('dist/books/aggregate.json');
const themes = await readJson('public/lists/themes.json');
const lists = await readJson('public/lists/booklists.json');
const notes = await readJson('public/notes/index.json');
const manifest = await readJson('media/curated-manifest.json');

const assets = manifest.assets ?? {};
const countFor = (type) => Object.keys(assets).filter((key) => key.startsWith(`${type}:`)).length;

const group = (type, total) => ({
  total,
  curated: countFor(type),
  coverage: total ? `${((countFor(type) / total) * 100).toFixed(1)}%` : 'n/a',
});

const generatedDir = path.join(ROOT, 'dist', 'media', 'books');
let generated = 0;
let generatedBytes = 0;
try {
  for (const file of await readdir(generatedDir)) {
    if (!file.endsWith('.svg')) continue;
    generated += 1;
    generatedBytes += (await stat(path.join(generatedDir, file))).size;
  }
} catch { /* 尚未运行 media:build */ }

const realCovers = aggregate.books.filter((book) => book.cover).length;
const report = {
  schema_version: manifest.schema_version,
  entities: {
    book: group('book', aggregate.books.length),
    booklist: group('booklist', lists.length),
    theme: group('theme', themes.length),
    category: group('category', new Set(notes.map((note) => note.category).filter(Boolean)).size),
    note: group('note', notes.length),
  },
  generated_svg_covers: generated,
  generated_svg_kb: Math.round(generatedBytes / 1024),
  real_epub_covers_in_aggregate: realCovers,
  pending_review: Object.values(assets).filter((asset) => asset.review_status !== 'approved').length,
};
console.log(JSON.stringify(report, null, 2));
