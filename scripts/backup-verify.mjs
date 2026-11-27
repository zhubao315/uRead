#!/usr/bin/env node
/**
 * backup-verify.mjs — read-only verification of a uRead JSON backup.
 *
 * It never opens IndexedDB, never writes files and never imports data.
 * Use it before a restore so a damaged or partial backup is rejected early.
 *
 * Usage: npm run backup:verify -- ./path/to/uread-library.json
 */
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import process from 'node:process';

const FILE = process.argv[2];
if (!FILE) {
  console.error('Usage: node scripts/backup-verify.mjs <backup.json>');
  process.exit(2);
}

const FORMAT = 'uread-library';
const STORES = [
  ['books', '资料'],
  ['notes', '笔记'],
  ['knowledge_cards', '知识卡片'],
  ['booklists', '书单'],
  ['reading_sessions', '阅读记录'],
  ['highlights', '划线'],
  ['annotations', '批注'],
  ['knowledge_relations', '知识关系'],
];
const errors = [];
const warnings = [];

const raw = await fs.readFile(FILE, 'utf8').catch((error) => {
  console.error(`[backup] cannot read ${FILE}: ${error.message}`);
  process.exit(2);
});
const checksum = createHash('sha256').update(raw).digest('hex');
let bundle;
try {
  bundle = JSON.parse(raw);
} catch (error) {
  console.error(`[backup] invalid JSON: ${String(error.message).slice(0, 160)}`);
  process.exit(1);
}

if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) errors.push('备份根节点必须是对象');
if (bundle?.format !== FORMAT) errors.push(`format 必须是 ${FORMAT}（实际 ${String(bundle?.format)}）`);
if (bundle?.version !== 2) {
  if (bundle?.version === 1) warnings.push('v1 备份缺少 4 类实体，恢复会永久丢失它们；建议先升级备份格式');
  else errors.push(`version 必须是 2（实际 ${String(bundle?.version)}）`);
}
const data = bundle?.data;
if (!data || typeof data !== 'object' || Array.isArray(data)) {
  errors.push('缺少 data 对象');
} else {
  const ids = new Map();
  const bookIds = new Set();
  for (const [key, label] of STORES) {
    const value = data[key];
    if (value === undefined) {
      errors.push(`缺少 ${label}（${key}）集合；缺键不等于空集合`);
      continue;
    }
    if (!Array.isArray(value)) {
      errors.push(`${label}（${key}）不是数组`);
      continue;
    }
    for (const [index, item] of value.entries()) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`${label}[${index}] 不是对象`);
        continue;
      }
      if (typeof item.id !== 'string' || !item.id) {
        errors.push(`${label}[${index}] 缺少字符串 id`);
        continue;
      }
      if (ids.has(item.id)) errors.push(`重复 id ${item.id}（${label}[${index}] 与 ${ids.get(item.id)}）`);
      else ids.set(item.id, label);
    }
  }
  if (Array.isArray(data.books)) for (const book of data.books) if (book?.id) bookIds.add(book.id);
  if (bookIds.size) {
    for (const [key, label] of STORES) {
      if (!Array.isArray(data[key])) continue;
      for (const [index, item] of data[key].entries()) {
        if (item?.book_id && !bookIds.has(item.book_id)) {
          errors.push(`${label}[${index}] 引用不存在的 book_id ${item.book_id}`);
        }
      }
    }
  }
  if (Array.isArray(data.booklists)) {
    for (const [index, list] of data.booklists.entries()) {
      for (const id of list?.book_ids ?? []) {
        if (!bookIds.has(id)) errors.push(`书单[${index}] 引用不存在的 book_id ${id}`);
      }
    }
  }
  if (Array.isArray(data.knowledge_relations)) {
    for (const [index, relation] of data.knowledge_relations.entries()) {
      for (const field of ['source_id', 'target_id']) {
        if (relation?.[field] && !ids.has(relation[field])) {
          errors.push(`知识关系[${index}] 引用不存在的 ${field} ${relation[field]}`);
        }
      }
    }
  }
  console.log('[backup] entity counts:');
  for (const [key, label] of STORES) {
    const value = data[key];
    console.log(`  ${label.padEnd(8)} ${Array.isArray(value) ? String(value.length).padStart(6) : '缺失'}`);
  }
}

console.log(`[backup] checksum sha256: ${checksum}`);
for (const warning of warnings) console.log(`[backup] WARN  ${warning}`);
if (errors.length) {
  for (const error of errors.slice(0, 40)) console.error(`[backup] ERROR ${error}`);
  if (errors.length > 40) console.error(`[backup] ... and ${errors.length - 40} more`);
  console.error(`[backup] FAILED: ${errors.length} problem(s). Do not restore this file.`);
  process.exit(1);
}
console.log('[backup] OK — safe to use for a restore dry-run.');
