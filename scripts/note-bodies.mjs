/** 当前公开笔记的正文来源：notes.json 与 slugs.json 指向的 detail 文件，两者都要扫到。 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function currentNoteBodies(root) {
  const notes = JSON.parse(await readFile(path.join(root, 'public', 'notes', 'notes.json'), 'utf8'));
  const bodies = notes.map((note) => String(note.body ?? ''));
  try {
    const slugs = JSON.parse(await readFile(path.join(root, 'public', 'notes', 'slugs.json'), 'utf8'));
    for (const hash of new Set(Object.values(slugs))) {
      try {
        const detail = JSON.parse(await readFile(path.join(root, 'public', 'notes', 'detail', `${hash}.json`), 'utf8'));
        bodies.push(String(detail.body ?? ''));
      } catch {
        // 详情文件缺失时不影响 notes.json 正文的可读性，交给发布检查另行报告。
      }
    }
  } catch {
    // 没有 slugs.json 的环境（例如早期产物）只用 notes.json。
  }
  return bodies;
}
