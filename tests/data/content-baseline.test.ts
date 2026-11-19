/** 内容保全门禁：数量/哈希对不上必须红，不允许靠改基线数字蒙混。 */
// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compareBaseline } from '../../scripts/content-baseline.mjs';

const root = path.resolve(__dirname, '../..');
import type { ContentSnapshot, HashItem } from '../../scripts/content-baseline.mjs';
const baseline: ContentSnapshot = JSON.parse(readFileSync(path.join(root, 'publishing/content-baseline.json'), 'utf8'));
const inventory: ContentSnapshot = JSON.parse(readFileSync(path.join(root, 'docs/migration/content-inventory.json'), 'utf8'));

describe('迁移前内容基线', () => {
  it('当前产物与盘点基线逐项一致', () => {
    expect(compareBaseline(inventory, baseline)).toEqual([]);
  });

  it('数量减少会报红', () => {
    const changed = { ...inventory, counts: { ...inventory.counts, notes: inventory.counts.notes - 1 } };
    expect(compareBaseline(changed, baseline).join('\n')).toContain('数量 notes');
  });

  it('逐篇内容哈希变更也会报红', () => {
    const changed = {
      ...inventory,
      hashes: {
        ...inventory.hashes,
        notes: (inventory.hashes.notes ?? []).map((item: HashItem, index: number) =>
          index === 0 ? { ...item, hash: `${item.hash}x` } : item),
      },
    };
    expect(compareBaseline(changed, baseline).join('\n')).toContain('内容变更 notes');
  });
});
