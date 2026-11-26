#!/usr/bin/env node
/**
 * 把 Obsidian 读书笔记里已有的豆瓣封面同步为 uRead 书籍配图。
 *
 * 只按笔记正文中的 ![[<stem>.jpg]] 精确映射，不做书名相似度匹配：
 * 同一本书在书单中聚合出多条记录时复用同一张封面，缺少封面的书保留 SVG 主题视觉。
 *
 * 产物：
 * - public/media/books/<bookId>.jpg   随 Vite 构建进入 dist/media/books/
 * - media/book-covers.json            静态书页的 book id → 图片路径映射
 * - media/curated-manifest.json       浏览器侧 BookCover 组件的已审核资产
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBookCatalog } from './books-index.mjs';
import { currentNoteBodies } from './note-bodies.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE = path.resolve(
  ROOT, '..', 'obsidian-vault', '07-SOURCES', '71-书籍', 'assets', 'covers',
);

const args = process.argv.slice(2);
const flagValue = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const dryRun = args.includes('--dry-run');
const sourceDir = path.resolve(flagValue('--from') || DEFAULT_SOURCE);

if (!existsSync(sourceDir)) {
  if (flagValue('--from')) {
    console.error(`封面源目录不存在：${sourceDir}`);
    process.exit(1);
  }
  console.log(`未找到默认封面源 ${sourceDir}，跳过同步（保留现有 mapping；用 --from <dir> 指定）`);
  process.exit(0);
}

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));
  } catch {
    return fallback;
  }
};

const notes = await readJson('public/notes/notes.json', []);
const themes = await readJson('public/lists/themes.json', []);
const booklists = await readJson('public/lists/booklists.json', []);
const library = await readJson('dist/books/catalog.json', []);
const { books } = buildBookCatalog(notes, [...themes, ...booklists], library);
const notesBySlug = new Map(notes.map((note) => [note.slug, note]));
const manifest = await readJson('media/curated-manifest.json', { schema_version: 1, assets: {} });

const destDir = path.join(ROOT, 'public', 'media', 'books');
const covers = {};
let copied = 0;
let skipped = 0;

for (const book of books) {
  let picked = null;
  for (const reference of book.notes) {
    const note = notesBySlug.get(reference.slug);
    if (!note) continue;
    const body = String(note.body ?? '');
    const match = /!\[\[([^\]]+\.jpg)\]\]/.exec(body);
    if (!match) continue;
    const stem = match[1];
    if (!existsSync(path.join(sourceDir, stem))) continue;
    picked = {
      stem,
      douban: /https?:\/\/book\.douban\.com\/subject\/\d+\/?/.exec(body)?.[0] ?? '',
    };
    break;
  }
  if (!picked) {
    skipped += 1;
    continue;
  }

  const src = `media/books/${encodeURIComponent(book.id)}.jpg`;
  covers[book.id] = { src, stem: picked.stem, douban: picked.douban };
  manifest.assets[`book:${book.id}`] = {
    type: 'book',
    src,
    source_type: 'official_cover',
    source_url: picked.douban,
    attribution: 'Obsidian 读书笔记 · 豆瓣读书条目封面',
    alt: `${book.original_title}${book.author ? ` · ${book.author}` : ''} 封面`,
    is_official_cover: true,
    is_ai_generated: false,
    review_status: 'approved',
  };

  if (!dryRun) {
    await mkdir(destDir, { recursive: true });
    await copyFile(path.join(sourceDir, picked.stem), path.join(destDir, `${book.id}.jpg`));
    copied += 1;
  }
}

// 正文里所有 ![[图片]] 都必须落到本地静态路径，否则页面会把标记语法当文字显示。
const stemToSrc = new Map(Object.values(covers).map((cover) => [cover.stem, cover.src]));
const wikiImages = {};
const unresolved = new Set();
const embedDir = path.join(ROOT, 'public', 'media', 'embeds');
for (const body of await currentNoteBodies(ROOT)) {
  for (const match of body.matchAll(/!\[\[([^\]\n]+)\]\]/g)) {
    const target = match[1].split('|')[0].trim();
    if (!target) continue;
    const known = stemToSrc.get(target);
    if (known) {
      wikiImages[target] = known;
      continue;
    }
    if (existsSync(path.join(sourceDir, target))) {
      wikiImages[target] = `media/embeds/${encodeURIComponent(target)}`;
      if (!dryRun) {
        await mkdir(embedDir, { recursive: true });
        await copyFile(path.join(sourceDir, target), path.join(embedDir, target));
      }
      continue;
    }
    unresolved.add(target);
  }
}
if (unresolved.size) {
  console.error(`以下正文图片找不到本地资源，请先补图或修正笔记（最多列 10 条）：`);
  for (const target of [...unresolved].slice(0, 10)) console.error(`  ![[${target}]]`);
  process.exit(1);
}

// 列表页按 slug 取封面：标题可能与 wikilink stem 不一致，必须以正文里的图片名为准。
const noteCovers = {};
for (const note of notes) {
  const match = /!\[\[([^\]\n]+)\]\]/.exec(String(note.body ?? ''));
  if (!match) continue;
  const target = match[1].split('|')[0].trim();
  if (wikiImages[target]) noteCovers[note.slug] = wikiImages[target];
}

if (!dryRun) {
  await writeFile(
    path.join(ROOT, 'media', 'wiki-images.json'),
    `${JSON.stringify({
      note: '笔记正文 ![[文件.jpg]] 的文件名 → 本地静态路径（相对 dist）。缺失的图片会让构建校验失败。',
      images: wikiImages,
    }, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(ROOT, 'media', 'note-covers.json'),
    `${JSON.stringify({
      note: '笔记 slug → 正文图片封面路径（相对 dist）。按正文 wikilink 精确映射，不按标题猜测。',
      covers: noteCovers,
    }, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(ROOT, 'media', 'book-covers.json'),
    `${JSON.stringify({
      note: '笔记正文 ![[…jpg]] 与书籍 ID 的精确映射；没有对应笔记封面的书仍使用 dist/media/books/<id>.svg。',
      source: 'obsidian-vault/07-SOURCES/71-书籍/assets/covers',
      covers,
    }, null, 2)}\n`,
    'utf8',
  );
  manifest.note = '经审核的书籍封面：来自 Obsidian 读书笔记中已核验的豆瓣条目封面，按笔记正文 wikilink 精确对应书籍 ID；无封面的书继续使用确定性 SVG 主题视觉。';
  await writeFile(
    path.join(ROOT, 'media', 'curated-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

console.log(
  `${dryRun ? 'DRY' : '已同步'}：${Object.keys(covers).length} 本书有真实封面（复制 ${copied} 张，${skipped} 本保留 SVG 主题视觉）`,
);
console.log(`正文图片映射：${Object.keys(wikiImages).length} 项（笔记封面 ${Object.keys(noteCovers).length} 篇）`);
console.log(`封面源：${sourceDir}`);
