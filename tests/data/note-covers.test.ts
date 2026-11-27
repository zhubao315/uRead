/** 公开笔记列表的封面映射：自著书稿四本必须有本地封面，不热链主站带 hash 的资源。 */
// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (file: string) => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));

describe('note-covers 自著书稿封面', () => {
  const own = readJson('media/own-book-covers.json').covers;
  const notes = readJson('media/note-covers.json').covers;

  it('四部书稿都按 slug 映射到封面', () => {
    expect(Object.keys(own)).toHaveLength(4);
    for (const slug of Object.keys(own)) {
      expect(notes[slug], `${slug} 缺少封面`).toBe(own[slug].src);
    }
  });

  it('封面源文件存在于 public（dist 产物由 media:validate 在构建后校验）', () => {
    for (const slug of Object.keys(own)) {
      const src = own[slug].src as string;
      expect(existsSync(path.join(ROOT, 'public', src)), `public/${src}`).toBe(true);
    }
  });
});
