/**
 * uRead 文档站自检（Hugo + OINK 产物，构建目录 docs-site/）：
 *
 * 1. 必要页面存在（首页 / 404 / 审计报告分节 / 实施记录）；
 * 2. 站内链接全部可解析（无死链；替代产物 index.md/index.xml 按文件存在判定）；
 * 3. 可达性：每页都能从文档首页两跳内到达（导航与内容不漂移）；
 * 4. 不存在未渲染的 shortcode、未替换占位与未渲染的 Markdown 残留；
 * 5. 首页必须带「返回应用」的 /uRead/ 路径（文档与应用在同一个 Pages 站点里，
 *    读者不该在文档里迷路）；
 * 6. 每页都有 title / description / lang，内容页 `<h1>` 唯一。
 *
 * 用法：node scripts/check-docs-site.mjs [docs-site]
 */

import { readFileSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.resolve(ROOT, process.argv[2] ?? 'docs-site');

const REQUIRED = ['index.html', '404.html', 'audit/index.html', 'implementation_stage3/index.html'];

const problems = [];
const fail = (message) => problems.push(message);

async function walk(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await walk(absolute, relative)));
    else if (entry.name.endsWith('.html')) out.push({ absolute, relative });
  }
  return out;
}

function isFilePath(target) {
  return /\.[^/]*$/.test(target.split('/').pop() ?? '');
}

