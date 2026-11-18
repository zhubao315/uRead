/**
 * 合成示例库测试。
 *
 * 重点不是「能写进库里」，而是示例数据本身必须诚实且自洽：
 * 每条笔记的引文必须能在示例正文里逐字找到（否则示例库自己在伪造引用），
 * 每张卡片的关系必须指向真实存在的笔记，且所有条目都带合成标签。
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { STORES, clear } from '../../src/data/db';
import * as repo from '../../src/data/repository';
import {
  SAMPLE_TAG,
  hasSampleLibrary,
  loadSampleLibrary,
  removeSampleLibrary,
  validateSampleLibrary,
} from '../../src/data/sample';

async function clearAll() {
  await Promise.all(STORES.map((store) => clear(store)));
}

describe('合成示例库', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('加载后条目数量与文档声明一致，且全部带合成标签', async () => {
    const counts = await loadSampleLibrary();
    expect(counts).toMatchObject({ books: 3, notes: 6, cards: 5, booklists: 1, relations: 5 });
    expect(counts.skipped).toBe(false);

    const books = await repo.listBooks();
    const notes = await repo.listNotes();
    const cards = await repo.listCards();
    for (const item of [...books, ...notes, ...cards]) {
      expect(item.metadata.tags ?? []).toContain(SAMPLE_TAG);
    }
  });

  it('幂等：重复加载不会写入第二份示例数据', async () => {
    await loadSampleLibrary();
    const second = await loadSampleLibrary();

    expect(second.skipped).toBe(true);
    expect((await repo.listBooks()).length).toBe(3);
    expect((await repo.listNotes()).length).toBe(6);
  });

  it('每条笔记的引文都能在所属书的正文里逐字找到', async () => {
    await loadSampleLibrary();
    const books = await repo.listBooks();
    const notes = await repo.listNotes();

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      const book = books.find((item) => item.id === note.book_id);
      expect(book, `笔记「${note.title}」缺少所属图书`).toBeDefined();
      expect(note.anchors.length).toBeGreaterThan(0);
      for (const anchor of note.anchors) {
        expect(anchor.kind).toBe('text_quote');
        const quote = anchor.quote ?? '';
        expect(quote.length).toBeGreaterThan(0);
        expect(book?.body ?? '').toContain(quote);
      }
    }
  });

  it('每张卡片都有指向真实笔记的 derived_from 关系记录', async () => {
    await loadSampleLibrary();
    const cards = await repo.listCards();
    const notes = await repo.listNotes();
    const noteIds = new Set(notes.map((note) => note.id));

    for (const card of cards) {
      const relations = await repo.listRelations(card.id);
      expect(relations.length, `卡片「${card.title}」没有派生关系`).toBeGreaterThan(0);
      for (const relation of relations) {
        expect(relation.type).toBe('derived_from');
        expect(noteIds.has(relation.target_id)).toBe(true);
      }
      // 卡片内嵌 relations 与关系表必须一致，否则导出与图谱会分叉
      expect(card.relations.length).toBe(relations.length);
    }
  });

  it('每个示例条目都带 source_refs（可追溯字段不允许为空）', async () => {
    await loadSampleLibrary();
    const items = [...(await repo.listBooks()), ...(await repo.listNotes()), ...(await repo.listCards())];
    for (const item of items) {
      expect(item.source_refs.length, `${item.title} 缺少来源`).toBeGreaterThan(0);
      expect(item.source_refs[0].content_hash).toBeTruthy();
    }
  });

  it('书单收录全部示例图书', async () => {
    await loadSampleLibrary();
    const lists = await repo.listBookLists();
    expect(lists.length).toBe(1);
    expect(lists[0].tags).toContain(SAMPLE_TAG);
    expect(lists[0].book_ids.length).toBe((await repo.listBooks()).length);
  });

  it('校验器对刚加载的示例库报告零问题', async () => {
    await loadSampleLibrary();
    const issues = validateSampleLibrary({
      books: await repo.listBooks(),
      notes: await repo.listNotes(),
      cards: await repo.listCards(),
      relations: await repo.listRelations(),
    });
    expect(issues).toEqual([]);
  });

  it('校验器能发现悬空关系与缺失锚点（示例库自身也要能被审计）', () => {
    const now = repo.nowIso();
    const book = {
      id: 'book-1',
      type: 'book' as const,
      title: '合成示例·测试',
      content: '',
      source_refs: [],
      relations: [],
      metadata: { tags: [SAMPLE_TAG] },
      version: '1.0.0',
      status: 'candidate' as const,
      created_at: now,
      updated_at: now,
      reading_status: 'reading' as const,
    };
    const note = {
      ...book,
      id: 'note-1',
      type: 'note' as const,
      book_id: 'missing-book',
      anchors: [],
      note_kind: 'note' as const,
    };

    const issues = validateSampleLibrary({
      books: [book],
      // 笔记指向不存在的图书且没有锚点
      notes: [Object.assign({}, note, { type: 'note' })],
      cards: [],
      relations: [
        {
          id: 'rel-1',
          type: 'derived_from',
          source_id: 'book-1',
          target_id: 'ghost-note',
          created_at: now,
        },
      ],
    });
    const kinds = issues.map((issue) => issue.kind);
    expect(kinds).toContain('missing_book');
    expect(kinds).toContain('empty_anchor');
    expect(kinds).toContain('missing_relation_target');
  });

  it('清除示例数据只删示例，真实数据不受影响', async () => {
    await loadSampleLibrary();
    const realBook = await repo.createBook({ title: '我真实在读的书' });
    const realNote = await repo.createNote({ title: '我真实的笔记', content: '真实内容' });

    const removed = await removeSampleLibrary();
    expect(removed).toMatchObject({ books: 3, notes: 6, cards: 5, booklists: 1, relations: 5 });

    expect(await hasSampleLibrary()).toBe(false);
    const books = await repo.listBooks();
    expect(books.map((item) => item.id)).toEqual([realBook.id]);
    expect((await repo.listNotes()).map((item) => item.id)).toEqual([realNote.id]);
    // 示例关系记录必须一并清理，不能留下悬空端点
    expect(await repo.listRelations()).toEqual([]);
  });

  it('空库时 hasSampleLibrary 为 false，且示例正文的锚点行号确实可定位', async () => {
    expect(await hasSampleLibrary()).toBe(false);
    await loadSampleLibrary();

    const books = await repo.listBooks();
    const notes = await repo.listNotes();
    for (const note of notes) {
      const book = books.find((item) => item.id === note.book_id);
      const anchor = note.anchors[0];
      const match = /^第 (\d+) 行$/.exec(anchor.value ?? '');
      expect(match, `锚点位置写法异常：${anchor.value}`).toBeTruthy();
      const line = Number(match?.[1]);
      const bodyLine = (book?.body ?? '').split('\n')[line - 1];
      expect(bodyLine).toContain(anchor.quote ?? '');
    }
  });
});
