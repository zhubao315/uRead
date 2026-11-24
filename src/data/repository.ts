/**
 * 仓储层：所有数据操作都经过这里，UI 不直接接触 IndexedDB。
 *
 * 每个实体都具备唯一 ID、ISO 时间戳、版本号与状态，
 * 知识资产（Book / Note / KnowledgeCard）同时携带 source_refs 与 relations，
 * 保证「每条知识都能回溯来源」不是口号而是数据结构约束。
 */

import {
  clear,
  getAll,
  getById,
  getByIndex,
  put,
  putMany,
  remove,
  type StoreName,
} from './db';
import type {
  Anchor,
  Annotation,
  Book,
  BookList,
  ExportBundle,
  Highlight,
  KnowledgeCard,
  KnowledgeRelation,
  Note,
  NoteKind,
  Relation,
  RelationType,
  ReadingSession,
  SourceRef,
} from './types';

export const EXPORT_FORMAT = 'uread-library';
/**
 * 备份格式版本。
 *
 * 2：补上阅读记录、划线、批注、知识关系四类。
 * v1 只装了四类实体，用它恢复会把其余四类**永久丢掉**——
 * 而界面上的「清空本地数据」写着「请先导出备份」，等于把人推向不可逆的操作。
 */
export const EXPORT_VERSION = 2;

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  // 优先用密码学随机源；老浏览器 / 非安全上下文没有 randomUUID 时退回旧算法。
  const uuid = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID().replace(/-/g, '')
    : '';
  const random = uuid || Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/** 导入 JSON 的最小形状校验：只挡住明显不是备份/资产的载荷，不要求特定类别必须存在。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bumpVersion(current: string): string {
  const parts = current.split('.').map((part) => Number.parseInt(part, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
  return parts.join('.');
}

function withMeta<T extends { id: string; created_at: string; updated_at: string; version: string }>(
  value: T,
): T {
  const now = nowIso();
  return { ...value, created_at: value.created_at || now, updated_at: now };
}

/* ------------------------------------------------------------------ */
/* Books                                                               */
/* ------------------------------------------------------------------ */

export interface BookInput {
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  publish_year?: number;
  pages?: number;
  reading_status?: Book['reading_status'];
  rating?: number;
  body?: string;
  description?: string;
  tags?: string[];
  source_refs?: SourceRef[];
}

