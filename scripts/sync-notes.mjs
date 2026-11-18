#!/usr/bin/env node
/**
 * Obsidian 笔记仓库 → uRead 公开阅读产物（Node，无第三方依赖）。
 *
 * 链路：GitHub API 树（1 次）→ 只下载内容变化的 .md（按 blob sha 缓存）→
 *      白名单解析 → public/notes/notes.json + manifest.json → 可选 TTS 预生成音频。
 *
 * 密钥：`GITHUB_TOKEN` **只从环境变量读**，只放在请求的 header 上；
 *       不写进 .git/config、不写进产物、不打印、不落盘。没有 token 时用 `--local=路径`
 *       读本机目录，方便先在离线机器上校准解析器。
 *
 * 用法：
 *   GITHUB_TOKEN=... node scripts/sync-notes.mjs                    # 真同步（GitHub）
 *   node scripts/sync-notes.mjs --local=/path/to/07-SOURCES/71-书籍  # 本机目录
 *   node scripts/sync-notes.mjs --dry-run                           # 只报数量，不写文件
 *   node scripts/sync-notes.mjs --no-audio                          # 不生成音频
 *   node scripts/sync-notes.mjs --audio-limit=30                     # 预生成前 30 篇的音频
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  audioName,
  concatWav,
  contentsUrl,
  narrationText,
  publicNote,
  splitForTts,
} from './notes-format.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CACHE = path.join(ROOT, '.notes-cache');
const OUT_NOTES = path.join(ROOT, 'public', 'notes');
const OUT_AUDIO = path.join(ROOT, 'public', 'audio');
const STATE = path.join(CACHE, 'state.json');
const BLOBS = path.join(CACHE, 'blobs');

const REPO = process.env.NOTES_REPO ?? 'zhubao315/obsidian-vault';
const BRANCH = process.env.NOTES_BRANCH ?? 'main';
const NOTE_PATH = process.env.NOTES_PATH ?? '07-SOURCES/71-书籍';
const TTS_BASE = process.env.TTS_BASE_URL ?? 'http://192.168.1.3:40000/v1';
const TTS_MODEL = process.env.TTS_MODEL ?? 'Qwen3-TTS-VoiceDesign-copy';
const VOICE = process.env.TTS_VOICE ??
  '从容清晰的青年女声，音色干净稳定，语速偏慢，朗读读书笔记，停顿清楚，语气平和自然，不煽情';

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === `--${name}`);
const value = (name, fallback = '') => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const dryRun = flag('dry-run');
const withAudio = !flag('no-audio');
const audioLimit = Number(value('audio-limit', process.env.AUDIO_LIMIT ?? '10'));
const localDir = value('local', process.env.NOTES_DIR ?? '');
const token = process.env.GITHUB_TOKEN ?? '';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (full) => full.split(path.sep).join('/');

function fail(message) {
  console.error(`同步失败：${message}`);
  process.exit(1);
}

async function api(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'uRead-notes-sync',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const hint = remaining === '0' ? '（API 速率用尽，下次再跑；缓存不会丢）' : '';
    fail(`GitHub API ${response.status} ${hint}（${url}）`);
  }
  return response.json();
}

async function listGithubFiles() {
  if (!token) {
    fail('缺少 GITHUB_TOKEN；也可用 --local=本机目录模式');
  }
  const tree = await api(
    `https://api.github.com/repos/${REPO}/git/trees/${encodeURIComponent(BRANCH)}?recursive=1`,
  );
  if (tree.truncated) {
    fail('GitHub 树被截断，不能保证目录完整（拒绝生成一份缺笔记的产物）');
  }
  const prefix = `${NOTE_PATH}/`;
  return tree.tree
    .filter((item) => item.type === 'blob' && item.path.startsWith(prefix) && /\.md$/i.test(item.path))
    .map((item) => ({
      relative: item.path.slice(prefix.length),
      sha: item.sha,
      size: item.size,
    }))
    .sort((a, b) => a.relative.localeCompare(b.relative, 'zh-Hans-CN'));
}

async function listLocalFiles(root) {
  const found = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        const text = await readFile(full, 'utf8');
        found.push({ relative: rel(path.relative(root, full)), sha: sha256(Buffer.from(text)), text });
      }
    }
  };
  await walk(root);
  return found.sort((a, b) => a.relative.localeCompare(b.relative, 'zh-Hans-CN'));
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE, 'utf8'));
  } catch {
    return { blobs: {}, version: '' };
  }
}

async function collectTexts(files, cached) {
  const texts = new Map();
  const changed = [];
  for (const file of files) {
    if (file.text !== undefined) {
      texts.set(file.relative, file.text);
      changed.push(file.relative);
      continue;
    }
    const blobPath = path.join(BLOBS, `${file.sha}.txt`);
    try {
      texts.set(file.relative, await readFile(blobPath, 'utf8'));
      continue;
    } catch {
      // 没缓存，下面是网络获取
    }
    if (cached.blobs[file.relative] === file.sha) {
      fail(`缓存声明了 ${file.relative} 却找不到内容文件（缓存不自洽，拒绝继续）`);
    }
    changed.push(file.relative);
  }
  if (localDir) {
    return { texts, changed };
  }

  // GitHub contents API：base64。并发 6，受 API 速率限制保护。
  const queue = files.filter((f) => changed.includes(f.relative));
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const file = queue[cursor++];
      const url = contentsUrl(REPO, NOTE_PATH, BRANCH, file.relative);
      const data = await api(url);
      const text = Buffer.from(data.content, 'base64').toString('utf8');
      await mkdir(BLOBS, { recursive: true });
      await atomicWrite(path.join(BLOBS, `${file.sha}.txt`), text);
      texts.set(file.relative, text);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker));
  return { texts, changed };
}

async function atomicWrite(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, content, 'utf8');
  await rename(temp, file);
}

async function synthChunk(text) {
  const response = await fetch(`${TTS_BASE}/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TTS_MODEL,
      task_type: 'VoiceDesign',
      input: text,
      instructions: VOICE,
      language: 'Chinese',
      response_format: 'wav',
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    fail(`TTS ${response.status}：${(await response.text()).slice(0, 200)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function maybeAudio(notes) {
  if (!withAudio) {
    return 0;
  }
  let made = 0;
  for (const note of notes) {
    if (made >= audioLimit) {
      break;
    }
    if (note.title.startsWith('∑')) {
      continue; // 索引页念出来毫无价值，跳过
    }
    if (await exists(path.join(OUT_AUDIO, audioName(note.content_hash)))) {
      note.audio = true;
      continue;
    }
    const chunks = splitForTts(narrationText(note.body));
    if (chunks.length === 0) {
      continue;
    }
    const buffers = [];
    for (const chunk of chunks) {
      buffers.push(await synthChunk(chunk));
    }
    await atomicWriteBinary(path.join(OUT_AUDIO, audioName(note.content_hash)), concatWav(buffers));
    note.audio = true;
    made += 1;
    console.log(`  音频 ${made}/${audioLimit}：${note.title.slice(0, 30)}（${chunks.length} 段合成）`);
  }
  return made;
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function atomicWriteBinary(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, content);
  await rename(temp, file);
}

async function main() {
  const files = localDir ? await listLocalFiles(path.resolve(localDir)) : await listGithubFiles();
  const cached = await readState();
  const { texts, changed } = await collectTexts(files, cached);
  const notes = files.map((file) => {
    const text = texts.get(file.relative);
    if (text === undefined) {
      fail(`笔记内容缺失：${file.relative}`);
    }
    return publicNote({ text, sha: file.sha }, file.relative);
  });
  const audioMade = dryRun ? 0 : await maybeAudio(notes);
  const payload = JSON.stringify(notes);
  const version = sha256(Buffer.from(payload)).slice(0, 16);
  const manifest = JSON.stringify({
    version,
    generated_at: new Date().toISOString(),
    note_count: notes.length,
    audio_count: notes.filter((n) => n.audio).length,
    source: localDir ? 'local' : 'github',
    repo: localDir ? '' : REPO,
    branch: localDir ? '' : BRANCH,
    note_path: NOTE_PATH,
  }, null, 2);

  if (dryRun) {
    console.log(`[dry-run] 笔记 ${notes.length} 篇（本次变化 ${changed.length} 篇），音频 ${withAudio ? `上限 ${audioLimit}` : '关闭'}，版本 ${version}`);
    return;
  }
  await atomicWrite(path.join(OUT_NOTES, 'notes.json'), payload);
  await atomicWrite(path.join(OUT_NOTES, 'manifest.json'), manifest);
  const nextState = {
    blobs: Object.fromEntries(files.map((f) => [f.relative, f.sha])),
    version,
  };
  await atomicWrite(STATE, JSON.stringify(nextState));
  console.log(`同步完成：${notes.length} 篇（本次变化 ${changed.length} 篇），新音频 ${audioMade} 篇，版本 ${version}`);
  console.log(`产物：${path.relative(ROOT, path.join(OUT_NOTES, 'manifest.json'))}、${path.relative(ROOT, path.join(OUT_NOTES, 'notes.json'))}`);
  if (localDir) {
    console.log('注意：当前是本地目录模式，公开产物来自本机文件，不是 GitHub。');
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
