#!/usr/bin/env node
/** 媒体清单校验：结构、审核态、来源标记、实体 ID 与本地路径安全。无第三方依赖。 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentNoteBodies } from './note-bodies.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));

const manifest = await readJson('media/curated-manifest.json');
const aggregate = await readJson('dist/books/aggregate.json');
const themes = await readJson('public/lists/themes.json');
const lists = await readJson('public/lists/booklists.json');
const notes = await readJson('public/notes/index.json');
const noteBodies = await currentNoteBodies(ROOT);
const wikiImages = await readJson('media/wiki-images.json', { images: {} });

const errors = [];
const fail = (message) => errors.push(message);
const TYPES = new Set(['book', 'booklist', 'theme', 'category', 'note', 'fallback']);
const STATUSES = new Set(['approved', 'pending', 'rejected']);
const SOURCES = new Set(['licensed', 'ai_generated', 'generated_svg', 'official_cover']);

if (manifest.schema_version !== 1) fail(`schema_version 应为 1，实际 ${manifest.schema_version}`);
if (!manifest.assets || typeof manifest.assets !== 'object' || Array.isArray(manifest.assets)) fail('assets 必须是对象');

const ids = {
  book: new Set(aggregate.books.map((book) => book.id)),
  booklist: new Set(lists.map((item) => item.id)),
  theme: new Set(themes.map((item) => item.id)),
  note: new Set(notes.map((note) => note.slug)),
  category: new Set(notes.map((note) => note.category).filter(Boolean)),
  fallback: new Set(['default']),
};
const seenSources = new Map();

for (const [key, asset] of Object.entries(manifest.assets ?? {})) {
  const match = /^(book|booklist|theme|category|note|fallback):(.+)$/.exec(key);
  if (!match) { fail(`键格式错误：${key}（应为 type:id）`); continue; }
  const [, type, id] = match;
  if (!TYPES.has(type)) fail(`${key}: 未知类型 ${type}`);
  if (!ids[type]?.has(id)) fail(`${key}: 实体 ID 在真实产物中不存在`);
  if (!asset || typeof asset !== 'object') { fail(`${key}: 资产必须是对象`); continue; }

  for (const field of ['src', 'alt']) {
    if (typeof asset[field] !== 'string' || !asset[field].trim()) fail(`${key}: 缺少 ${field}`);
  }
  if (!TYPES.has(asset.type)) fail(`${key}: type 不合法`);
  if (!SOURCES.has(asset.source_type)) fail(`${key}: source_type 不合法`);
  if (!STATUSES.has(asset.review_status)) fail(`${key}: review_status 不合法`);
  if (asset.review_status !== 'approved') fail(`${key}: 未经审核（${asset.review_status}）不得进入公开清单`);
  if (typeof asset.is_official_cover !== 'boolean' || typeof asset.is_ai_generated !== 'boolean') {
    fail(`${key}: is_official_cover / is_ai_generated 必须为布尔值`);
  }
  if (asset.source_type === 'ai_generated' && (!asset.is_ai_generated || asset.is_official_cover)) {
    fail(`${key}: AI 图必须标记 is_ai_generated=true 且 is_official_cover=false`);
  }
  if (asset.is_official_cover && asset.is_ai_generated) fail(`${key}: 真实封面不能同时标记为 AI 生成`);
  if (asset.is_official_cover && !asset.source_url) fail(`${key}: 真实封面必须记录 source_url`);
  if (asset.src.includes('..') || asset.src.startsWith('/')) fail(`${key}: 本地 src 必须是相对 dist 的路径`);
  if (seenSources.has(asset.src)) fail(`${key}: src 与 ${seenSources.get(asset.src)} 重复`);
  seenSources.set(asset.src, key);
}

// 正文里的 Obsidian 图片嵌入必须全部有本地映射，否则页面只能显示裸 ![[...]] 文字。
const embeds = new Set();
for (const body of noteBodies) {
  for (const match of body.matchAll(/!\[\[([^\]\n]+)\]\]/g)) {
    const target = match[1].split('|')[0].trim();
    if (target) embeds.add(target);
  }
}
for (const target of embeds) {
  if (!wikiImages.images?.[target]) fail(`正文图片 ![[${target}]] 没有 wiki-images.json 映射`);
}
for (const [target, src] of Object.entries(wikiImages.images ?? {})) {
  if (src.includes('..') || src.startsWith('/')) fail(`图片 ${target} 的 src 必须是相对 dist 的路径：${src}`);
  if (!existsSync(path.join(ROOT, 'dist', src))) fail(`图片 ${target} 的静态文件不存在：dist/${src}`);
}

if (errors.length) {
  console.error(`媒体清单校验失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`媒体清单校验通过：${Object.keys(manifest.assets).length} 项资产，实体 ID / 来源标记 / 审核态均合法`);
}
