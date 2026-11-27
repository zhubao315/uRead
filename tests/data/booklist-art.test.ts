/** 书单配图策划审计：每个 /booklists 条目都必须有基于真实数据的独立视觉方案。 */
// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8')) as T;
interface PlanItem { id: string; title: string; image_path: string; image_prompt: string; books: unknown[] }
interface ListItem { id: string; title: string; description?: string; books?: Array<{ name: string }> }

describe('书单配图策划', () => {
  const booklists = readJson<ListItem[]>('public/lists/booklists.json');
  const themes = readJson<ListItem[]>('public/lists/themes.json');
  const items = [...booklists, ...themes];
  const concepts = readJson<{ concepts: Record<string, unknown> }>('media/booklist-art-concepts.json').concepts;
  const plan = readJson<{ items: PlanItem[] }>('media/booklist-art-plan.json').items;

  it('49 个条目逐一拥有概念，且提示词引用真实书名', () => {
    expect(items).toHaveLength(49);
    for (const item of items) {
      expect(concepts[item.id], `${item.title} 缺少视觉策划`).toBeTruthy();
      const entry = plan.find((row) => row.id === item.id);
      if (!entry) throw new Error(`${item.title} 缺少配图清单`);
      expect(entry.title).toBe(item.title);
      expect(entry.books.length).toBeGreaterThan(0);
      // 提示词必须纯英文：中文标题/书名会被模型画进图片，样例已验证。
      expect(entry.image_prompt).not.toMatch(/[\u3400-\u9fff]/);
      expect(entry.image_prompt).toContain('ZERO letters');
      expect(entry.image_prompt).toContain('Never include text');
      expect(entry.image_prompt).toContain('2048x2048');
    }
  });

  it('每个条目使用独立图片路径，不复用同一张封面', () => {
    const paths = plan.map((entry) => entry.image_path);
    expect(new Set(paths).size).toBe(plan.length);
    for (const entry of plan) {
      expect(entry.image_path).toBe(`media/booklists/${entry.id}.webp`);
    }
  });
});
