#!/usr/bin/env node
/**
 * 媒体构建：把策展清单复制到 dist，并为每本真实书籍生成确定性 SVG 主题视觉封面。
 * 必须在 books:index 之后运行（依赖 dist/books/aggregate.json），且不碰 dist/books 现有文件。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist', 'media');
const BOOKS_DIR = path.join(DIST, 'books');

const PALETTES = [
  ['#17243A', '#2457A6', '#C58B42'],
  ['#102A43', '#2E6F95', '#C58B42'],
  ['#1B2A41', '#477FE8', '#D9A441'],
  ['#14213D', '#3A6EA5', '#C58B42'],
  ['#202A44', '#4C6FA8', '#D2A24C'],
  ['#152238', '#2F6B8F', '#C58B42'],
];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[ch]));

/** FNV-1a：同一书籍 ID 永远得到同一配色与图案。 */
function seedOf(id) {
  let hash = 2166136261;
  for (const char of String(id)) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 按字符数换行，中文长标题最多三行，超出省略，不溢出画布。 */
function wrapTitle(title, max = 11) {
  const chars = Array.from(String(title).trim());
  const lines = [];
  for (let index = 0; index < chars.length && lines.length < 3; index += max) {
    lines.push(chars.slice(index, index + max).join(''));
  }
  if (chars.length > max * 3 && lines.length === 3) {
    lines[2] = `${Array.from(lines[2]).slice(0, max - 1).join('')}…`;
  }
  return lines;
}

function coverSvg(book) {
  const seed = seedOf(book.id);
  const [navy, blue, gold] = PALETTES[seed % PALETTES.length];
  const ringX = 200 + (seed % 90) - 45;
  const ringY = 200 + Math.floor(seed / 97) % 80 - 40;
  const lines = wrapTitle(book.title);
  const title = lines.map((line, index) =>
    `<text x="40" y="${408 + index * 40}" font-family="system-ui,'PingFang SC',sans-serif" font-size="27" font-weight="600" fill="#F5F7FA">${esc(line)}</text>`,
  ).join('');
  const author = book.author
    ? `<text x="40" y="548" font-family="system-ui,'PingFang SC',sans-serif" font-size="15" fill="#CBD5E1">${esc(book.author)}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" role="img" aria-label="${esc(book.title)} 主题视觉封面">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${navy}"/><stop offset="1" stop-color="${blue}"/></linearGradient></defs>
<rect width="400" height="600" fill="url(#g)"/>
<circle cx="${ringX}" cy="${ringY}" r="118" fill="none" stroke="${gold}" stroke-opacity=".45" stroke-width="2"/>
<circle cx="${ringX}" cy="${ringY}" r="76" fill="none" stroke="#F5F7FA" stroke-opacity=".22" stroke-width="1"/>
<path d="M40 330 L360 330" stroke="${gold}" stroke-opacity=".7" stroke-width="2"/>
${title}
${author}
<text x="40" y="582" font-family="system-ui,sans-serif" font-size="11" letter-spacing="2" fill="#93A7C4">UREAD · THEME VISUAL</text>
</svg>`;
}

/** 主题/书单的 16:9 抽象视觉：同系列语言、按 ID 种子区分构图，画面内不写任何文字。 */
function collectionSvg(kind, item) {
  const seed = seedOf(`${kind}:${item.id}`);
  const [navy, blue, gold] = PALETTES[(seed >>> 3) % PALETTES.length];
  const cx = 120 + seed % 560;
  const cy = 90 + Math.floor(seed / 7) % 270;
  const arcs = Array.from({ length: 3 + seed % 3 }, (_, index) =>
    `<circle cx="${cx}" cy="${cy}" r="${70 + index * 58}" fill="none" stroke="${gold}" stroke-opacity="${(0.5 - index * 0.1).toFixed(2)}" stroke-width="2"/>`,
  ).join('');
  const lines = Array.from({ length: 4 }, (_, index) => {
    const x = 90 + index * 200 + (seed % 40);
    return `<path d="M${x} 450 L${x + 130} 0" stroke="#F5F7FA" stroke-opacity=".08" stroke-width="1"/>`;
  }).join('');
  const dots = Array.from({ length: 9 }, (_, index) => {
    const x = 60 + (index % 3) * 48 + (seed % 30);
    const y = 350 + Math.floor(index / 3) * 34;
    return `<circle cx="${x}" cy="${y}" r="3" fill="${gold}" fill-opacity=".5"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-label="${esc(item.title)} 主题视觉">
<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${navy}"/><stop offset="1" stop-color="${blue}"/></linearGradient></defs>
<rect width="800" height="450" fill="url(#c)"/>
${lines}${arcs}${dots}
<circle cx="${cx}" cy="${cy}" r="18" fill="${gold}" fill-opacity=".85"/>
</svg>`;
}

const aggregatePath = path.join(ROOT, 'dist', 'books', 'aggregate.json');
const aggregate = JSON.parse(await readFile(aggregatePath, 'utf8'));
await mkdir(BOOKS_DIR, { recursive: true });
for (const book of aggregate.books) {
  await writeFile(path.join(BOOKS_DIR, `${encodeURIComponent(book.id)}.svg`), coverSvg(book), 'utf8');
}
const collectionsDir = path.join(DIST, 'collections');
await mkdir(collectionsDir, { recursive: true });
let collectionCount = 0;
for (const [kind, file] of [['theme', 'public/lists/themes.json'], ['booklist', 'public/lists/booklists.json']]) {
  const items = JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));
  for (const item of items) {
    await writeFile(path.join(collectionsDir, `${kind}-${encodeURIComponent(item.id)}.svg`), collectionSvg(kind, item), 'utf8');
    collectionCount += 1;
  }
}
await writeFile(path.join(DIST, 'manifest.json'), await readFile(path.join(ROOT, 'media', 'curated-manifest.json'), 'utf8'), 'utf8');
await writeFile(path.join(DIST, 'wiki-images.json'), await readFile(path.join(ROOT, 'media', 'wiki-images.json'), 'utf8'), 'utf8');
console.log(`媒体产物已生成：${aggregate.books.length} 张书籍封面 + ${collectionCount} 张主题/书单视觉 + manifest.json → dist/media/`);
