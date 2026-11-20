#!/usr/bin/env node
/** 生成静态发现文件：sitemap.xml / rss.xml / robots.txt。只收录真实公开内容。 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://zhubao315.github.io/uRead/';
const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));
const notes = await readJson('public/notes/index.json');
const themes = await readJson('public/lists/themes.json');
const lists = await readJson('public/lists/booklists.json');
const books = (await readJson('dist/books/aggregate.json')).books;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const urls = [
  '', 'read', 'booklists', 'find', 'reader', 'workspace', 'docs/',
  ...notes.map((n) => `read/${encodeURIComponent(n.slug)}`),
  ...themes.map((t) => `themes/${t.id}`),
  ...lists.map((l) => `lists/${l.id}`),
  ...books.map((b) => `books/${b.id}`),
  'books/',
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>\n`;

const latest = [...notes].sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 30);
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>uRead 最新读书笔记</title><link>${SITE}</link><description>个人阅读档案与知识沉淀</description>
${latest.map((n) => `  <item><title>${esc(n.title)}</title><link>${SITE}read/${encodeURIComponent(n.slug)}</link><description>${esc(n.excerpt || '')}</description></item>`).join('\n')}
</channel></rss>\n`;

const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`;
await mkdir(path.join(ROOT, 'dist'), { recursive: true });
await writeFile(path.join(ROOT, 'dist/sitemap.xml'), sitemap, 'utf8');
await writeFile(path.join(ROOT, 'dist/rss.xml'), rss, 'utf8');
await writeFile(path.join(ROOT, 'dist/robots.txt'), robots, 'utf8');
console.log(`发现文件已生成：${urls.length} 条 URL / ${latest.length} 条 RSS`);
