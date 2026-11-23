#!/usr/bin/env node
/**
 * 把 Vite 真正产出的首屏 JS/CSS 注入 public/sw.js 的构建副本。
 *
 * 只预缓存 index.html 里以 <script type="module"> / modulepreload / stylesheet
 * 引用的资源——它们才是启动应用外壳所必需的。路由懒加载 chunk、正文、音频、
 * EPUB/PDF 都不进预缓存清单，避免离线包无限膨胀。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const swPath = path.join(DIST, 'sw.js');

const configSource = await readFile(path.join(ROOT, 'src/config.ts'), 'utf8');
const slug = /SITE_SLUG\s*=\s*'([^']+)'/.exec(configSource)?.[1] ?? 'uRead';
const base = `/${slug}/`;

const html = await readFile(path.join(DIST, 'index.html'), 'utf8');
const tags = [...html.matchAll(/<(script|link)\b[^>]*>/g)].map((match) => match[0]);
const resources = new Set();
for (const tag of tags) {
  const isEntry = /<script\b/.test(tag) && /type=["']module["']/.test(tag);
  const isPreload = /<link\b/.test(tag) && /rel=["']modulepreload["']/.test(tag);
  const isStyle = /<link\b/.test(tag) && /rel=["']stylesheet["']/.test(tag);
  if (!isEntry && !isPreload && !isStyle) continue;
  const url = /(?:src|href)=["']([^"']+)["']/.exec(tag)?.[1];
  if (url?.startsWith(base)) resources.add(url);
}

const sw = await readFile(swPath, 'utf8');
const marker = /const PRECACHE = \[[^\]]*\];/;
if (!marker.test(sw)) {
  console.error('sw.js 中找不到 PRECACHE 占位符，无法注入预缓存清单');
  process.exit(1);
}
const list = [...resources].sort();
const replacement = `const PRECACHE = ${JSON.stringify(list, null, 2)};`;
await writeFile(swPath, sw.replace(marker, replacement), 'utf8');
console.log(`Service Worker 预缓存已注入：${list.length} 个首屏资源`);
for (const item of list) console.log(`  ${item}`);
