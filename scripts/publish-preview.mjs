#!/usr/bin/env node
/** 发布预览：只打印与已批准基线的差异，不写任何产物、不修改基线。 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffAgainstBaseline, scanSensitive } from './publish-policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const notes = JSON.parse(await readFile(path.join(ROOT, 'public/notes/notes.json'), 'utf8'));
const baseline = JSON.parse(await readFile(path.join(ROOT, 'publishing/approved-baseline.json'), 'utf8'));
const policy = JSON.parse(await readFile(path.join(ROOT, 'publishing/policy.json'), 'utf8'));
const diff = diffAgainstBaseline(notes, baseline);
const changed = new Set([...diff.added, ...diff.modified].map((item) => item.slug));
const sensitive = notes
  .filter((note) => changed.has(note.slug))
  .flatMap((note) => scanSensitive(note, policy).map((hit) => `- ${hit.rule} @ ${note.slug}`));
const show = (label, items) => {
  console.log(`${label}（${items.length}）`);
  for (const item of items.slice(0, 20)) console.log(`  ${item.slug}`);
  if (items.length > 20) console.log(`  … 另有 ${items.length - 20} 条`);
};
console.log('发布预览（不修改任何文件）');
show('新增', diff.added);
show('修改', diff.modified);
show('删除', diff.removed);
console.log(`新增/修改笔记敏感命中（${sensitive.length}）`);
for (const line of sensitive.slice(0, 20)) console.log(`  ${line}`);
if (!diff.added.length && !diff.modified.length && !diff.removed.length && !sensitive.length) {
  console.log('与已批准基线一致，无待审批变更。');
}
