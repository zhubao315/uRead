/**
 * 合成示例库（synthetic sample library）。
 *
 * 目的：uRead 是本地优先应用，空库时用户看不到任何界面价值。
 * 这里提供一套**明确标注为合成**的示例图书、笔记、卡片与书单，
 * 用于演示完整工作流（资料库 → 笔记（带原文锚点）→ 知识卡片 → 关系 → 书单）。
 *
 * 边界：这些内容不是真实阅读记录，也不代表任何真实书籍的观点。
 * 所有条目都带 `synthetic-demo` 标签，导出时同样携带该标签，便于识别与清理。
 */

import * as repo from './repository';
import type {
  Book,
  BookList,
  KnowledgeCard,
  KnowledgeRelation,
  Note,
  SourceRef,
} from './types';

export const SAMPLE_TAG = 'synthetic-demo';

export interface SampleCounts {
  books: number;
  notes: number;
  cards: number;
  booklists: number;
  relations: number;
  skipped: boolean;
}

interface SampleBook {
  key: string;
  title: string;
  author: string;
  publisher: string;
  publish_year: number;
  pages: number;
  reading_status: Book['reading_status'];
  rating?: number;
  description: string;
  body: string;
}

/** 示例正文：刻意写成可摘录的段落，笔记锚点会逐字引用其中的句子。 */
const SAMPLE_BOOKS: SampleBook[] = [
  {
    key: 'knowledge-engineering',
    title: '合成示例·知识工程十二讲',
    author: '示例作者甲',
    publisher: '示例出版社',
    publish_year: 2024,
    pages: 208,
    reading_status: 'reading',
    rating: 4,
    description: '演示用合成图书：讲知识的采集、组织与复核。',
    body: [
      '# 第一讲 原子化',
      '',
      '知识的最小可用单位应当是原子的：一张卡片只表达一个判断。',
      '复合卡片在复用时难以取舍，因为它把三个结论绑在一起。',
      '',
      '## 第二讲 可追溯',
      '',
      '没有来源的判断只是意见。',
      '任何进入知识库的结论都必须能回到原始材料的具体位置。',
      '位置可以是页码、行号或一段可匹配的原文。',
      '',
      '## 第三讲 复核优先',
      '',
      '自动抽取的产物默认是候选，不是知识。',
      '复核不是形式，而是让错误在扩散前被拦住的唯一时机。',
    ].join('\n'),
  },
  {
    key: 'reading-method',
    title: '合成示例·如何读一本书',
    author: '示例作者乙',
    publisher: '示例出版社',
    publish_year: 2019,
    pages: 160,
    reading_status: 'completed',
    rating: 5,
    description: '演示用合成图书：讲阅读方法与笔记写法。',
    body: [
      '# 序章',
      '',
      '记笔记的价值不在记录，而在改写。',
      '把作者的话改写成自己的判断，才算真的读懂。',
      '',
      '# 第二章 间隔',
      '',
      '记忆会衰减，这是事实而不是失败。',
      '对抗衰减的办法是有间隔地重访，而不是长时间集中。',
    ].join('\n'),
  },
  {
    key: 'system-design',
    title: '合成示例·系统设计随手记',
    author: '示例作者丙',
    publisher: '示例出版社',
    publish_year: 2022,
    pages: 320,
    reading_status: 'wishlist',
    description: '演示用合成图书：讲边界、失败与可运维性。',
    body: [
      '# 一 边界',
      '',
      '好的系统先定义不做什么。',
      '边界不清的系统会把所有异常都变成自己的责任。',
      '',
      '# 二 失败',
      '',
      '失败要可解释，否则无法改进。',
      '一个只说「出错了」的报错，等于没有报错。',
    ].join('\n'),
  },
];

interface SampleNote {
  bookKey: string;
  title: string;
  content: string;
  quote: string;
  note_kind: Note['note_kind'];
}