function normalizeTarget(fromFile, rawHref, prefix) {
  const href = rawHref.split('#')[0].split('?')[0].trim().replace(/&#43;/g, '+').replace(/&amp;/g, '&');
  if (!href || /^(https?:|mailto:|data:|tel:)/i.test(href)) return null;
  if (href.startsWith('/')) {
    // 文档站内链接相对 /uRead/docs/；指向 /uRead/… 的应用链接不要求存在于文档站。
    if (href.startsWith('/uRead/') && !href.startsWith('/uRead/docs/')) return null;
    if (prefix !== '/' && href.startsWith(prefix)) {
      const stripped = (prefix.length > 1 ? href.slice(prefix.length - 1) : href).replace(/^\//, '') || 'index.html';
      return isFilePath(stripped) ? stripped : stripped + (stripped.endsWith('/') ? 'index.html' : '/index.html');
    }
    const rel = href.replace(/^\//, '') || 'index.html';
    return isFilePath(rel) ? rel : rel + (rel.endsWith('/') ? 'index.html' : '/index.html');
  }
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), href));
  if (joined === '.' || joined === '') return 'index.html';
  const target = joined.replace(/^\.\//, '');
  return isFilePath(target) ? target : target + (target.endsWith('/') ? 'index.html' : '/index.html');
}

function internalHrefs(html) {
  const hrefs = [];
  for (const match of html.matchAll(/<a\s[^>]*?href=("?)([^"'><\s]+)\1/gi)) {
    const href = match[2].replace(/&#43;/g, '+').replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|data:|tel:|javascript:|#)/i.test(href)) continue;
    hrefs.push(href);
  }
  return hrefs;
}

function basePrefix(indexHtml) {
  const byClass = /class="?td-nav-brand"?[^>]*href=("?)([^"'><\s]+)\1/.exec(indexHtml);
  const byHref = /href=("?)([^"'><\s]+)\1[^>]*class="?td-nav-brand/.exec(indexHtml);
  return (byClass ?? byHref)?.[2] ?? '/';
}

function checkPage(relative, html) {
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${relative}：缺少 <title>`);
  if (!/<meta\s+name="?description"?\s+content=("[^"]+"|'[^']+')/.test(html)) fail(`${relative}：缺少 description`);
  if (!/<html[^>]*lang="?(?:zh|en)/.test(html)) fail(`${relative}：缺少 lang 属性`);
  const mainHtml = (html.match(/<main\b[\s\S]*?<\/main>/g) ?? []).join('');
  if (relative !== 'index.html' && relative !== '404.html') {
    const h1Count = (mainHtml.match(/<h1\b/g) ?? []).length;
    if (h1Count !== 1) fail(`${relative}：<h1> 数量为 ${h1Count}，应为 1`);
  }
  if (/\{\{<[^>]+>\}\}/.test(html)) fail(`${relative}：存在未渲染的 shortcode`);
  const prose = mainHtml.replace(/<pre\b[\s\S]*?<\/pre>/g, '').replace(/<code\b[\s\S]*?<\/code>/g, '');
  if (/\{\{\s*[\w.]+\s*\}\}/.test(prose)) fail(`${relative}：存在未替换的模板占位 {{var}}`);
  const visible = prose.replace(/<[^>]+>/g, '');
  if (/\*\*[^*\n]{2,}\*\*/.test(visible) || /(^|\n)#{1,6}\s/.test(visible)) fail(`${relative}：疑似未渲染的 Markdown`);
}

/**
 * 取 docs/_index.md 第一段正文的开头若干字（首页必须真的渲染它）。
 *
 * 主题的默认首页版式来自 data/home；正文写在 docs/_index.md，靠 layouts/index.html
 * 覆盖才渲染出来。只看「main 里有没有字」不够——分节卡片与摘要也有字，
 * 所以这里比对正文里的原句片段。
 */
function homeBodyMarker() {
  const raw = readFileSync(path.join(ROOT, 'docs', '_index.md'), 'utf8');
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
  let inFence = false;
  for (const line of body.split('\n')) {
    const s = line.trim();
    if (s.startsWith('```')) inFence = !inFence;
    if (inFence || !s || /^[#>|!<]/.test(s)) continue;
    if (/^[-*+]\s/.test(s)) continue; // 列表项；但 **粗体** 开头的正文段要留下
    return s.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1').replace(/[*_`]/g, '').slice(0, 24);
  }
  return '';
}

function visibleText(htmlFragment) {
  return htmlFragment.replace(/<[^>]+>/g, '').replace(/&#43;/g, '+').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

async function main() {
  const info = await stat(siteDir).catch(() => null);
  if (!info?.isDirectory()) {
    console.error(`文档站目录不存在：${siteDir}（先执行 npm run docs:build）`);
    process.exit(1);
  }

  const pages = await walk(siteDir);
  if (pages.length === 0) {
    console.error('文档站目录为空');
    process.exit(1);
  }
  const htmlByPage = new Map();
  for (const page of pages) htmlByPage.set(page.relative, await readFile(page.absolute, 'utf8'));
  const pageSet = new Set(htmlByPage.keys());
  const prefix = basePrefix(htmlByPage.get('index.html') ?? '');

  for (const required of REQUIRED) {
    if (!pageSet.has(required)) fail(`缺少必要页面：${required}`);
  }

  for (const [relative, html] of htmlByPage) {
    checkPage(relative, html);
    for (const href of internalHrefs(html)) {
      const target = normalizeTarget(relative, href, prefix);
      if (target && !pageSet.has(target) && !(await stat(path.join(siteDir, target)).catch(() => null))) {
        fail(`${relative}：死链 -> ${href}`);
      }
    }
  }

  const reachable = new Set(['index.html']);
  for (let hop = 0; hop < 2; hop += 1) {
    for (const name of [...reachable]) {
      for (const href of internalHrefs(htmlByPage.get(name) ?? '')) {
        const target = normalizeTarget(name, href, prefix);
        if (target && pageSet.has(target)) reachable.add(target);
      }
    }
  }
  for (const relative of pageSet) {
    if (relative !== '404.html' && !reachable.has(relative)) fail(`${relative}：无法从首页到达（导航与内容漂移）`);
  }

  // 首页正文：正文写在 docs/_index.md，靠 layouts/index.html 覆盖才渲染。
  const marker = homeBodyMarker();
  const homeMain = visibleText((htmlByPage.get('index.html') ?? '').match(/<main\b[\s\S]*?<\/main>/g)?.join('') ?? '');
  if (!marker) fail('docs/_index.md 没有可提取的正文段落（首页该说什么？）');
  else if (!homeMain.includes(marker)) fail(`index.html：首页正文未渲染（缺少正文原句「${marker.slice(0, 16)}…」，layouts/index.html 覆盖失效？）`);

  // 文档与应用在同一个 Pages 站点：首页必须给出回应用的路。
  // 必须精确等于 /uRead/：属性可无引号（--minify），所以用后视断言收尾——
  // 否则 href=/uRead/docs/… 也会被当成「回应用的链接」，这条断言就形同虚设。
  const home = htmlByPage.get('index.html') ?? '';
  if (!/href=("?)\/uRead\/\1(?=[\s>])/.test(home)) fail('首页缺少返回应用（/uRead/）的链接');

  if (problems.length > 0) {
    console.error(`文档站自检失败：${problems.length} 个问题`);
    for (const problem of problems.slice(0, 40)) console.error(`!!! ${problem}`);
    process.exit(1);
  }
  console.log(`文档站自检通过：${pages.length} 个页面，导航与链接一致，回应用路径在位`);
}

main().catch((error) => {
  console.error(`文档站自检异常：${error instanceof Error ? error.stack : String(error)}`);
  process.exit(1);
});
