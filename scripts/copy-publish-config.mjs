#!/usr/bin/env node
/** 把发布侧配置复制到静态产物，避免 SPA fallback 用 HTML 冒充 JSON。 */
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(ROOT, 'dist', 'publishing');
await mkdir(target, { recursive: true });
for (const name of ['homepage.json', 'policy.json']) {
  await copyFile(path.join(ROOT, 'publishing', name), path.join(target, name));
}
console.log('发布配置已复制到 dist/publishing/');