const SAMPLE_NOTES: SampleNote[] = [
  {
    bookKey: 'knowledge-engineering',
    title: '原子化的真实代价',
    content:
      '作者说复合卡片难以复用。我的经验一致：真正麻烦的不是拆，而是判断拆到哪一层——同一判断在不同场景的粒度不同。',
    quote: '知识的最小可用单位应当是原子的：一张卡片只表达一个判断。',
    note_kind: 'note',
  },
  {
    bookKey: 'knowledge-engineering',
    title: '来源不是格式要求',
    content:
      '「没有来源的判断只是意见」这句值得贴在工位上。来源不是给审核人看的格式，而是让自己敢用这条知识的理由。',
    quote: '没有来源的判断只是意见。',
    note_kind: 'highlight',
  },
  {
    bookKey: 'knowledge-engineering',
    title: '候选与知识之间必须有人',
    content: '本章核心：自动化只负责生成候选，是否成为知识由人决定。这一条决定了整个工具的设计取向。',
    quote: '自动抽取的产物默认是候选，不是知识。',
    note_kind: 'summary',
  },
  {
    bookKey: 'reading-method',
    title: '改写才算读懂',
    content:
      '摘录容易给人「已经掌握」的错觉。检验方法是合上书用自己的话复述一遍，说不清就是没读懂。',
    quote: '记笔记的价值不在记录，而在改写。',
    note_kind: 'highlight',
  },
  {
    bookKey: 'reading-method',
    title: '把衰减当成常态',
    content:
      '与已有认知一致：间隔重访优于集中复习。要把复习安排成日程，而不是等忘记了再来一次。',
    quote: '记忆会衰减，这是事实而不是失败。',
    note_kind: 'note',
  },
  {
    bookKey: 'system-design',
    title: '报错质量决定改进速度',
    content: '可解释的失败是可运维性的前提。工具应把「哪一步、什么输入、期望什么」写进错误信息。',
    quote: '失败要可解释，否则无法改进。',
    note_kind: 'note',
  },
];

interface SampleCard {
  bookKey: string;
  title: string;
  content: string;
  definition: string;
  card_type: KnowledgeCard['card_type'];
  importance: KnowledgeCard['importance'];
  reviewed: boolean;
  sourceNoteTitle: string;
}

const SAMPLE_CARDS: SampleCard[] = [
  {
    bookKey: 'knowledge-engineering',
    title: '原子知识卡片',
    content: '一张卡片只承载一个判断，便于组合复用；复合卡片在复用时难以取舍。',
    definition: '只表达一个判断、可独立复用的知识单位。',
    card_type: 'concept',
    importance: 'high',
    reviewed: true,
    sourceNoteTitle: '原子化的真实代价',
  },
  {
    bookKey: 'knowledge-engineering',
    title: '可追溯性',
    content: '进入知识库的结论必须能回到原始材料的具体位置：页码、行号或可匹配的原文。',
    definition: '结论与原始材料位置之间存在可复核的对应关系。',
    card_type: 'concept',
    importance: 'high',
    reviewed: false,
    sourceNoteTitle: '来源不是格式要求',
  },
  {
    bookKey: 'knowledge-engineering',
    title: '候选优先原则',
    content: '自动化产物一律先落为候选，由人复核后才成为知识；复核是错误扩散前的拦截点。',
    definition: '自动化只生成候选，发布决定权在人。',
    card_type: 'idea',
    importance: 'high',
    reviewed: false,
    sourceNoteTitle: '候选与知识之间必须有人',
  },
  {
    bookKey: 'reading-method',
    title: '改写即检验',
    content: '合上书用自己的话复述；说不清即未读懂。摘录本身不构成理解。',
    definition: '通过改写复述来检验理解是否成立的方法。',
    card_type: 'idea',
    importance: 'medium',
    reviewed: true,
    sourceNoteTitle: '改写才算读懂',
  },
  {
    bookKey: 'system-design',
    title: '可解释失败',
    content: '错误信息要说明哪一步、什么输入、期望什么；只说「出错了」等于没有报错。',
    definition: '失败信息足以定位原因并指导下一步的状态。',
    card_type: 'concept',
    importance: 'medium',
    reviewed: false,
    sourceNoteTitle: '报错质量决定改进速度',
  },
];

