import { beforeEach, describe, expect, it } from 'vitest';

import { clear, getAll, getById, put, remove } from '../../src/data/db';
import * as repo from '../../src/data/repository';

describe('IndexedDB 基础操作', () => {
  beforeEach(async () => {
    await Promise.all([
      clear('books'),
      clear('notes'),
      clear('knowledgeCards'),
      clear('booklists'),
      clear('knowledgeRelations'),
      clear('readingSessions'),
      clear('highlights'),
      clear('annotations'),
    ]);
  });

  it('写入后可按主键读回', async () => {
    const book = await repo.createBook({ title: '深入理解计算机系统' });
    const fetched = await getById<{ title: string }>('books', book.id);
    expect(fetched?.title).toBe('深入理解计算机系统');
  });

  it('删除后不可再读回', async () => {
    const book = await repo.createBook({ title: '待删除书籍' });
    await remove('books', book.id);
    expect(await getById('books', book.id)).toBeUndefined();
  });

  it('清空表后为空', async () => {
    await repo.createBook({ title: 'A' });
    await repo.createBook({ title: 'B' });
    expect((await getAll('books')).length).toBe(2);
    await clear('books');
    expect((await getAll('books')).length).toBe(0);
  });

  it('put 会覆盖同主键记录', async () => {
    const book = await repo.createBook({ title: '原始标题' });
    await put('books', { ...book, title: '新标题' });
    const fetched = await getById<{ title: string }>('books', book.id);
    expect(fetched?.title).toBe('新标题');
  });
});

describe('图书与笔记 CRUD', () => {
  beforeEach(async () => {
    await repo.resetLibrary();
  });

  it('创建图书带有版本、时间戳与候选状态', async () => {
    const book = await repo.createBook({ title: '设计模式', author: 'Gang of Four' });
    expect(book.type).toBe('book');
    expect(book.status).toBe('candidate');
    expect(book.version).toBe('1.0.0');
    expect(book.created_at).toBeTruthy();
  });

  it('更新内容时版本号递增', async () => {
    const book = await repo.createBook({ title: '设计模式' });
    const updated = await repo.updateBook(book.id, { title: '设计模式（第二版）' });
    expect(updated.version).toBe('2.0.0');
    expect(updated.updated_at >= book.updated_at).toBe(true);
  });

  it('创建笔记可携带原文锚点与来源', async () => {
    const book = await repo.createBook({ title: '深入理解计算机系统' });
    const note = await repo.createNote({
      title: '虚拟内存',
      content: '虚拟内存提供了抽象层。',
      book_id: book.id,
      note_kind: 'highlight',
      anchors: [{ kind: 'pdf_page', value: '128', page: 128 }],
      source_refs: [
        {
          source_id: `book:${book.id}`,
          title: '深入理解计算机系统',
          retrieved_at: new Date().toISOString(),
          source_type: 'book',
          credibility: 'unknown',
          content_hash: '',
          anchors: [{ kind: 'pdf_page', value: '128', page: 128 }],
        },
      ],
    });

    expect(note.anchors[0].page).toBe(128);
    expect(note.source_refs).toHaveLength(1);
    expect(note.source_refs[0].credibility).toBe('unknown');
  });

  it('删除图书会级联删除其笔记与卡片', async () => {
    const book = await repo.createBook({ title: '待清理' });
    await repo.createNote({ title: '笔记', content: '内容', book_id: book.id });
    await repo.createCard({ title: '卡片', content: '内容', book_id: book.id });

    await repo.deleteBook(book.id);

    expect(await repo.listNotes()).toHaveLength(0);
    expect(await repo.listCards()).toHaveLength(0);
  });

  it('可以按图书与类型过滤笔记', async () => {
    const book = await repo.createBook({ title: '过滤器' });
    await repo.createNote({ title: '高亮', content: 'x', book_id: book.id, note_kind: 'highlight' });
    await repo.createNote({ title: '总结', content: 'y', book_id: book.id, note_kind: 'summary' });

    expect(await repo.listNotes({ book_id: book.id })).toHaveLength(2);
    expect(await repo.listNotes({ note_kind: 'summary' })).toHaveLength(1);
  });
});

