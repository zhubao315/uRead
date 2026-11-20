/**
 * 文档与实现一致性测试。
 *
 * 目的：README 里写的数字与能力清单会变成**可执行断言**，
 * 一旦实现变化而文档没跟上，测试直接失败——避免文档变成化石。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { STORES, clear } from '../../src/data/db';
import * as repo from '../../src/data/repository';
import { SAMPLE_TAG, loadSampleLibrary } from '../../src/data/sample';
import { BASE_NAME, SITE_BASE, SITE_SLUG } from '../../src/config';

const ROOT = path.resolve(__dirname, '../..');
const README = readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
const VITE_CONFIG = readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');

beforeEach(async () => {
  // 每个用例都从空库开始：文档声明的数量必须能被「干净环境」复现
  await Promise.all(STORES.map((store) => clear(store)));
});

describe('README 与实现一致', () => {
  it('README 声明的示例库数量与真实加载结果一致', async () => {
    const counts = await loadSampleLibrary();
    const declared = {
      books: Number(/示例图书 \| (\d+) \|/.exec(README)?.[1]),
      notes: Number(/读书笔记 \| (\d+) \|/.exec(README)?.[1]),
      cards: Number(/知识卡片 \| (\d+) \|/.exec(README)?.[1]),
      relations: Number(/知识关系 \| (\d+) \|/.exec(README)?.[1]),
      booklists: Number(/书单 \| (\d+) \|/.exec(README)?.[1]),
    };

    expect(declared.books, 'README 的示例图书数量与实现不一致').toBe(counts.books);
    expect(declared.notes, 'README 的示例笔记数量与实现不一致').toBe(counts.notes);
    expect(declared.cards, 'README 的示例卡片数量与实现不一致').toBe(counts.cards);
    expect(declared.relations, 'README 的示例关系数量与实现不一致').toBe(counts.relations);
    expect(declared.booklists, 'README 的示例书单数量与实现不一致').toBe(counts.booklists);
  });

  it('README 标为已实现的能力，代码里必须有对应入口', () => {
    const source = [
      'src/data/repository.ts',
      'src/store/libraryStore.ts',
      'src/data/sample.ts',
      'src/views/LibraryView.tsx',
    ]
      .map((file) => readFileSync(path.join(ROOT, file), 'utf-8'))
      .join('\n');

    // README 里承诺的动作，必须能在实现里找到对应函数名
    const promised = [
      'createBook',
      'deleteBook',
      'createNote',
      'deleteNote',
      'createCard',
      'updateCard',
      'deleteCard',
      'createBookList',
      'deleteBookList',
      'addRelation',
      'deleteRelation',
      'exportBundle',
      'importBundle',
      'exportMarkdown',
      'importMarkdown',
      'resetLibrary',
      'loadSampleLibrary',
      'removeSampleLibrary',
    ];
    const missing = promised.filter((name) => !source.includes(name));
    expect(missing, `README 承诺但实现中缺失的函数：${missing.join(', ')}`).toEqual([]);

    // UI 必须真的暴露了示例库入口，而不是只有库函数
    expect(source).toContain('加载示例库（合成数据）');
    expect(source).toContain('清除示例数据');
  });

  it('README 提到的锚点类型必须在领域类型中定义', () => {
    const types = readFileSync(path.join(ROOT, 'src/data/types.ts'), 'utf-8');
    const mentioned = [...README.matchAll(/`(pdf_page|epub_cfi|text_quote|content_anchor|url_fragment|char_offset)`/g)]
      .map((match) => match[1]);

    expect(mentioned.length).toBeGreaterThan(0);
    for (const kind of new Set(mentioned)) {
      expect(types, `types.ts 未定义锚点类型 ${kind}`).toContain(`'${kind}'`);
    }
  });

  it('GitHub Pages 子路径配置必须同源且不漂移（config / vite / 路由 / 文档 URL）', () => {
    // base 不再是两处手写字面量：vite.config.ts 必须复用 src/config.ts 的常量
    expect(VITE_CONFIG).toMatch(/from '\.\/src\/config(\.ts)?'/);
    expect(VITE_CONFIG).toMatch(/base:\s*SITE_BASE/);

    expect(SITE_BASE).toBe('/uRead/');
    expect(BASE_NAME).toBe('/uRead');
    expect(SITE_BASE).toBe(`${BASE_NAME}/`);

    const url = /https:\/\/zhubao315\.github\.io\/(\w+)\//.exec(README)?.[1];
    expect(url, 'README 未声明 Pages 地址').toBe(SITE_SLUG);
  });

  it('README 的合成数据边界声明必须与实现使用的标签一致', () => {
    expect(README).toContain(SAMPLE_TAG);
    expect(README).toContain('不是真实阅读记录');
  });
});

describe('仓储层契约字段', () => {
  it('新建资产统一带共享契约的基类字段（导出即可被其它产品消费）', async () => {
    const book = await repo.createBook({ title: '契约字段检查' });
    const note = await repo.createNote({ title: '笔记', content: '内容', book_id: book.id });
    const card = await repo.createCard({ title: '卡片', content: '内容', book_id: book.id });

    for (const asset of [book, note, card]) {
      for (const field of ['id', 'type', 'title', 'content', 'source_refs', 'relations', 'metadata', 'version', 'status', 'created_at', 'updated_at']) {
        expect(asset, `${asset.title} 缺少字段 ${field}`).toHaveProperty(field);
      }
      expect(asset.metadata.origin).toBe('uread');
      expect(asset.status).toBe('candidate'); // 本地新建一律是候选，不能假装已审核
    }
  });

  it('导入导出的 bundle 带格式标识与版本号，且八类数据全在（README 的「完整恢复」）', async () => {
    await repo.createBook({ title: '导出检查' });
    const bundle = await repo.exportBundle();

    expect(bundle.format).toBe('uread-library');
    // 版本必须是 2：v1 的备份缺四类，README 就不能写「可回滚恢复」
    expect(bundle.version).toBe(2);
    expect(Object.keys(bundle.data).sort()).toEqual(
      [
        'annotations',
        'booklists',
        'books',
        'highlights',
        'knowledge_cards',
        'knowledge_relations',
        'notes',
        'reading_sessions',
      ].sort(),
    );
    expect(bundle.data.books).toHaveLength(1);

    await repo.resetLibrary();
    const result = await repo.importBundle(bundle);
    expect(result.complete).toBe(true);
    expect((await repo.listBooks()).map((item) => item.title)).toEqual(['导出检查']);
  });
});