function sampleSourceRefs(title: string): SourceRef[] {
  return [
    {
      source_id: `sample://${SAMPLE_TAG}/${title}`,
      url: 'https://example.org/synthetic/uread-sample-library',
      title,
      publisher: 'uRead 合成示例库',
      retrieved_at: repo.nowIso(),
      source_type: 'other',
      credibility: 'unknown',
      content_hash: `synthetic-${SAMPLE_TAG}`,
      quote: '本节内容为合成示例，不代表真实书籍内容。',
    },
  ];
}

function withSampleTag(tags: string[] = []): string[] {
  return tags.includes(SAMPLE_TAG) ? tags : [...tags, SAMPLE_TAG];
}

/** 库里是否已存在示例数据（用于避免重复导入）。 */
export async function hasSampleLibrary(): Promise<boolean> {
  const books = await repo.listBooks();
  return books.some((book) => (book.metadata.tags ?? []).includes(SAMPLE_TAG));
}

/**
 * 写入合成示例库。
 *
 * 幂等：库中已有示例数据时不重复写入，直接返回 `skipped: true`。
 */
export async function loadSampleLibrary(): Promise<SampleCounts> {
  if (await hasSampleLibrary()) {
    return { books: 0, notes: 0, cards: 0, booklists: 0, relations: 0, skipped: true };
  }

  const bookByKey = new Map<string, Book>();
  for (const sample of SAMPLE_BOOKS) {
    const book = await repo.createBook({
      title: sample.title,
      author: sample.author,
      publisher: sample.publisher,
      publish_year: sample.publish_year,
      pages: sample.pages,
      reading_status: sample.reading_status,
      rating: sample.rating,
      description: sample.description,
      body: sample.body,
      tags: withSampleTag(),
      source_refs: sampleSourceRefs(sample.title),
    });
    bookByKey.set(sample.key, book);
  }

  const noteByTitle = new Map<string, Note>();
  for (const sample of SAMPLE_NOTES) {
    const book = bookByKey.get(sample.bookKey);
    if (!book) {
      throw new Error(`示例数据引用了不存在的图书：${sample.bookKey}`);
    }
    const line = book.body?.split('\n').findIndex((value) => value.includes(sample.quote)) ?? -1;
    const note = await repo.createNote({
      title: sample.title,
      content: sample.content,
      book_id: book.id,
      note_kind: sample.note_kind,
      tags: withSampleTag(),
      source_refs: sampleSourceRefs(book.title),
      anchors: [
        {
          kind: 'text_quote',
          value: line >= 0 ? `第 ${line + 1} 行` : '示例正文',
          quote: sample.quote,
        },
      ],
    });
    noteByTitle.set(sample.title, note);
  }

  const cards: KnowledgeCard[] = [];
  let relationCount = 0;
  for (const sample of SAMPLE_CARDS) {
    const book = bookByKey.get(sample.bookKey);
    const sourceNote = noteByTitle.get(sample.sourceNoteTitle);
    if (!book || !sourceNote) {
      throw new Error(`示例卡片缺少来源：${sample.title}`);
    }
    const card = await repo.createCard({
      title: sample.title,
      content: sample.content,
      definition: sample.definition,
      book_id: book.id,
      card_type: sample.card_type,
      importance: sample.importance,
      tags: withSampleTag(),
      source_refs: sampleSourceRefs(book.title),
      relations: [
        { type: 'derived_from', target: sourceNote.id, target_type: 'note', note: '由该笔记改写' },
      ],
    });
    cards.push(card);
    // 卡片自身的核验状态也要能被统计：未核验卡片保留为 false，不假装已完成
    await repo.updateCard(card.id, { reviewed: sample.reviewed });
    // 关系记录单独入库，关系视图与图谱统计才看得到（卡片内嵌字段不是关系表）
    await repo.addRelation('derived_from', card.id, sourceNote.id, '由该笔记改写');
    relationCount += 1;
  }

  const booklist = await repo.createBookList({
    title: '合成示例·知识工程入门',
    description: '演示用书单：三条阅读路径由浅入深。',
    type: 'curated',
    tags: withSampleTag(['示例']),
  });
  await repo.updateBookList(booklist.id, { book_ids: [...bookByKey.values()].map((book) => book.id) });

  return {
    books: bookByKey.size,
    notes: noteByTitle.size,
    cards: cards.length,
    booklists: 1,
    relations: relationCount,
    skipped: false,
  };
}

