#!/usr/bin/env node
/**
 * 电子书分发清单只读核对（不修改任何文件、不接入 CI 门禁）。
 * 在所有者逐本批准并把 approval 改为 approved 之前，本脚本只输出报告。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(ROOT, 'book-library', 'distribution-manifest.json');
const catalogPath = path.join(ROOT, 'dist', 'books', 'catalog.json');

const readJson = async (file, fallback) => {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { return fallback; }
};

const manifest = await readJson(manifestPath, null);
const catalog = await readJson(catalogPath, []);

if (!manifest || !Array.isArray(manifest.books)) {
  console.error('缺少有效的 book-library/distribution-manifest.json');
  process.exit(1);
}

const listed = new Map(manifest.books.map((book) => [book.published_id, book]));
const live = Array.isArray(catalog) ? catalog : [];
const unlisted = live.filter((book) => !listed.has(book.id));
const pending = live.filter((book) => listed.get(book.id)?.approval === 'pending');
const approved = live.filter((book) => listed.get(book.id)?.approval === 'approved');

console.log(`发布清单核对：线上 ${live.length} 本 / 清单 ${manifest.books.length} 本`);
console.log(`  已批准 ${approved.length} / 待批准 ${pending.length} / 未列入清单 ${unlisted.length}`);
for (const book of unlisted) console.log(`  [未列入] ${book.id} ${book.source_filename}`);
for (const book of pending) console.log(`  [待批准] ${book.id} ${book.source_filename}`);

if (manifest.status !== 'APPROVED') {
  console.log('清单状态为草案，本脚本只报告、不阻断构建（等待所有者批准）。');
}
process.exitCode = 0;