describe('知识卡片与关系', () => {
  beforeEach(async () => {
    await repo.resetLibrary();
  });

  it('卡片默认待核验，可标记已核验', async () => {
    const card = await repo.createCard({ title: 'SOLID', content: '五个基本原则' });
    expect(card.reviewed).toBe(false);
    const updated = await repo.updateCard(card.id, { reviewed: true });
    expect(updated.reviewed).toBe(true);
    expect(updated.version).toBe('2.0.0');
  });

  it('可以建立并查询知识关系', async () => {
    const card = await repo.createCard({ title: '概念', content: '内容' });
    const note = await repo.createNote({ title: '笔记', content: '内容' });
    const relation = await repo.addRelation('derived_from', card.id, note.id);

    const relations = await repo.listRelations(card.id);
    expect(relations).toHaveLength(1);
    expect(relations[0].type).toBe('derived_from');
    expect(relation.target_id).toBe(note.id);
  });
});

describe('导入导出', () => {
  beforeEach(async () => {
    await repo.resetLibrary();
  });

  it('JSON 导出后可完整恢复（八类数据一项都不能少）', async () => {
    // 回归：v1 备份只装四类实体，而「清空本地数据」写着「请先导出备份」——
    // 照着做的人会在毫不知情中永久失去阅读记录、划线、批注与知识关系。
    const book = await repo.createBook({ title: '导出测试', author: '作者' });
    const note = await repo.createNote({ title: '导出的笔记', content: '正文', note_kind: 'summary' });
    const card = await repo.createCard({ title: '导出的卡片', content: '正文' });
    await repo.createBookList({ title: '导出书单' });
    await repo.startSession(book.id, 30);
    await repo.addHighlight(book.id, { kind: 'text_quote', value: '第一段', quote: '原文引用' }, '原文引用');
    await put('annotations', {
      id: 'anno_export_1',
      type: 'highlight',
      book_id: book.id,
      anchor: { kind: 'text_quote', value: '第一段' },
      body: '这里的假设是单库单表',
    });
    await repo.addRelation('derived_from', card.id, note.id);

    const before = await repo.libraryInventory();
    expect(before.reading_sessions).toBe(1);
    expect(before.highlights).toBe(1);
    expect(before.annotations).toBe(1);
    expect(before.knowledge_relations).toBe(1);

    const bundle = await repo.exportBundle();
    expect(bundle.format).toBe('uread-library');
    expect(bundle.version).toBe(2);
    expect(bundle.data.knowledge_relations).toHaveLength(1);
    expect(bundle.data.reading_sessions).toHaveLength(1);

    await repo.resetLibrary();
    expect((await repo.libraryInventory()).total).toBe(0);

    const result = await repo.importBundle(bundle);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.restored_total).toBe(before.total);

    const after = await repo.libraryInventory();
    expect(after).toEqual(before);
    expect((await repo.listBooks())[0].title).toBe('导出测试');
    expect(await repo.listRelations()).toHaveLength(1);
  });

  it('v1 备份导入必须点名「哪些类型没回来」，不能报「恢复成功」', async () => {
    await repo.createBook({ title: '老备份里的书' });
    const book = (await repo.listBooks())[0];
    await repo.startSession(book.id, 10);

    // 手工构造 v1 形态：没有那四个键（不是空数组，是压根不存在）
    const v1 = {
      format: 'uread-library',
      version: 1,
      exported_at: '2026-01-01T00:00:00.000Z',
      data: { books: [book], notes: [], knowledge_cards: [], booklists: [] },
    } as never;

    await repo.resetLibrary();
    const result = await repo.importBundle(v1);

    expect(result.complete).toBe(false);
    expect(result.bundle_version).toBe(1);
    expect(result.missing).toEqual(['阅读记录', '划线', '批注', '知识关系']);
    expect(result.restored.books).toBe(1);
  });

  it('删除卡片 / 笔记 / 图书会连带删掉关系边（确认框是这么承诺的）', async () => {
    // 回归：KnowledgeCard.tsx 的确认写着「关系会一起删除」，而仓储只删实体。
    // 孤儿边让界面报「0 条关系」而数据库里仍有行，示例库清理也永远够不着它们。
    const book = await repo.createBook({ title: '关系的书' });
    const note = await repo.createNote({ title: '关系的笔记', content: '正文', note_kind: 'note' });
    const card = await repo.createCard({ title: '关系的卡片', content: '正文' });
    await repo.addRelation('derived_from', card.id, note.id);
    await repo.addRelation('related_to', note.id, book.id);
    expect(await repo.listRelations()).toHaveLength(2);

    await repo.deleteCard(card.id);
    expect(await repo.listRelations()).toHaveLength(1);

    await repo.deleteNote(note.id);
    expect(await repo.listRelations()).toHaveLength(0);
  });

  it('删除图书会级联清理笔记、卡片、划线与其关系边', async () => {
    const book = await repo.createBook({ title: '要删除的书' });
    const note = await repo.createNote({ title: '书里的笔记', content: '正文', note_kind: 'note', book_id: book.id });
    const card = await repo.createCard({ title: '书里的卡片', content: '正文', book_id: book.id });
    await repo.addHighlight(book.id, { kind: 'text_quote', value: '第一段', quote: '引用' }, '引用');
    await repo.addRelation('derived_from', card.id, note.id);

    await repo.deleteBook(book.id);

    expect(await repo.listBooks()).toHaveLength(0);
    expect(await repo.listNotes()).toHaveLength(0);
    expect(await repo.listCards()).toHaveLength(0);
    expect(await repo.listHighlights()).toHaveLength(0);
    expect(await repo.listRelations()).toHaveLength(0);
  });

  it('数据全景给出真实条数（破坏性确认文案的数据源）', async () => {
    await repo.createBook({ title: '全景书' });
    await repo.createNote({ title: '全景笔记', content: '正文', note_kind: 'note' });

    const inventory = await repo.libraryInventory();
    expect(inventory.books).toBe(1);
    expect(inventory.notes).toBe(1);
    expect(inventory.total).toBe(2);

    const described = await repo.describeInventory();
    expect(described).toContain('资料 1 条');
    expect(described).toContain('笔记 1 条');
    expect(described).not.toContain('划线');
  });

  it('Markdown 导出与导入可往返', async () => {
    await repo.createNote({ title: '往返笔记', content: '正文内容', note_kind: 'highlight' });
    await repo.createCard({ title: '往返卡片', content: '卡片内容' });

    const markdown = await repo.exportMarkdown();
    expect(markdown).toContain('# uRead 知识导出');
    // 导出物的范围声明：用户（和未来的我们）不该靠猜才知道它缺了什么
    expect(markdown).toContain('不是完整备份');

    await repo.resetLibrary();
    const result = await repo.importMarkdown(markdown);
    expect(result).toEqual({ imported: 2, skipped: 0 });
    expect((await repo.listNotes())[0].title).toBe('往返笔记');
    expect((await repo.listCards())[0].title).toBe('往返卡片');
  });

  it('Markdown 里混入书单块时也必须计数，不许静默丢弃', async () => {
    // 回归：booklist 落到最后的 else，既没写回也不进 skipped，
    // 界面于是报告「已恢复 N 条、0 个跳过」，书单就这么消失了。
    const markdown = [
      '---',
      '{"type":"booklist","id":"list_1","title":"待读书单","book_ids":[],"tags":[],"metadata":{}}',
      '---',
    ].join('\n');

    const result = await repo.importMarkdown(markdown);

    expect(result).toEqual({ imported: 1, skipped: 0 });
    expect((await repo.listBookLists()).map((list) => list.title)).toEqual(['待读书单']);
  });

  it('Markdown 导入把无法解析的区块如实报告为 skipped（不再静默丢数据）', async () => {
    // 半个人工编辑过的备份：第二个区块缺了右括号。
    // 以前 `catch { continue; }` 会让界面报告「已恢复 1 条」，听起来像完整恢复。
    const markdown = [
      '# uRead 知识导出',
      '',
      '---',
      '',
      '{"type":"note","id":"note_ok","title":"可用笔记","content":"正文","note_kind":"note"}',
      '',
      '---',
      '',
      '{"type":"note","id":"note_bad","title":"坏块"',
      '',
      '---',
      '',
      '{"type":"unknown_kind","id":"x"}',
      '',
    ].join('\n');

    const result = await repo.importMarkdown(markdown);

    expect(result).toEqual({ imported: 1, skipped: 2 });
    expect((await repo.listNotes()).map((note) => note.id)).toEqual(['note_ok']);
  });

  it('导入非法格式时抛出明确错误', async () => {
    await expect(
      repo.importBundle({ format: 'unknown' } as never),
    ).rejects.toThrow(/不支持的导入格式/);
  });
});

