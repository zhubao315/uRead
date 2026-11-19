#!/usr/bin/env node
/**
 * GitHub Pages 深链回退：给每个前端路由放一份 index.html。
 *
 * 为什么必须要它：Pages 不像 Netlify 支持 rewrite。直接打开 /uRead/read 时
 * 它只找得到 404.html（HTTP 404），客户端路由根本没有机会执行。
 * 404.html 继续留给真正不存在的地址；已知路由必须有真实的 200 页面。
 *
 * 笔记详情有 1634 条，每条一个 index.html（约 842 B，合计 ~1.4 MB）——
 * 这是静态站上让「分享一篇笔记的链接」真正可打开的代价，值得付。
 */

import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');
const NOTES = path.join(ROOT, 'public', 'notes', 'notes.json');

const STATIC_ROUTES = ['library', 'notes', 'booklists', 'cards', 'search', 'find', 'read', 'reader', 'workspace', 'workspace/booklists', 'themes', 'lists'];

await readFile(INDEX);
const notes = JSON.parse(await readFile(NOTES, 'utf8'));
const readJson = async (name) => {
  try {
    return JSON.parse(await readFile(path.join(ROOT, 'public', 'lists', name), 'utf8'));
  } catch {
    return [];
  }
};
const [themes, booklists] = await Promise.all([readJson('themes.json'), readJson('booklists.json')]);
const targets = [
  ...STATIC_ROUTES,
  ...notes.map((note) => `read/${note.slug}`),
  ...themes.map((item) => `themes/${item.id}`),
  ...themes.map((item) => `booklists/${item.id}`),
  ...booklists.map((item) => `lists/${item.id}`),
  ...booklists.map((item) => `booklists/${item.id}`),
];
for (const route of targets) {
  const dir = path.join(DIST, route);
  await mkdir(dir, { recursive: true });
  await copyFile(INDEX, path.join(dir, 'index.html'));
}
console.log(`深链回退已生成：${targets.length} 条路由（${STATIC_ROUTES.length} 个页面 + ${notes.length} 篇笔记 + ${themes.length + booklists.length} 份栏目）`);
