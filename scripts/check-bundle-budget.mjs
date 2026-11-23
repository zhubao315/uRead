#!/usr/bin/env node
/**
 * 构建体积门禁。
 *
 * 读取 dist/index.html 中真正会阻塞首屏的 <script type="module"> 与
 * <link rel="modulepreload">（懒加载路由不在其中），统计 gzip 体积并与预算比较。
 * 超预算时退出码为 1，可直接挂到 verify:release 上。
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const BUDGET = {
  initialJsGzip: 200 * 1024,
  initialCssGzip: 50 * 1024,
  singleChunkGzip: 150 * 1024,
};

const configSource = await readFile(path.join(ROOT, 'src/config.ts'), 'utf8');
const slug = /SITE_SLUG\s*=\s*'([^']+)'/.exec(configSource)?.[1] ?? 'uRead';
const base = `/${slug}/`;

const html = await readFile(path.join(DIST, 'index.html'), 'utf8');
const tags = [...html.matchAll(/<(script|link)\b[^>]*>/g)].map((match) => match[0]);

const initialUrls = new Set();
for (const tag of tags) {
  const isModuleScript = /<script\b/.test(tag) && /type=["']module["']/.test(tag);
  const isPreload = /<link\b/.test(tag) && /rel=["']modulepreload["']/.test(tag);
  const isStyle = /<link\b/.test(tag) && /rel=["']stylesheet["']/.test(tag);
  if (!isModuleScript && !isPreload && !isStyle) continue;
  const url = /(?:src|href)=["']([^"']+)["']/.exec(tag)?.[1];
  if (url && url.startsWith(base)) initialUrls.add(url.slice(base.length));
}

const distFiles = await readdir(path.join(DIST, 'assets'));
const gzipSize = async (relative) => {
  const file = path.join(DIST, relative);
  const bytes = await readFile(file);
  return { file, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
};

const initialJs = [];
const initialCss = [];
for (const relative of initialUrls) {
  const stat = await gzipSize(relative);
  if (relative.endsWith('.css')) initialCss.push(stat);
  else if (relative.endsWith('.js')) initialJs.push(stat);
}

const allJs = await Promise.all(
  distFiles.filter((name) => name.endsWith('.js')).map((name) => gzipSize(`assets/${name}`)),
);
const allCss = await Promise.all(
  distFiles.filter((name) => name.endsWith('.css')).map((name) => gzipSize(`assets/${name}`)),
);
const oversized = [...allJs, ...allCss].filter((item) => item.gzip > BUDGET.singleChunkGzip);
const sourceMaps = distFiles.filter((name) => name.endsWith('.map'));

const sum = (items) => items.reduce((total, item) => total + item.gzip, 0);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const rows = [
  ['初始 JS（gzip）', sum(initialJs), BUDGET.initialJsGzip],
  ['初始 CSS（gzip）', sum(initialCss), BUDGET.initialCssGzip],
];
const problems = [];
for (const [label, actual, budget] of rows) {
  if (actual > budget) problems.push(`${label} ${kb(actual)} 超过预算 ${kb(budget)}`);
}
for (const item of oversized) {
  problems.push(`单个 chunk ${path.basename(item.file)} ${kb(item.gzip)} 超过 ${kb(BUDGET.singleChunkGzip)}`);
}
if (sourceMaps.length) {
  problems.push(`生产产物中出现 Source Map：${sourceMaps.join(', ')}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  base,
  budget: Object.fromEntries(Object.entries(BUDGET).map(([key, value]) => [key, kb(value)])),
  initial: {
    js: initialJs.map((item) => ({ file: path.basename(item.file), raw: item.raw, gzip: item.gzip })),
    css: initialCss.map((item) => ({ file: path.basename(item.file), raw: item.raw, gzip: item.gzip })),
    jsGzipTotal: sum(initialJs),
    cssGzipTotal: sum(initialCss),
  },
  chunks: [...allJs, ...allCss].map((item) => ({ file: path.basename(item.file), raw: item.raw, gzip: item.gzip })),
  sourceMaps,
  problems,
};

await writeFile(
  path.join(ROOT, 'docs/audit/bundle-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);

console.log('uRead 构建体积门禁');
for (const [label, actual, budget] of rows) {
  console.log(`  ${label}: ${kb(actual)} / ${kb(budget)}`);
}
console.log(`  chunk 总数: ${allJs.length + allCss.length}`);
if (problems.length) {
  console.error(`未通过：\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('通过：所有体积指标在预算内。');