/** 删除全部示例数据（保留真实数据）。返回删除条数。 */
export async function removeSampleLibrary(): Promise<SampleCounts> {
  const counts: SampleCounts = { books: 0, notes: 0, cards: 0, booklists: 0, relations: 0, skipped: false };

  const cards = await repo.listCards();
  for (const card of cards.filter((item) => (item.metadata.tags ?? []).includes(SAMPLE_TAG))) {
    const relations = await repo.listRelations(card.id);
    for (const relation of relations) {
      await repo.deleteRelation(relation.id);
      counts.relations += 1;
    }
    await repo.deleteCard(card.id);
    counts.cards += 1;
  }

  const notes = await repo.listNotes();
  for (const note of notes.filter((item) => (item.metadata.tags ?? []).includes(SAMPLE_TAG))) {
    await repo.deleteNote(note.id);
    counts.notes += 1;
  }

  const booklists = await repo.listBookLists();
  for (const list of booklists.filter((item: BookList) => (item.tags ?? []).includes(SAMPLE_TAG))) {
    await repo.deleteBookList(list.id);
    counts.booklists += 1;
  }

  const books = await repo.listBooks();
  for (const book of books.filter((item) => (item.metadata.tags ?? []).includes(SAMPLE_TAG))) {
    await repo.deleteBook(book.id);
    counts.books += 1;
  }

  return counts;
}

export interface SampleIntegrityIssue {
  kind: 'missing_book' | 'missing_relation_target' | 'missing_tag' | 'empty_anchor';
  message: string;
}

/**
 * 校验示例库的关系完整性：笔记与卡片必须指向存在的图书，
 * 关系的另一端必须存在，且每一条都要带合成标签。
 */
export function validateSampleLibrary(input: {
  books: Book[];
  notes: Note[];
  cards: KnowledgeCard[];
  relations: KnowledgeRelation[];
}): SampleIntegrityIssue[] {
  const issues: SampleIntegrityIssue[] = [];
  const bookIds = new Set(input.books.map((book) => book.id));
  const assetIds = new Set([...bookIds, ...input.notes.map((n) => n.id), ...input.cards.map((c) => c.id)]);
  const sampleOnly = <T extends { metadata: { tags?: string[] } }>(items: T[]) =>
    items.filter((item) => (item.metadata.tags ?? []).includes(SAMPLE_TAG));

  for (const note of sampleOnly(input.notes)) {
    if (note.book_id && !bookIds.has(note.book_id)) {
      issues.push({ kind: 'missing_book', message: `笔记「${note.title}」指向不存在的图书` });
    }
    if (note.anchors.length === 0) {
      issues.push({ kind: 'empty_anchor', message: `笔记「${note.title}」没有原文锚点` });
    }
  }
  for (const card of sampleOnly(input.cards)) {
    if (card.book_id && !bookIds.has(card.book_id)) {
      issues.push({ kind: 'missing_book', message: `卡片「${card.title}」指向不存在的图书` });
    }
    for (const relation of card.relations) {
      if (!assetIds.has(relation.target)) {
        issues.push({ kind: 'missing_relation_target', message: `卡片「${card.title}」的关系目标不存在` });
      }
    }
  }
  for (const relation of input.relations) {
    if (!assetIds.has(relation.source_id) || !assetIds.has(relation.target_id)) {
      issues.push({ kind: 'missing_relation_target', message: `关系 ${relation.id} 的端点不存在` });
    }
  }
  const untagged = [...input.books, ...input.notes, ...input.cards].filter(
    (item) => item.title.startsWith('合成示例') && !(item.metadata.tags ?? []).includes(SAMPLE_TAG)
  );
  for (const item of untagged) {
    issues.push({ kind: 'missing_tag', message: `「${item.title}」缺少合成标签` });
  }
  return issues;
}
