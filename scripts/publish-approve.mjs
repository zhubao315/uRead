#!/usr/bin/env node
/**
 * 人工批准当前公开内容（唯一允许更新审批基线的入口）。
 * 必须显式设置 APPROVE=1，避免被 CI 或普通扫描误调用。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

if (process.env.APPROVE !== '1') {
  console.error('拒绝执行：批准发布必须显式设置 APPROVE=1（仅人工执行，不在 CI 中调用）');
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const notes = JSON.parse(await readFile(path.join(ROOT, 'public/notes/notes.json'), 'utf8'));
const previous = JSON.parse(await readFile(path.join(ROOT, 'publishing/approved-baseline.json'), 'utf8'));
const baseline = {
  version: 1,
  approved_at: new Date().toISOString(),
  scope: '07-SOURCES/71-书籍',
  note_count: notes.length,
  notes: notes.map((note) => ({
    slug: note.slug,
    content_hash: note.content_hash,
    source_path: note.source_ref?.path ?? '',
  })),
  // 保留上一次已批准的音频哈希（含暂时孤儿），避免 TTS 停机造成反复告警
  audio: { ...(previous.audio ?? {}), ...Object.fromEntries(notes.filter((note) => note.audio).map((note) => [note.content_hash, note.slug])) },
};
await writeFile(
  path.join(ROOT, 'publishing', 'approved-baseline.json'),
  JSON.stringify(baseline, null, 2) + '\n',
  'utf8',
);
console.log(`已批准 ${notes.length} 篇公开笔记与 ${Object.keys(baseline.audio).length} 个音频哈希。请复核 git diff 后提交。`);
