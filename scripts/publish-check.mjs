#!/usr/bin/env node
/**
 * 发布治理检查（默认 dry-run，不写公开产物）。
 *
 * 用法：
 *   npm run publish:check                 # 只打印结论，不落盘
 *   npm run publish:check -- --write      # 写 publishing/report.json + PREVIEW.md（本地，不进 Pages）
 *   npm run publish:check -- --strict     # 有未授权/敏感/孤儿音频时退出码 1
 *
 * 重要：本脚本**不会删除或修改 public/ 下任何文件**。
 * 撤销发布是单独动作，必须显式执行并人工确认；这样「检查」不会意外下线线上内容。
 */

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { audioOrphans, evaluate } from './publish-policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY = path.join(ROOT, 'publishing', 'policy.json');
const NOTES = path.join(ROOT, 'public', 'notes', 'notes.json');
const AUDIO = path.join(ROOT, 'public', 'audio');
const OUT = path.join(ROOT, 'publishing');

const args = process.argv.slice(2);
const write = args.includes('--write');
const strict = args.includes('--strict');

const policy = JSON.parse(await readFile(POLICY, 'utf8'));
const notes = JSON.parse(await readFile(NOTES, 'utf8'));
const audioFiles = await readdir(AUDIO).catch(() => []);
const hashToSlug = Object.fromEntries(notes.map((note) => [note.content_hash, note.slug]));

const result = evaluate(notes, policy);
const orphans = audioOrphans(
  audioFiles.filter((name) => name.endsWith('.wav')).map((name) => name.replace(/\.wav$/, '')),
  result.allowed,
  hashToSlug,
);
const report = {
  generated_at: new Date().toISOString(),
  policy_version: policy.version,
  mode: result.mode,
  note_count: result.total,
  allowed_count: result.allowed.length,
  blocked_count: result.blocked.length,
  sensitive_hits: result.sensitive.length,
  audio_orphans: orphans,
  blocked: result.blocked,
  sensitive: result.sensitive.map((hit) => ({ rule: hit.rule, slug: hit.slug })),
  warning: policy.mode === 'allow_all_legacy'
    ? '当前仍沿用「全量公开」历史模式；治理工具已就位，但默认拒绝尚未切换。'
    : '',
};

console.log(`发布检查：${result.total} 篇笔记 / 允许 ${result.allowed.length} / 拦截 ${result.blocked.length}`);
console.log(`  模式：${result.mode}${report.warning ? `（${report.warning}）` : ''}`);
console.log(`  敏感命中：${result.sensitive.length} 处；孤儿音频：${orphans.length} 个`);
if (result.blocked.length) {
  console.log('  拦截样例（只列 slug，不列正文）：');
  for (const item of result.blocked.slice(0, 10)) console.log(`    - ${item.slug}（${item.reason}）`);
}

if (write) {
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  const first = result.blocked.slice(0, 20).map((b) => `- ${b.slug}（${b.reason}）`).join('\n') || '- 无';
  await writeFile(
    path.join(OUT, 'PREVIEW.md'),
    `# 发布预览\n\n生成时间：${report.generated_at}\n\n- 模式：${result.mode}\n- 笔记：${result.total}\n- 允许：${result.allowed.length}\n- 拦截：${result.blocked.length}\n- 敏感命中：${result.sensitive.length}\n- 孤儿音频：${orphans.length}\n\n## 拦截样例\n\n${first}\n`,
    'utf8',
  );
  console.log('  已写本地报告（不会发布到 Pages）');
}

if (strict && (result.blocked.length || orphans.length)) {
  console.error('严格模式：发布检查未通过');
  process.exit(1);
}
