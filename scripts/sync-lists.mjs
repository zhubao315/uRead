#!/usr/bin/env node
/**
 * Obsidian `02-BUILD/21-uRead/Lists` → uRead 公开栏目产物。
 *
 * token 只从 GITHUB_TOKEN 读，放请求 header；状态与正文缓存在 .lists-cache/（gitignore）。
 * 用法：GITHUB_TOKEN=... npm run lists:sync [-- --dry-run] [--local=/path/to/Lists]
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildListRecord } from './lists-format.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.GITHUB_TOKEN ?? '';
const REPO = process.env.NOTES_REPO ?? 'zhubao315/obsidian-vault';
const BRANCH = process.env.NOTES_BRANCH ?? 'main';
const LIST_PATH = process.env.LISTS_PATH ?? '02-BUILD/21-uRead/Lists';
const CACHE = path.join(ROOT, '.lists-cache');
const OUT = path.join(ROOT, 'public', 'lists');
const STATE = path.join(CACHE, 'state.json');
const BLOBS = path.join(CACHE, 'blobs');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const localDir = args.find((a) => a.startsWith('--local='))?.slice(8) ?? process.env.LISTS_DIR ?? '';
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function fail(message) {
  console.error(`同步失败：${message}`);
  process.exit(1);
}

async function api(url) {
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'uRead-lists-sync',
        },
        signal: AbortSignal.timeout(60_000),
      });
      if (response.ok) return response.json();
      const retryable = [403, 429, 500, 502, 503, 504].includes(response.status);
      if (!retryable) fail(`GitHub API ${response.status}（${url}）`);
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 4) {
      const delay = 2000 * 2 ** attempt;
      console.log(`  重试 ${url.split('/').slice(-2).join('/')}（${lastError}），${delay}ms 后再试`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  fail(`GitHub API 连续 5 次失败 ${url}：${lastError}`);
}

async function remoteFiles() {
  if (!TOKEN) fail('缺少 GITHUB_TOKEN；也可用 --local=目录');
  const tree = await api(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
  if (tree.truncated) fail('远端树被截断，拒绝生成部分产物');
  const prefix = `${LIST_PATH}/`;
  return tree.tree
    .filter((item) => item.type === 'blob' && item.path.startsWith(prefix) && /\.md$/i.test(item.path))
    .map((item) => ({ relative: item.path.slice(prefix.length), sha: item.sha }))
    .sort((a, b) => a.relative.localeCompare(b.relative, 'zh-Hans-CN'));
}

async function localFiles() {
  const found = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        const text = await readFile(full, 'utf8');
        found.push({ relative: path.relative(localDir, full).split(path.sep).join('/'),
          sha: sha256(Buffer.from(text)), text });
      }
    }
  };
  await walk(path.resolve(localDir));
  return found.sort((a, b) => a.relative.localeCompare(b.relative, 'zh-Hans-CN'));
}

async function atomic(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, content, 'utf8');
  await rename(temp, file);
}

async function collect(files, cached) {
  const texts = new Map();
  let changed = 0;
  for (const file of files) {
    if (file.text !== undefined) {
      texts.set(file.relative, file.text);
      changed += 1;
      continue;
    }
    const blob = path.join(BLOBS, `${file.sha}.txt`);
    try {
      texts.set(file.relative, await readFile(blob, 'utf8'));
      continue;
    } catch { /* 没缓存，下面拉取 */ }
    if (cached.blobs?.[file.relative] === file.sha) fail(`缓存声明了 ${file.relative} 却缺正文`);
    const repoPath = `${LIST_PATH}/${file.relative}`;
    const url = `https://api.github.com/repos/${REPO}/contents/${repoPath
      .split('/').map(encodeURIComponent).join('/')}?ref=${BRANCH}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'uRead-lists-sync' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) fail(`contents API ${response.status} ${repoPath}`);
    const data = await response.json();
    const text = Buffer.from(data.content, 'base64').toString('utf8');
    await atomic(blob, text);
    texts.set(file.relative, text);
    changed += 1;
  }
  return { texts, changed };
}

async function main() {
  const files = localDir ? await localFiles() : await remoteFiles();
  let cached = {};
  try { cached = JSON.parse(await readFile(STATE, 'utf8')); } catch { /* 首次运行 */ }
  const { texts, changed } = await collect(files, cached);
  const notes = JSON.parse(await readFile(path.join(ROOT, 'public', 'notes', 'notes.json'), 'utf8'));
  const records = files
    .map((file) => buildListRecord({ text: texts.get(file.relative), sha: file.sha }, file.relative, notes))
    .filter(Boolean);
  const themes = records.filter((r) => r.kind === 'theme');
  const booklists = records.filter((r) => r.kind === 'booklist');
  const ignored = files.length - records.length;
  const themesJson = JSON.stringify(themes, null, 2);
  const listsJson = JSON.stringify(booklists, null, 2);
  const version = sha256(Buffer.from(themesJson + listsJson)).slice(0, 16);
  const manifest = JSON.stringify({
    version,
    theme_count: themes.length,
    booklist_count: booklists.length,
    generated_at: new Date().toISOString(),
    source: localDir ? 'local' : 'github',
    note_path: LIST_PATH,
  }, null, 2);
  if (dryRun) {
    console.log(`[dry-run] 主题 ${themes.length} / 书单 ${booklists.length} / 忽略 ${ignored}，变化 ${changed}，版本 ${version}`);
    return;
  }
  await atomic(path.join(OUT, 'themes.json'), themesJson);
  await atomic(path.join(OUT, 'booklists.json'), listsJson);
  await atomic(path.join(OUT, 'manifest.json'), manifest);
  await atomic(STATE, JSON.stringify({ blobs: Object.fromEntries(files.map((f) => [f.relative, f.sha])), version }));
  console.log(`同步完成：主题 ${themes.length} / 书单 ${booklists.length} / 忽略 ${ignored}（非两类文件），变化 ${changed}，版本 ${version}`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
