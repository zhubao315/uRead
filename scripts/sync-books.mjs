#!/usr/bin/env node
/**
 * 私有 Obsidian vault → uRead 静态书库（Node，无第三方依赖）。
 *
 * 链路：GitHub Git Tree（1 次）→ 按目录前缀筛出 EPUB（按 blob sha 缓存）→
 *      下载到 book-library/books/ → 由 `npm run build` 生成书库与书籍索引。
 *
 * 密钥：`GITHUB_TOKEN` **只从环境变量读**，只在请求 header 使用；
 *       不写进 .git/config、不写进产物、不打印、不落盘。没有 token 时用
 *       `--local=/path/to/vault` 从本机目录读取，便于离线校准。
 *
 * 用法：
 *   GITHUB_TOKEN=... npm run books:sync
 *   npm run books:sync -- --dry-run
 *   npm run books:sync -- --local=/path/to/obsidian-vault
 *   BOOKS_PATHS='["02-BUILD/28-创作/书-投资的纪律"]' npm run books:sync
 */

import { createHash } from 'node:crypto';

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BOOKS_OUT = path.join(ROOT, 'book-library', 'books');
const CACHE = path.join(ROOT, '.books-cache');
const STATE = path.join(CACHE, 'state.json');

const REPO = process.env.BOOKS_REPO ?? process.env.NOTES_REPO ?? 'zhubao315/obsidian-vault';
const BRANCH = process.env.BOOKS_BRANCH ?? 'main';

/** 4 个待发布 EPUB 的目录前缀（相对 vault 根目录，使用 POSIX 分隔符）。 */
const DEFAULT_PATHS = [
  '02-BUILD/24-项目支持/64personalities-cn/书-千分之一的你',
  '02-BUILD/28-创作/书-知识库工程学/电子书/dist',
  '02-BUILD/28-创作/书-投资的纪律',
  '02-BUILD/28-创作/书-AI时代，如何真正学会/电子书/dist',
];

const WARN_BYTES = 50 * 1024 * 1024;
const HARD_BYTES = 100 * 1024 * 1024;

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === `--${name}`);
const value = (name, fallback = '') => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const dryRun = flag('dry-run');
const localRoot = value('local', process.env.BOOKS_DIR ?? '');
const token = process.env.GITHUB_TOKEN ?? '';

function prefixes() {
  const raw = process.env.BOOKS_PATHS ?? '';
  if (!raw.trim()) return DEFAULT_PATHS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length && parsed.every((p) => typeof p === 'string')) {
      return parsed.map((p) => p.replace(/^\/+/, ''));
    }
  } catch {
    // 也接受逗号分隔
  }
  const list = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (!list.length) fail('BOOKS_PATHS 解析结果为空');
  return list;
}

function underPrefix(filePath, prefix) {
  const clean = prefix.replace(/\/+$/, '');
  return filePath === clean || filePath.startsWith(`${clean}/`);
}

function fail(message) {
  console.error(`书籍同步失败：${message}`);
  process.exit(1);
}

function safeName(remotePath, used) {
  const base = path.posix.basename(remotePath).replace(/[\\/:*?"<>|]/g, '_');
  let name = base.endsWith('.epub') ? base : `${base}.epub`;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    name = `${base.replace(/\.epub$/i, '')}-${n}.epub`;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** GitHub Git Tree 里的 sha 是 Git blob SHA-1（不是 SHA-256）。 */
function gitBlobSha(buffer) {
  return createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer]))
    .digest('hex');
}

/** 明确排除归档/历史基线/标注「勿投」的电子书。 */
function publishable(path) {
  return !/(^|\/)(_?archive|历史|old)(\/|$)/i.test(path) && !/勿投|历史基线/.test(path);
}