describe('软删除与回收站', () => {
  beforeEach(async () => {
    await Promise.all([
      clear('books'), clear('notes'), clear('knowledgeCards'), clear('booklists'),
      clear('knowledgeRelations'), clear('readingSessions'), clear('highlights'), clear('annotations'),
    ]);
  });

  it('删除后列表与详情不可见，但备份仍包含实体', async () => {
    const book = await repo.createBook({ title: '可恢复的书' });
    await repo.deleteBook(book.id);

    expect(await repo.listBooks()).toHaveLength(0);
    expect(await repo.getBook(book.id)).toBeUndefined();
    expect(await getById('books', book.id)).toBeDefined();
    const bundle = await repo.exportBundle();
    expect(bundle.data.books).toHaveLength(1);
    expect(bundle.data.books[0].deleted_at).toBeTruthy();
  });

  it('回收站列出已删除条目，恢复后重新可见', async () => {
    const note = await repo.createNote({ title: '误删笔记', content: '内容' });
    await repo.deleteNote(note.id);
    const trashed = await repo.listTrashed();
    expect(trashed.some((entry) => entry.id === note.id && entry.store === 'notes')).toBe(true);

    await repo.restoreTrashed('notes', note.id);
    expect(await repo.listNotes()).toHaveLength(1);
    expect((await repo.listTrashed()).some((entry) => entry.id === note.id)).toBe(false);
  });

  it('恢复图书会一并恢复级联进入回收站的笔记与卡片', async () => {
    const book = await repo.createBook({ title: '整本书' });
    const note = await repo.createNote({ title: '章内笔记', content: 'x', book_id: book.id });
    const card = await repo.createCard({ title: '章内卡片', content: 'y', book_id: book.id });

    await repo.deleteBook(book.id);
    expect(await repo.listNotes()).toHaveLength(0);
    expect(await repo.listCards()).toHaveLength(0);

    await repo.restoreTrashed('books', book.id);
    expect(await repo.listBooks()).toHaveLength(1);
    expect(await repo.listNotes().then((rows) => rows.map((row) => row.id))).toContain(note.id);
    expect(await repo.listCards().then((rows) => rows.map((row) => row.id))).toContain(card.id);
  });

  it('永久删除只由回收站显式调用，之后备份也不再包含', async () => {
    const list = await repo.createBookList({ title: '待清空书单' });
    await repo.deleteBookList(list.id);
    expect(await repo.listBookLists()).toHaveLength(0);

    await repo.purgeDeleted('booklists', list.id);
    expect(await getById('booklists', list.id)).toBeUndefined();
    expect((await repo.exportBundle()).data.booklists).toHaveLength(0);
  });

  it('数据全景只统计未删除条目', async () => {
    await repo.createBook({ title: '保留' });
    const removed = await repo.createBook({ title: '删除' });
    await repo.deleteBook(removed.id);
    expect((await repo.libraryInventory()).books).toBe(1);
  });
});
