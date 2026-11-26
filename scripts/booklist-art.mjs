#!/usr/bin/env node
/**
 * 书单智能配图：审计 → 逐项策划 → 串行生成 → 本地 WebP → 接入策展清单。
 *
 * 用法：
 *   node scripts/booklist-art.mjs --audit                # 生成清单与完整提示词（不调用 API）
 *   node scripts/booklist-art.mjs --generate --limit 2   # 小批样例
 *   node scripts/booklist-art.mjs --generate             # 全量，可断点续跑
 *   node scripts/booklist-art.mjs --status               # 查看成功/失败/待处理
 *
 * 4096 秒的超时留给本地模型首次加载；失败只记录，不中断整批。
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.UREAD_IMAGE_API ?? 'http://192.168.1.3:18199/v1';
const MODEL = 'minimax-h3-image';
const SIZE = '2048x2048';
const TIMEOUT_MS = 1_200_000;
const RETRIES = 2;
const ORIGINAL_DIR = path.join('/tmp/opencode', 'uRead-booklist-art', 'original');
const WEBP_DIR = path.join(ROOT, 'public', 'media', 'booklists');
const PLAN_FILE = 'media/booklist-art-plan.json';
const CONCEPT_FILE = 'media/booklist-art-concepts.json';
const MANIFEST_FILE = 'media/curated-manifest.json';
const LOG_FILE = 'docs/audit/booklist-art-run.log';
const AUDIT_FILE = 'docs/audit/booklist-art-audit.md';

const args = process.argv.slice(2);
const flagValue = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};

const readJson = async (file, fallback) => {
  try { return JSON.parse(await readFile(path.join(ROOT, file), 'utf8')); } catch { return fallback; }
};
const writeJson = async (file, value) => {
  await writeFile(path.join(ROOT, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const stamp = () => new Date().toISOString();

async function log(line) {
  const text = `[${stamp()}] ${line}\n`;
  await mkdir(path.dirname(path.join(ROOT, LOG_FILE)), { recursive: true });
  const { appendFile } = await import('node:fs/promises');
  await appendFile(path.join(ROOT, LOG_FILE), text, 'utf8');
  console.log(line);
}

async function loadItems() {
  const booklists = await readJson('public/lists/booklists.json', []);
  const themes = await readJson('public/lists/themes.json', []);
  return [...booklists, ...themes];
}

function buildPrompt(concept) {
  return [
    'Create a premium editorial abstract artwork. This is NOT a book cover, poster, magazine cover, map or labeled diagram.',
    'ABSOLUTE REQUIREMENT: the final image must contain ZERO letters, words, numbers, characters, runes, glyphs, signatures, captions or any marks resembling writing. Express the subject only through form, space, light and material.',
    `Visual brief: ${concept.visual_concept}.`,
    `Main visual subject: ${concept.motif}. Keep it uninscribed, blank and unlabeled.`,
    `Composition: ${concept.composition}. Keep the subject inside the central 16:9 safe crop of the square canvas.`,
    'Environment: a calm, self-contained conceptual space; no recognizable real-world location or existing artwork.',
    'Art direction: sophisticated contemporary editorial art, museum-quality visual storytelling, refined conceptual illustration, exceptional artistic composition.',
    `Color palette: ${concept.palette}. Restrained saturation, harmonious tonal range.`,
    'Lighting: deliberate directional light, soft gradients, quiet shadows, a clear hierarchy between subject and ground.',
    `Materials and textures: ${concept.materials}; tactile depth without busy ornament or written marks.`,
    'Visual atmosphere: contemplative, intelligent, quietly ambitious.',
    'Format: square 1:1 composition, high-resolution 2048x2048 artwork, visually recognizable at small thumbnail sizes. Preserve generous negative space around the subject.',
    'Never include text, typography, book titles, author names, map labels, street names, legends, inscriptions, runes, carved symbols, annotations, numbers, logos, watermarks, QR codes, UI elements, random glyphs, copied covers, glowing particle clutter, neon overload or visually noisy decoration.',
  ].join('\n');
}

function audit(items, concepts, plan) {
  const rows = [];
  const issues = [];
  for (const item of items) {
    const concept = concepts.concepts?.[item.id];
    if (!concept) issues.push(`${item.id} ${item.title}: 缺少视觉策划`);
    if (!String(item.description ?? '').trim()) issues.push(`${item.id} ${item.title}: 简介为空`);
    if (!item.books?.length) issues.push(`${item.id} ${item.title}: 无书籍`);
    const entry = plan.items?.find((row) => row.id === item.id);
    rows.push([
      item.id, item.title, String(item.description ?? '').replace(/\s+/g, ' ').slice(0, 90),
      (item.books ?? []).length, concept?.theme ?? '', concept?.visual_concept ?? '',
      (entry?.image_prompt ?? '').replace(/\s+/g, ' ').slice(0, 120) + '…',
      `public/media/booklists/${item.id}.webp`, entry?.status ?? 'pending',
    ]);
  }
  const titles = new Map();
  for (const item of items) {
    const key = item.title.trim().toLowerCase();
    titles.set(key, [...(titles.get(key) ?? []), item.id]);
  }
  for (const [title, ids] of titles) {
    if (ids.length > 1) issues.push(`同名条目（保留，不合并）：${title} → ${ids.join(', ')}`);
  }
  const lines = [
    '---',
    'type: docs',
    'title: 书单配图审计清单',
    'description: "uRead /booklists 全部条目的真实数据审计、视觉策划与生成清单。"',
    '---',
    '',
    '# 书单配图审计清单',
    '',
    `生成时间：${stamp()}`,
    '',
    `- 数据源：\`public/lists/booklists.json\`（39）+ \`public/lists/themes.json\`（10）`,
    `- 总数：**${items.length}**；无简介：${items.filter((i) => !String(i.description ?? '').trim()).length}；无书籍：${items.filter((i) => !i.books?.length).length}`,
    '- 现有策展封面：0（全部走确定性 SVG）；图片将写入 `public/media/booklists/<id>.webp`，经 `media/curated-manifest.json` 接入。',
    '- 完整提示词见 `media/booklist-art-plan.json`，逐张生成记录见 `docs/audit/booklist-art-run.log`。',
    '- 生成提示词只用英文主题语义，不传入中文标题/书名（实测会让模型把文字画进图片）；真实数据仍完整保存在清单中供审计。',
    '',
    '| booklist_id | title | description | books | theme | visual_concept | image_prompt (节选) | image_path | status |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`),
    '',
    '## 审计备注',
    '',
    ...issues.map((issue) => `- ${issue}`),
    '',
  ];
  return lines.join('\n');
}

async function ensurePlan() {
  const items = await loadItems();
  const concepts = await readJson(CONCEPT_FILE, { concepts: {} });
  const themeEn = await readJson('media/booklist-art-theme-en.json', { themes: {} });
  const existing = await readJson(PLAN_FILE, { items: [] });
  const byId = new Map(existing.items.map((entry) => [entry.id, entry]));
  const planItems = items.map((item) => {
    const concept = concepts.concepts?.[item.id];
    if (!concept) throw new Error(`缺少视觉策划：${item.id} ${item.title}`);
    const theme = themeEn.themes?.[item.id];
    if (!theme) throw new Error(`缺少英文主题：${item.id} ${item.title}`);
    const previous = byId.get(item.id);
    const src = `media/booklists/${item.id}.webp`;
    const local = path.join(ROOT, 'public', src);
    const status = existsSync(local) && previous?.status === 'success' ? 'success' : 'pending';
    return {
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: String(item.description ?? '').replace(/\s+/g, ' ').trim(),
      books: (item.books ?? []).slice(0, 10).map((book) => ({ name: book.name, author: book.author, detail: book.detail ?? '' })),
      theme: concept.theme,
      theme_en: theme,
      keywords: concept.keywords,
      visual_concept: concept.visual_concept,
      image_prompt: buildPrompt(concept),
      image_path: src,
      status,
      attempts: previous?.attempts ?? 0,
      error: status === 'success' ? '' : '',
      generated_at: status === 'success' ? previous?.generated_at ?? '' : '',
      elapsed_ms: status === 'success' ? previous?.elapsed_ms ?? 0 : 0,
      bytes: status === 'success' ? previous?.bytes ?? 0 : 0,
    };
  });
  const plan = { generated_at: stamp(), model: MODEL, size: SIZE, items: planItems };
  await writeJson(PLAN_FILE, plan);
  await writeFile(path.join(ROOT, AUDIT_FILE), audit(items, concepts, plan), 'utf8');
  return plan;
}

function detectExtension(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new Error('未知的返回图片格式');
}

async function generateImage(prompt) {
  const response = await fetch(`${API}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, size: SIZE, n: 1 }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const payload = await response.json();
  const image = payload?.data?.[0];
  if (!image) throw new Error('API 未返回图片数据');
  if (image.b64_json) return Buffer.from(image.b64_json, 'base64');
  if (image.url) {
    const downloaded = await fetch(image.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!downloaded.ok) throw new Error(`图片下载失败 HTTP ${downloaded.status}`);
    return Buffer.from(await downloaded.arrayBuffer());
  }
  throw new Error('API 返回既无 url 也无 b64_json');
}

async function addManifestEntry(entry) {
  const manifest = await readJson(MANIFEST_FILE, { schema_version: 1, assets: {} });
  manifest.assets[`${entry.kind}:${entry.id}`] = {
    type: entry.kind,
    src: entry.image_path,
    source_type: 'ai_generated',
    attribution: 'minimax-h3-image · 按真实书单内容策划',
    alt: `${entry.title} 书单封面`,
    is_official_cover: false,
    is_ai_generated: true,
    review_status: 'approved',
  };
  await writeJson(MANIFEST_FILE, manifest);
}

async function generate(plan) {
  const limit = Number(flagValue('--limit') ?? 0);
  const only = flagValue('--only');
  await mkdir(ORIGINAL_DIR, { recursive: true });
  await mkdir(WEBP_DIR, { recursive: true });
  let processed = 0;
  let failed = 0;
  for (const entry of plan.items) {
    if (only && entry.id !== only) continue;
    if (existsSync(path.join(ROOT, 'public', entry.image_path)) && entry.status === 'success') continue;
    if (limit && processed >= limit) break;
    processed += 1;
    const started = Date.now();
    let lastError = '';
    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      try {
        const buffer = await generateImage(entry.image_prompt);
        const ext = detectExtension(buffer);
        const original = path.join(ORIGINAL_DIR, `${entry.id}.${ext}`);
        await writeFile(original, buffer);
        const webp = path.join(ROOT, 'public', entry.image_path);
        execFileSync('python3', [path.join(ROOT, 'scripts', 'booklist-art-convert.py'), original, webp], { stdio: 'pipe' });
        entry.status = 'success';
        entry.attempts = (entry.attempts ?? 0) + 1;
        entry.error = '';
        entry.generated_at = stamp();
        entry.elapsed_ms = Date.now() - started;
        entry.bytes = buffer.length;
        await addManifestEntry(entry);
        await log(`OK ${entry.id} ${entry.title} · ${Math.round(entry.elapsed_ms / 1000)}s · ${Math.round(buffer.length / 1024)}KB`);
        break;
      } catch (error) {
        lastError = String(error?.message ?? error);
        await log(`FAIL ${entry.id} ${entry.title} · 第 ${attempt}/${RETRIES} 次 · ${lastError}`);
        if (attempt === RETRIES) {
          failed += 1;
          entry.status = 'failed';
          entry.error = lastError;
          entry.attempts = (entry.attempts ?? 0) + 1;
        }
      }
    }
    await writeJson(PLAN_FILE, plan);
  }
  await log(`本轮结束：处理 ${processed}，失败 ${failed}，成功 ${processed - failed}`);
}

async function status(plan) {
  const counts = plan.items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`书单配图：${plan.items.length} 项`, counts);
  for (const item of plan.items.filter((row) => row.status === 'failed')) {
    console.log(`FAILED ${item.id} ${item.title}: ${item.error}`);
  }
}

const plan = await ensurePlan();
if (args.includes('--audit')) {
  console.log(`审计清单已写入 ${AUDIT_FILE}，完整提示词已写入 ${PLAN_FILE}（${plan.items.length} 项）`);
} else if (args.includes('--generate')) {
  await generate(plan);
} else {
  await status(plan);
}
