#!/usr/bin/env node
/** 发版前对账：内容基线、manifest、路由回退、书籍索引四项必须一致。 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareBaseline } from './content-baseline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));
const baseline = await readJson('publishing/content-baseline.json');
const inventory = await readJson('docs/migration/content-inventory.json');
const notesManifest = await readJson('public/notes/manifest.json');
const listsManifest = await readJson('public/lists/manifest.json');
const aggregate = await readJson('dist/books/aggregate.json');

const problems = [...compareBaseline(inventory, baseline)];
if (notesManifest.note_count !== inventory.counts.notes) problems.push('笔记 manifest 数量与盘点不一致');
if (notesManifest.audio_count !== inventory.counts.audio_files) problems.push('音频 manifest 数量与盘点不一致');
if (listsManifest.theme_count !== inventory.counts.themes) problems.push('主题 manifest 数量与盘点不一致');
if (listsManifest.booklist_count !== inventory.counts.booklists) problems.push('书单 manifest 数量与盘点不一致');
const fallbackCount = (await readdir(path.join(ROOT, 'dist/read'), { recursive: true }))
  .filter((name) => name.endsWith('index.html')).length;
if (fallbackCount < inventory.counts.notes) problems.push(`深链回退 ${fallbackCount} < 笔记数 ${inventory.counts.notes}`);
if (aggregate.summary.book_count < inventory.counts.booklist_items) problems.push('书籍索引条目少于书单书目条目');

const lines = [
  '---',
  'type: docs',
  'title: 发版内容对账',
  'description: "迁移前后数量、逐项哈希、深链回退与书籍索引的最终对账结果。"',
  '---',
  '',
  `生成时间：${new Date().toISOString()}`,
  '',
  '| 对账项 | 基线 | 当前 | 结果 |',
  '| --- | ---: | ---: | --- |',
  `| 笔记 | ${baseline.counts.notes} | ${inventory.counts.notes} | ${baseline.counts.notes === inventory.counts.notes ? '一致' : '不一致'} |`,
  `| 主题 | ${baseline.counts.themes} | ${inventory.counts.themes} | ${baseline.counts.themes === inventory.counts.themes ? '一致' : '不一致'} |`,
  `| 书单 | ${baseline.counts.booklists} | ${inventory.counts.booklists} | ${baseline.counts.booklists === inventory.counts.booklists ? '一致' : '不一致'} |`,
  `| 音频 | ${baseline.counts.audio_files} | ${inventory.counts.audio_files} | ${baseline.counts.audio_files === inventory.counts.audio_files ? '一致' : '不一致'} |`,
  `| 逐项哈希 | ${baseline.hashes.notes.length + baseline.hashes.lists.length + baseline.hashes.audio.length} 项 | 逐项比对 | ${problems.length ? '有差异' : '全部一致'} |`,
  `| 深链回退 | ≥${inventory.counts.notes} | ${fallbackCount} | ${fallbackCount >= inventory.counts.notes ? '通过' : '未通过'} |`,
  `| 书籍索引 | ≥${inventory.counts.booklist_items} | ${aggregate.summary.book_count} | ${aggregate.summary.book_count >= inventory.counts.booklist_items ? '通过' : '未通过'} |`,
  '',
  problems.length ? `问题：\n${problems.map((p) => `- ${p}`).join('\n')}` : '结论：内容完整，允许发布。',
  '',
  '原始内容哈希与计数见 `content-inventory.json`；同名候选与未解析书目均按原样保留，不自动合并。',
];
await writeFile(path.join(ROOT, 'docs/migration/reconciliation.md'), lines.join('\n'), 'utf8');
console.log(problems.length ? `对账未通过：${problems.join('；')}` : '对账通过：内容完整，允许发布');
if (problems.length) process.exit(1);
