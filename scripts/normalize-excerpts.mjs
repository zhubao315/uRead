#!/usr/bin/env node
/**
 * 用公开笔记正文重建 index.json 的摘要，清理 Obsidian 标记语法。
 * 正文仍是唯一来源：文本更新后重跑本脚本（或直接跑 build）即可让列表 / 首页 / RSS 同步。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { excerptFromBody } from './plain-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOTES = path.join(ROOT, 'public', 'notes', 'notes.json');
const INDEX = path.join(ROOT, 'public', 'notes', 'index.json');

const notes = JSON.parse(await readFile(NOTES, 'utf8'));
const index = JSON.parse(await readFile(INDEX, 'utf8'));
const bodies = new Map(notes.map((note) => [note.slug, note.body ?? '']));

let changed = 0;
for (const item of index) {
  const excerpt = excerptFromBody(bodies.get(item.slug) ?? item.excerpt ?? '', 160);
  if (item.excerpt !== excerpt) {
    item.excerpt = excerpt;
    changed += 1;
  }
}
await writeFile(INDEX, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
console.log(`摘要已按正文重建：${index.length} 篇，更新 ${changed} 篇`);
