/**
 * 全局状态：Zustand 只负责 UI 状态与命令派发，
 * 所有持久化动作都走仓储层（repository.ts），UI 不直接碰 IndexedDB。
 */

import { create } from 'zustand';

import * as repo from '../data/repository';
import * as sample from '../data/sample';
import type { BundleImportResult, MarkdownImportResult } from '../data/repository';
import type { SampleCounts } from '../data/sample';
import { describeError } from './errors';
import type {
  Book,
  BookList,
  ExportBundle,
  KnowledgeCard,
  KnowledgeRelation,
  Note,
  ReadingSession,
} from '../data/types';

export interface LibraryStats {
  bookCount: number;
  noteCount: number;
  cardCount: number;
  highlightCount: number;
  reviewedCardCount: number;
  readingMinutes: number;
}

interface LibraryState {
  books: Book[];
  notes: Note[];
  cards: KnowledgeCard[];
  booklists: BookList[];
  sessions: ReadingSession[];
  relations: KnowledgeRelation[];
  loading: boolean;
  /** 已按使用者语言描述过的失败原因。 */
  error: string | null;
  /** 失败时的下一步动作（与 error 同时出现）。 */
  errorHint: string | null;
  initialized: boolean;
  load: () => Promise<void>;
  addBook: (input: repo.BookInput) => Promise<Book>;
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  addNote: (input: repo.NoteInput) => Promise<Note>;
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  addCard: (input: repo.CardInput) => Promise<KnowledgeCard>;
  updateCard: (id: string, patch: Partial<KnowledgeCard>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  addBookList: (input: {
    title: string;
    description?: string;
    type?: BookList['type'];
    tags?: string[];
  }) => Promise<void>;
  removeBookList: (id: string) => Promise<void>;
  /** 设置书单里的资料集合（书单卡片上「管理书目」的数据出口）。 */
  setBookListBooks: (id: string, bookIds: string[]) => Promise<void>;
  link: (type: KnowledgeRelation['type'], sourceId: string, targetId: string) => Promise<void>;
  unlink: (id: string) => Promise<void>;
  /** 本机数据全景（八类条数），供破坏性操作的确认文案使用；未加载时为 null。 */
  inventoryText: string | null;
  exportJson: () => Promise<ExportBundle>;
  importJson: (bundle: ExportBundle) => Promise<BundleImportResult>;
  exportMarkdown: () => Promise<string>;
  importMarkdown: (markdown: string) => Promise<MarkdownImportResult>;
  reset: () => Promise<void>;
  /** 合成示例库：加载 / 清除。空库时用来演示完整工作流，数据一律标注 synthetic-demo。 */
  sampleBusy: boolean;
  loadSample: () => Promise<SampleCounts>;
  removeSample: () => Promise<SampleCounts>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  notes: [],
  cards: [],
  booklists: [],
  sessions: [],
  relations: [],
  inventoryText: null,
  loading: false,
  error: null,
  errorHint: null,
  initialized: false,

  load: async () => {
    set({ loading: true, error: null, errorHint: null });
    try {
      const [books, notes, cards, booklists, sessions, relations, inventoryText] = await Promise.all([
        repo.listBooks(),
        repo.listNotes(),
        repo.listCards(),
        repo.listBookLists(),
        repo.listSessions(),
        repo.listRelations(),
        // 全景失败不阻断加载：宁可得罪人地写「未取到条数」，也不给一个好看的假数字
        repo.describeInventory().catch(() => null),
      ]);
      set({
        books,
        notes,
        cards,
        booklists,
        sessions,
        relations,
        inventoryText,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      // 直接把 IndexedDB 的英文异常丢给使用者，等于把排查工作转包给不懂代码的人
      const explained = describeError(error);
      set({
        loading: false,
        error: explained.message,
        errorHint: explained.hint,
        initialized: true,
      });
    }
  },

  addBook: async (input) => {
    const book = await repo.createBook(input);
    await get().load();
    return book;
  },

  updateBook: async (id, patch) => {
    await repo.updateBook(id, patch);
    await get().load();
  },

  removeBook: async (id) => {
    await repo.deleteBook(id);
    await get().load();
  },

  addNote: async (input) => {
    const note = await repo.createNote(input);
    await get().load();
    return note;
  },

  updateNote: async (id, patch) => {
    await repo.updateNote(id, patch);
    await get().load();
  },

  removeNote: async (id) => {
    await repo.deleteNote(id);
    await get().load();
  },

  addCard: async (input) => {
    const card = await repo.createCard(input);
    await get().load();
    return card;
  },

  updateCard: async (id, patch) => {
    await repo.updateCard(id, patch);
    await get().load();
  },

  removeCard: async (id) => {
    await repo.deleteCard(id);
    await get().load();
  },

  addBookList: async (input) => {
    await repo.createBookList(input);
    await get().load();
  },

  removeBookList: async (id) => {
    await repo.deleteBookList(id);
    await get().load();
  },

  setBookListBooks: async (id, bookIds) => {
    await repo.updateBookList(id, { book_ids: bookIds });
    await get().load();
  },

  link: async (type, sourceId, targetId) => {
    await repo.addRelation(type, sourceId, targetId);
    await get().load();
  },

  unlink: async (id) => {
    await repo.deleteRelation(id);
    await get().load();
  },

  exportJson: () => repo.exportBundle(),
  importJson: async (bundle) => {
    const result = await repo.importBundle(bundle);
    await get().load();
    return result;
  },
  exportMarkdown: () => repo.exportMarkdown(),
  importMarkdown: async (markdown) => {
    const result = await repo.importMarkdown(markdown);
    await get().load();
    return result;
  },
  reset: async () => {
    await repo.resetLibrary();
    await get().load();
  },

  sampleBusy: false,

  loadSample: async () => {
    set({ sampleBusy: true });
    try {
      const counts = await sample.loadSampleLibrary();
      await get().load();
      return counts;
    } finally {
      set({ sampleBusy: false });
    }
  },

  removeSample: async () => {
    set({ sampleBusy: true });
    try {
      const counts = await sample.removeSampleLibrary();
      await get().load();
      return counts;
    } finally {
      set({ sampleBusy: false });
    }
  },
}));

/** 仪表板统计：全部由真实数据计算。 */
export function computeStats(state: Pick<LibraryState, 'books' | 'notes' | 'cards'>): LibraryStats {
  const bookCount = state.books.length;
  const noteCount = state.notes.length;
  const cardCount = state.cards.length;
  const highlightCount = state.notes.filter((note) => note.note_kind === 'highlight').length;
  const reviewedCardCount = state.cards.filter((card) => card.reviewed).length;
  const readingMinutes = Math.round(
    state.notes.reduce((total, note) => total + note.content.length, 0) / 400,
  );
  return { bookCount, noteCount, cardCount, highlightCount, reviewedCardCount, readingMinutes };
}
