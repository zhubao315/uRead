/**
 * GitHub Pages 的 SPA 回退：
 * 深层路由（如 /uRead/notes）请求的是不存在的文件，
 * Pages 会返回 404.html；把 index.html 复制为 404.html 后，
 * 前端路由即可正常接管，直接刷新深层页面不再 404。
 */
import { copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const index = resolve(dist, 'index.html');
const fallback = resolve(dist, '404.html');

try {
  await access(index);
  await copyFile(index, fallback);
  console.log('[uRead] 已生成 dist/404.html（Pages 深层路由回退）');
} catch (error) {
  console.error('[uRead] 生成 404.html 失败：', error);
  process.exit(1);
}