export async function listBooks(): Promise<Book[]> {
  const books = await getAll<Book>('books');
  return books.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getBook(id: string): Promise<Book | undefined> {
  return getById<Book>('books', id);
}

export async function createBook(input: BookInput): Promise<Book> {
  const now = nowIso();
  const book: Book = {
    id: createId('book'),
    type: 'book',
    title: input.title,
    content: input.description ?? '',
    source_refs: input.source_refs ?? [],
    relations: [],
    metadata: {
      origin: 'uread',
      language: 'zh-CN',
      ai_generated: false,
      tags: input.tags ?? [],
    },
    version: '1.0.0',
    status: 'candidate',
    created_at: now,
    updated_at: now,
    author: input.author,
    isbn: input.isbn,
    publisher: input.publisher,
    publish_year: input.publish_year,
    pages: input.pages,
    reading_status: input.reading_status ?? 'reading',
    rating: input.rating,
    body: input.body ?? '',
  };
  return put('books', book);
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<Book> {
  const current = await getBook(id);
  if (!current) throw new Error(`图书不存在: ${id}`);
  const next: Book = {
    ...current,
    ...patch,
    id: current.id,
    type: 'book',
    version: bumpVersion(current.version),
  };
  return put('books', withMeta(next));
}

/**
 * 删除某个端点的全部关系边。
 *
 * 以前只删实体、留着边：确认框却告诉用户「关系会一起删除」。
 * 留下来的孤儿边让「0 条关系」与数据库实际行数对不上，
 * 也让示例库的清理逻辑（通过存活卡片枚举关系）永远清不掉它们。
 */
async function removeRelationsTouching(id: string): Promise<void> {
  const all = await getAll<KnowledgeRelation>('knowledgeRelations');
  const doomed = all.filter((relation) => relation.source_id === id || relation.target_id === id);
  await Promise.all(doomed.map((relation) => remove('knowledgeRelations', relation.id)));
}

/** 删除图书：级联删除其笔记、卡片、划线，以及牵涉它们的全部关系边。 */
export async function deleteBook(id: string): Promise<void> {
  const [notes, cards, highlights] = await Promise.all([
    getByIndex<Note>('notes', 'by_book', id),
    getByIndex<KnowledgeCard>('knowledgeCards', 'by_book', id),
    getByIndex<{ id: string }>('highlights', 'by_book', id),
  ]);
  await remove('books', id);
  await Promise.all([
    ...notes.map((note) => removeRelationsTouching(note.id).then(() => remove('notes', note.id))),
    ...cards.map((card) => removeRelationsTouching(card.id).then(() => remove('knowledgeCards', card.id))),
    ...highlights.map((item) => remove('highlights', item.id)),
  ]);
  await removeRelationsTouching(id);
}

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

export interface NoteInput {
  title: string;
  content: string;
  book_id?: string;
  note_kind?: NoteKind;
  anchors?: Anchor[];
  color?: string;
  tags?: string[];
  source_refs?: SourceRef[];
  relations?: Relation[];
  status?: Note['status'];
  provenance?: Note['metadata']['provenance'];
}

export async function listNotes(filter?: { book_id?: string; note_kind?: NoteKind }): Promise<Note[]> {
  let notes = await getAll<Note>('notes');
  if (filter?.book_id) {
    notes = notes.filter((note) => note.book_id === filter.book_id);
  }
  if (filter?.note_kind) {
    notes = notes.filter((note) => note.note_kind === filter.note_kind);
  }
  return notes.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getNote(id: string): Promise<Note | undefined> {
  return getById<Note>('notes', id);
}

export async function createNote(input: NoteInput): Promise<Note> {
  const now = nowIso();
  const note: Note = {
    id: createId('note'),
    type: 'note',
    title: input.title,
    content: input.content,
    source_refs: input.source_refs ?? [],
    relations: input.relations ?? [],
    metadata: {
      origin: 'uread',
      language: 'zh-CN',
      ai_generated: input.provenance === 'AI_GENERATED' || input.provenance === 'AI_ASSISTED',
      ...(input.provenance ? { provenance: input.provenance } : {}),
      tags: input.tags ?? [],
    },
    version: '1.0.0',
    status: input.status ?? 'candidate',
    created_at: now,
    updated_at: now,
    book_id: input.book_id,
    note_kind: input.note_kind ?? 'note',
    anchors: input.anchors ?? [],
    color: input.color,
  };
  return put('notes', note);
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<Note> {
  const current = await getNote(id);
  if (!current) throw new Error(`笔记不存在: ${id}`);
  const next: Note = {
    ...current,
    ...patch,
    id: current.id,
    type: 'note',
    version: bumpVersion(current.version),
  };
  return put('notes', withMeta(next));
}

export async function deleteNote(id: string): Promise<void> {
  await remove('notes', id);
  await removeRelationsTouching(id);
}

/* ------------------------------------------------------------------ */
/* Knowledge cards                                                     */
/* ------------------------------------------------------------------ */

export interface CardInput {
  title: string;
  content: string;
  definition?: string;
  book_id?: string;
  card_type?: KnowledgeCard['card_type'];
  importance?: KnowledgeCard['importance'];
  tags?: string[];
  source_refs?: SourceRef[];
  relations?: Relation[];
  status?: KnowledgeCard['status'];
}

export async function listCards(filter?: { book_id?: string }): Promise<KnowledgeCard[]> {
  let cards = await getAll<KnowledgeCard>('knowledgeCards');
  if (filter?.book_id) {
    cards = cards.filter((card) => card.book_id === filter.book_id);
  }
  return cards.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getCard(id: string): Promise<KnowledgeCard | undefined> {
  return getById<KnowledgeCard>('knowledgeCards', id);
}

export async function createCard(input: CardInput): Promise<KnowledgeCard> {
  const now = nowIso();
  const card: KnowledgeCard = {
    id: createId('card'),
    type: 'knowledge_card',
    title: input.title,
    content: input.content,
    source_refs: input.source_refs ?? [],
    relations: input.relations ?? [],
    metadata: {
      origin: 'uread',
      language: 'zh-CN',
      ai_generated: false,
      tags: input.tags ?? [],
    },
    version: '1.0.0',
    status: input.status ?? 'candidate',
    created_at: now,
    updated_at: now,
    book_id: input.book_id,
    card_type: input.card_type ?? 'concept',
    definition: input.definition,
    importance: input.importance ?? 'medium',
    reviewed: false,
  };
  return put('knowledgeCards', card);
}

export async function updateCard(id: string, patch: Partial<KnowledgeCard>): Promise<KnowledgeCard> {
  const current = await getCard(id);
  if (!current) throw new Error(`知识卡片不存在: ${id}`);
  const next: KnowledgeCard = {
    ...current,
    ...patch,
    id: current.id,
    type: 'knowledge_card',
    version: bumpVersion(current.version),
  };
  return put('knowledgeCards', withMeta(next));
}

export async function deleteCard(id: string): Promise<void> {
  await remove('knowledgeCards', id);
  await removeRelationsTouching(id);
}

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export async function listRelations(sourceId?: string): Promise<KnowledgeRelation[]> {
  const all = await getAll<KnowledgeRelation>('knowledgeRelations');
  return sourceId ? all.filter((item) => item.source_id === sourceId) : all;
}

export async function addRelation(
  type: RelationType,
  sourceId: string,
  targetId: string,
  note?: string,
): Promise<KnowledgeRelation> {
  const relation: KnowledgeRelation = {
    id: createId('rel'),
    type,
    source_id: sourceId,
    target_id: targetId,
    note,
    created_at: nowIso(),
  };
  return put('knowledgeRelations', relation);
}

export async function deleteRelation(id: string): Promise<void> {
  await remove('knowledgeRelations', id);
}

/* ------------------------------------------------------------------ */
/* Reading sessions / highlights / annotations                         */
/* ------------------------------------------------------------------ */

export async function listSessions(bookId?: string): Promise<ReadingSession[]> {
  const sessions = await getAll<ReadingSession>('readingSessions');
  return bookId ? sessions.filter((item) => item.book_id === bookId) : sessions;
}

export async function startSession(bookId: string, progress = 0): Promise<ReadingSession> {
  const now = nowIso();
  const session: ReadingSession = {
    id: createId('session'),
    type: 'note',
    title: `阅读会话 ${now.slice(0, 16).replace('T', ' ')}`,
    content: '',
    source_refs: [],
    relations: [],
    metadata: { origin: 'uread' },
    version: '1.0.0',
    status: 'candidate',
    created_at: now,
    updated_at: now,
    book_id: bookId,
    started_at: now,
    progress,
  };
  return put('readingSessions', session);
}

export async function saveSessionProgress(id: string, progress: number): Promise<ReadingSession> {
  const current = await getById<ReadingSession>('readingSessions', id);
  if (!current) throw new Error(`阅读会话不存在: ${id}`);
  const next: ReadingSession = { ...current, progress, ended_at: nowIso() };
  return put('readingSessions', withMeta(next));
}

export async function addHighlight(
  bookId: string,
  anchor: Anchor,
  quote: string,
): Promise<{ id: string }> {
  const now = nowIso();
  const highlight = {
    id: createId('hl'),
    type: 'highlight' as const,
    title: quote.slice(0, 40),
    content: quote,
    source_refs: [],
    relations: [],
    metadata: { origin: 'uread' as const },
    version: '1.0.0',
    status: 'candidate' as const,
    created_at: now,
    updated_at: now,
    book_id: bookId,
    anchors: [anchor],
    quote,
  };
  await put('highlights', highlight);
  return highlight;
}

export async function listHighlights(bookId?: string): Promise<{ id: string; quote: string }[]> {
  const all = await getAll<{ id: string; book_id: string; quote: string }>('highlights');
  return bookId ? all.filter((item) => item.book_id === bookId) : all;
}

/* ------------------------------------------------------------------ */
/* Book lists                                                          */
/* ------------------------------------------------------------------ */

export async function listBookLists(): Promise<BookList[]> {
  const lists = await getAll<BookList>('booklists');
  return lists.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function createBookList(input: {
  title: string;
  description?: string;
  type?: BookList['type'];
  tags?: string[];
}): Promise<BookList> {
  const now = nowIso();
  const list: BookList = {
    id: createId('list'),
    title: input.title,
    description: input.description,
    type: input.type ?? 'personal',
    book_ids: [],
    tags: input.tags ?? [],
    version: '1.0.0',
    created_at: now,
    updated_at: now,
  };
  return put('booklists', list);
}

export async function updateBookList(id: string, patch: Partial<BookList>): Promise<BookList> {
  const current = await getById<BookList>('booklists', id);
  if (!current) throw new Error(`书单不存在: ${id}`);
  const next: BookList = {
    ...current,
    ...patch,
    id: current.id,
    version: bumpVersion(current.version),
  };
  return put('booklists', withMeta(next));
}

export async function deleteBookList(id: string): Promise<void> {
  await remove('booklists', id);
}

/* ------------------------------------------------------------------ */
/* Import / export                                                     */
/* ------------------------------------------------------------------ */

export async function exportBundle(): Promise<ExportBundle> {
  const [
    books,
    notes,
    knowledge_cards,
    booklists,
    reading_sessions,
    highlights,
    annotations,
    knowledge_relations,
  ] = await Promise.all([
    getAll<Book>('books'),
    getAll<Note>('notes'),
    getAll<KnowledgeCard>('knowledgeCards'),
    getAll<BookList>('booklists'),
    getAll<ReadingSession>('readingSessions'),
    getAll<Highlight>('highlights'),
    getAll<Annotation>('annotations'),
    getAll<KnowledgeRelation>('knowledgeRelations'),
  ]);
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: nowIso(),
    data: {
      books,
      notes,
      knowledge_cards,
      booklists,
      reading_sessions,
      highlights,
      annotations,
      knowledge_relations,
    },
  };
}

/** 备份里每一类数据的名称（措辞与界面共用，避免「说了 4 类、清了 8 类」）。 */
export const SNAPSHOT_STORES = [
  { key: 'books', store: 'books', label: '资料' },
  { key: 'notes', store: 'notes', label: '笔记' },
  { key: 'knowledge_cards', store: 'knowledgeCards', label: '知识卡片' },
  { key: 'booklists', store: 'booklists', label: '书单' },
  { key: 'reading_sessions', store: 'readingSessions', label: '阅读记录' },
  { key: 'highlights', store: 'highlights', label: '划线' },
  { key: 'annotations', store: 'annotations', label: '批注' },
  { key: 'knowledge_relations', store: 'knowledgeRelations', label: '知识关系' },
] as const;

/** 本机数据全景：破坏性操作的确认文案必须与真实后果一致。 */
export interface LibraryInventory {
  books: number;
  notes: number;
  knowledge_cards: number;
  booklists: number;
  reading_sessions: number;
  highlights: number;
  annotations: number;
  knowledge_relations: number;
  /** 八类合计。 */
  total: number;
}

type Identifiable = { id: string };

export async function libraryInventory(): Promise<LibraryInventory> {
  // 备份里的键是 snake_case，IndexedDB 的仓储名是 camelCase：必须显式映射，
  // 拿备份键当仓储名会在运行时才炸（fake-indexeddb 实测过）。
  const rows = await Promise.all(
    SNAPSHOT_STORES.map((entry) => getAll<Identifiable>(entry.store as StoreName)),
  );
  const values = Object.fromEntries(
    SNAPSHOT_STORES.map((entry, index) => [entry.key, (rows[index] as unknown[]).length]),
  ) as Record<(typeof SNAPSHOT_STORES)[number]['key'], number>;
  return { ...values, total: Object.values(values).reduce((sum, n) => sum + n, 0) };
}

/** 一句话说明本机数据全景（用于清空前的确认，条目数量来自真实仓储）。 */
export async function describeInventory(): Promise<string> {
  const inventory = await libraryInventory();
  const parts = SNAPSHOT_STORES.filter((entry) => inventory[entry.key] > 0).map(
    (entry) => `${entry.label} ${inventory[entry.key]} 条`,
  );
  return parts.length > 0 ? parts.join('、') : '（当前没有数据）';
}

/** 导入备份的结果；「成功」必须能区分「完整」与「部分」。 */
export interface BundleImportResult {
  /** 写回的条数（按类别）。 */
  restored: Partial<Record<(typeof SNAPSHOT_STORES)[number]['key'], number>>;
  restored_total: number;
  /** 备份文件的格式版本。 */
  bundle_version: number;
  /** 完整恢复：v2 及以后，且每类键都存在。 */
  complete: boolean;
  /** 备份里缺失、因此本轮没有（也无法）恢复的类别。 */
  missing: string[];
}

export async function importBundle(bundle: ExportBundle): Promise<BundleImportResult> {
  if (!isRecord(bundle)) {
    throw new Error('导入失败：备份内容不是对象');
  }
  if (bundle.format !== EXPORT_FORMAT) {
    throw new Error(`不支持的导入格式: ${bundle.format}`);
  }
  if (!isRecord(bundle.data)) {
    throw new Error('导入失败：备份缺少 data 对象');
  }
  const data = bundle.data;
  const restored: BundleImportResult['restored'] = {};
  const missing: string[] = [];
  for (const entry of SNAPSHOT_STORES) {
    const value = data[entry.key] as unknown[] | undefined;
    if (value === undefined) {
      // 缺键 ≠ 空集合：前者是备份没装下它，后者是确实没有数据。
      // 把前者静默写成空集合，用户就再也没机会找回。
      missing.push(entry.label);
      continue;
    }
    if (!Array.isArray(value)) {
      throw new Error(`导入失败：${entry.label} 数据不是数组`);
    }
    restored[entry.key] = value.length;
  }
  await Promise.all([
    putMany('books', data.books ?? []),
    putMany('notes', data.notes ?? []),
    putMany('knowledgeCards', data.knowledge_cards ?? []),
    putMany('booklists', data.booklists ?? []),
    ...(data.reading_sessions ? [putMany('readingSessions', data.reading_sessions)] : []),
    ...(data.highlights ? [putMany('highlights', data.highlights)] : []),
    ...(data.annotations ? [putMany('annotations', data.annotations)] : []),
    ...(data.knowledge_relations ? [putMany('knowledgeRelations', data.knowledge_relations)] : []),
  ]);
  return {
    restored,
    restored_total: Object.values(restored).reduce((sum, n) => sum + (n ?? 0), 0),
    bundle_version: typeof bundle.version === 'number' ? bundle.version : 1,
    complete: missing.length === 0,
    missing,
  };
}

/** 导出为 Markdown：每个资产一个 frontmatter 块，便于人工审阅与版本管理。 */
export async function exportMarkdown(): Promise<string> {
  const [notes, cards] = await Promise.all([getAll<Note>('notes'), getAll<KnowledgeCard>('knowledgeCards')]);
  const blocks = [
    ...notes.map((note) => ({ asset: note, body: note.content })),
    ...cards.map((card) => ({ asset: card, body: card.content })),
  ];
  const header = [
    '# uRead 知识导出',
    '',
    `> 导出时间：${nowIso()}`,
    `> 资产数量：${blocks.length}`,
    '> 范围：仅笔记与知识卡片，**不是完整备份**（资料、书单、阅读记录、划线、批注、知识关系不在此文件中）；',
    '> 需要完整备份请使用「导出 JSON 备份」。',
    '',
  ].join('\n');
  const body = blocks
    .map(({ asset, body: text }) => {
      const frontmatter = JSON.stringify(asset, null, 2);
      return `---\n${frontmatter}\n---\n\n${text}\n`;
    })
    .join('\n');
  return `${header}\n${body}`;
}

/** 从 Markdown 导出文件恢复资产。 */
/**
 * 从 Markdown 导出物恢复资产。
 *
 * 返回值必须区分「成功」与「被跳过」：坏块以前被 `catch { continue; }` 直接吞掉，
 * 界面却照样报告「已恢复 N 条」，于是**部分恢复看起来像完整恢复**。
 */
export interface MarkdownImportResult {
  /** 成功写回的资产条数。 */
  imported: number;
  /** 看起来是 JSON 块但解析失败的块数（真实的数据丢失，必须告知用户）。 */
  skipped: number;
}

export async function importMarkdown(markdown: string): Promise<MarkdownImportResult> {
  const chunks = markdown.split(/^---$/m);
  let imported = 0;
  let skipped = 0;
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed.startsWith('{')) continue;
    const end = trimmed.indexOf('\n---');
    const jsonText = end === -1 ? trimmed : trimmed.slice(0, end);
    let payload: unknown;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      skipped += 1;
      continue;
    }
    // Markdown 里的 { } 可能是人工编辑过的残块：不是对象、缺 id/type 的一律
    // 计入 skipped，不能在 put() 时才抛异常或静默写进一条没有身份的记录。
    if (!isRecord(payload) || typeof payload.id !== 'string' || typeof payload.type !== 'string') {
      skipped += 1;
      continue;
    }
    const type = payload.type;
    if (type === 'note') {
      await put('notes', payload as unknown as Note);
      imported += 1;
    } else if (type === 'knowledge_card') {
      await put('knowledgeCards', payload as unknown as KnowledgeCard);
      imported += 1;
    } else if (type === 'book') {
      await put('books', payload as unknown as Book);
      imported += 1;
    } else if (type === 'booklist' || type === 'book_list') {
      // 以前这里落到最后的 else：block 被丢掉，返回的 skipped 也不含它，
      // 报告「已恢复 N 条、0 个跳过」——书单就这么没了。
      await put('booklists', payload as unknown as BookList);
      imported += 1;
    } else {
      // 认不出的 type 同样是丢数据：静默丢弃会让用户以为已经恢复了
      skipped += 1;
    }
  }
  return { imported, skipped };
}

/** 清空全部本地数据（恢复备份前使用）。 */
export async function resetLibrary(): Promise<void> {
  await Promise.all([
    clear('books'),
    clear('notes'),
    clear('knowledgeCards'),
    clear('booklists'),
    clear('readingSessions'),
    clear('highlights'),
    clear('annotations'),
    clear('knowledgeRelations'),
  ]);
}