async function api(url) {
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'uRead-books-sync',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(120_000),
      });
      if (response.ok) return response.json();
      const retryable = [403, 429, 500, 502, 503, 504].includes(response.status);
      if (!retryable) fail(`GitHub API ${response.status}（${url.split('/').slice(-2).join('/')}）`);
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 4) {
      const delay = 2000 * 2 ** attempt;
      console.log(`  重试（${lastError}），${delay}ms 后再试`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  fail(`GitHub API 连续 5 次失败：${lastError}`);
}

async function listRemoteFiles(paths) {
  const tree = await api(
    `https://api.github.com/repos/${REPO}/git/trees/${encodeURIComponent(BRANCH)}?recursive=1`,
  );
  if (tree.truncated) fail('GitHub 树被截断，不能保证目录完整（拒绝生成一份缺书的书库）');
  const found = tree.tree.filter(
    (item) =>
      item.type === 'blob' &&
      /\.epub$/i.test(item.path) &&
      publishable(item.path) &&
      paths.some((prefix) => underPrefix(item.path, prefix)),
  );
  return found
    .map((item) => ({ remotePath: item.path, sha: item.sha, verify: item.sha, size: item.size }))
    .sort((a, b) => a.remotePath.localeCompare(b.remotePath, 'zh-Hans-CN'));
}

async function listLocalFiles(paths) {
  const found = [];
  for (const prefix of paths) {
    const root = path.join(localRoot, ...prefix.split('/'));
    // 兼容「前缀本身就是 .epub 文件」的情形
    if (/\.epub$/i.test(root)) {
      try {
        const info = await stat(root);
        if (info.isFile()) {
          const buffer = await readFile(root);
          found.push({ remotePath: prefix, sha: sha256(buffer), verify: sha256(buffer), size: buffer.length, buffer });
        }
      } catch {
        console.warn(`  本地文件不存在：${root}`);
      }
      continue;
    }

    try {
      await readdir(root, { withFileTypes: true });
    } catch {
      console.warn(`  本地路径不存在：${root}`);
      continue;
    }
    const walk = async (dir, relDir) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const relPath = path.posix.join(relDir, entry.name);
        if (entry.isDirectory()) {
          await walk(full, relPath);
        } else if (entry.isFile() && /\.epub$/i.test(entry.name)) {
          const buffer = await readFile(full);
          found.push({
            remotePath: relPath,
            sha: sha256(buffer),
            verify: sha256(buffer),
            size: buffer.length,
            buffer,
          });
        }
      }
    };
    await walk(root, prefix);
  }
  return found.sort((a, b) => a.remotePath.localeCompare(b.remotePath, 'zh-Hans-CN'));
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE, 'utf8'));
  } catch {
    return { files: {} };
  }
}

async function downloadBlob(sha) {
  const data = await api(
    `https://api.github.com/repos/${REPO}/git/blobs/${encodeURIComponent(sha)}`,
  );
  if (data.encoding !== 'base64' || typeof data.content !== 'string') {
    fail(`blob ${sha} 未返回 base64 内容`);
  }
  return Buffer.from(data.content.replace(/\s/g, ''), 'base64');
}

const paths = prefixes();
console.log(`书籍源：${REPO}@${BRANCH}（${paths.length} 个目录前缀）`);
if (dryRun) console.log('dry-run：只列举，不写文件');

const files = localRoot ? await listLocalFiles(paths) : await listRemoteFiles(paths);
if (!files.length) {
  fail(`在指定目录下没有找到任何 EPUB。请检查 BOOKS_PATHS / 私库路径与 token 权限。`);
}

const state = await readState();
const used = new Set();
const plan = files.map((file) => ({
  ...file,
  target: safeName(file.remotePath, used),
}));

console.log(`找到 ${plan.length} 本 EPUB：`);
for (const item of plan) {
  const sizeMiB = (item.size / 1024 / 1024).toFixed(2);
  console.log(`  - ${item.remotePath} → ${item.target}（${sizeMiB} MiB）`);
  if (item.size > HARD_BYTES) fail(`${item.remotePath} 超过 GitHub 100 MiB 硬限制`);
  if (item.size > WARN_BYTES) console.warn(`    警告：${item.remotePath} 超过 50 MiB`);
}

if (dryRun) process.exit(0);

if (!localRoot && !token) {
  fail('缺少 GITHUB_TOKEN；可用 --local=/path/to/vault 离线模式');
}

await mkdir(BOOKS_OUT, { recursive: true });
let downloaded = 0;
let skipped = 0;
const nextState = { files: {} };

for (const item of plan) {
  const targetPath = path.join(BOOKS_OUT, item.target);
  const cached = state.files[item.remotePath];
  const digest = localRoot ? sha256 : gitBlobSha;
  let buffer = item.buffer;

  if (!buffer && cached === item.sha) {
    try {
      const existing = await readFile(targetPath);
      if (digest(existing) === item.sha) {
        buffer = existing;
        skipped += 1;
        console.log(`  缓存命中：${item.target}`);
      }
    } catch {
      // 缓存声明存在但文件不在，下面重新下载
    }
  }

  if (!buffer) {
    buffer = await downloadBlob(item.sha);
    if (digest(buffer) !== item.verify) fail(`${item.remotePath} 下载内容 sha 不匹配`);
    downloaded += 1;
    console.log(`  已下载：${item.target}`);
  }

  await writeFile(targetPath, buffer);
  nextState.files[item.remotePath] = item.sha;
}

await mkdir(CACHE, { recursive: true });
await writeFile(STATE, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
console.log(`书籍同步完成：下载 ${downloaded} 本，缓存命中 ${skipped} 本，共 ${plan.length} 本。`);
