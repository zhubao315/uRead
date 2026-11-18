import React, { useMemo, useState } from 'react';

import Button from '../components/Button';
import Card from '../components/Card';
import DraftNotice from '../components/DraftNotice';
import FeedbackBanner from '../components/FeedbackBanner';
import { PlusIcon } from '../components/Icon';
import NoteCard from '../components/NoteCard';
import { matchesQuery, SearchBox, useDebouncedValue } from '../components/Search';
import StateBlock, { resolveState } from '../components/StateBlock';
import { ORPHAN_BOOK_LABEL } from '../data/labels';
import type { Note, NoteKind } from '../data/types';
import { useActionRunner } from '../hooks/useActionRunner';
import { useDraft } from '../hooks/useDraft';
import { useCreateFlag, useQueryFilter } from '../hooks/useUrlSync';
import { useLibraryStore } from '../store/libraryStore';

const KIND_LABEL: Record<NoteKind, string> = {
  highlight: '高亮',
  note: '笔记',
  summary: '总结',
};

const NotesView: React.FC = () => {
  const notes = useLibraryStore((state) => state.notes);
  const books = useLibraryStore((state) => state.books);
  const addNote = useLibraryStore((state) => state.addNote);
  const removeNote = useLibraryStore((state) => state.removeNote);
  const updateNote = useLibraryStore((state) => state.updateNote);
  const load = useLibraryStore((state) => state.load);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);
  const loading = useLibraryStore((state) => state.loading);
  const initialized = useLibraryStore((state) => state.initialized);

  const { run, busy, feedback, dismiss } = useActionRunner();

  const [filter, setFilter] = useState<'all' | NoteKind | 'orphan'>('all');
  // 过滤词写进 ?q=：从全站搜索跳过来时，用户刚输入的关键词不能凭空消失
  const [query, setQuery] = useQueryFilter();
  const settledQuery = useDebouncedValue(query);

  const [showForm, setShowForm] = useCreateFlag();
  // 未提交的内容暂存在本机：切页面、刷新都不该让人重敲一遍
  const draft = useDraft('notes', {
    title: '',
    content: '',
    bookId: '',
    kind: 'note' as NoteKind,
    page: '',
    quote: '',
  });
  const { title, content, bookId, kind, page, quote } = draft.values;
  const set = draft.set;

  /**
   * 表单校验放在提交前，并把原因写进界面。
   *
   * 原来 `if (!title || !content) return;` 是静默返回，而按钮只在标题为空时禁用：
   * 填了标题、内容留空时点「保存笔记」毫无反应，也没有任何提示。
   */
  const invalid = useMemo(() => {
    if (!title.trim()) {
      return '请填写笔记标题。';
    }
    if (!content.trim()) {
      return '笔记内容不能为空——只有一段话的标题，之后不会有任何用处。';
    }
    if (page.trim() && !/^\d+$/.test(page.trim())) {
      return '页码只能是数字（例如 128）；要写章节名请填在「原文片段」里。';
    }
    return null;
  }, [title, content, page]);

  // 指向已删除资料的笔记：以前只显示「未知书籍」，既不说原因也没有出路
  const knownBookIds = useMemo(() => new Set(books.map((book) => book.id)), [books]);
  const isOrphan = (note: Note): boolean => {
    if (!note.book_id) {
      return false;
    }
    return !knownBookIds.has(note.book_id);
  };

  const filtered = useMemo(
    () =>
      notes
        .filter((note) =>
          filter === 'all' ? true : filter === 'orphan' ? isOrphan(note) : note.note_kind === filter,
        )
        .filter((note) =>
          matchesQuery(settledQuery, [note.title, note.content, ...(note.metadata.tags ?? [])]),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isOrphan 每次都由 knownBookIds 派生
    [notes, filter, settledQuery, knownBookIds],
  );

  const bookTitle = useMemo(() => {
    const map = new Map(books.map((book) => [book.id, book.title]));
    return (id?: string) => (id ? map.get(id) ?? ORPHAN_BOOK_LABEL : undefined);
  }, [books]);

  // 改挂的候选按书名排序：资料一多，插入顺序就没有可读性
  const libraryBooks = useMemo(
    () =>
      [...books]
        .sort((left, right) => left.title.localeCompare(right.title, 'zh-Hans-CN'))
        .map((book) => ({ id: book.id, title: book.title })),
    [books],
  );

  const filters: { key: 'all' | NoteKind | 'orphan'; label: string; count: number }[] = [
    { key: 'all', label: '全部笔记', count: notes.length },
    {
      key: 'highlight',
      label: '高亮',
      count: notes.filter((note) => note.note_kind === 'highlight').length,
    },
    {
      key: 'note',
      label: '笔记',
      count: notes.filter((note) => note.note_kind === 'note').length,
    },
    {
      key: 'summary',
      label: '总结',
      count: notes.filter((note) => note.note_kind === 'summary').length,
    },
    {
      key: 'orphan',
      label: '未归属',
      count: notes.filter(isOrphan).length,
    },
  ];

  const resetForm = () => {
    draft.clear();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid) {
      return;
    }

    const anchors =
      page.trim() || quote.trim()
        ? [
            {
              kind: (page.trim() ? 'pdf_page' : 'text_quote') as 'pdf_page' | 'text_quote',
              value: page.trim() || quote.trim(),
              ...(page.trim() ? { page: Number.parseInt(page, 10) } : {}),
              ...(quote.trim() ? { quote: quote.trim() } : {}),
            },
          ]
        : [];

    const ok = await run(
      () =>
        addNote({
          title: title.trim(),
          content: content.trim(),
          book_id: bookId || undefined,
          note_kind: kind,
          anchors,
          source_refs:
            bookId && anchors.length > 0
              ? [
                  {
                    source_id: `book:${bookId}`,
                    title: bookTitle(bookId),
                    retrieved_at: new Date().toISOString(),
                    source_type: 'book',
                    credibility: 'unknown',
                    content_hash: '',
                    anchors,
                  },
                ]
              : [],
        }),
      { success: `已保存笔记「${title.trim()}」`, label: '保存笔记' },
    );
    if (!ok) {
      return; // 内容保留，不用重打
    }
    resetForm();
    setShowForm(false);
  };

  const state = resolveState({
    error,
    loading,
    initialized,
    isEmpty: notes.length === 0,
  });

  if (state === 'error') {
    return (
      <div className="space-y-6 font-inter">
        <h1 className="text-3xl font-inter font-bold text-gray-900">读书笔记</h1>
        <StateBlock error={error} hint={errorHint} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-inter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-inter font-bold text-gray-900">读书笔记</h1>
          <p className="font-inter text-gray-600 mt-1">
            {settledQuery
              ? `搜索到 ${filtered.length} / ${notes.length} 条笔记`
              : '记录阅读思考，并保留可回溯的原文位置'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="搜索标题、正文、标签…" />
          <Button variant="primary" size="lg" onClick={() => setShowForm((value) => !value)}>
            <PlusIcon size="sm" />
            <span className="ml-2">{showForm ? '收起表单' : '新建笔记'}</span>
          </Button>
        </div>
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={dismiss} />

      {showForm && (
        <Card variant="default" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DraftNotice draft={draft} />
            <div>
              <label
                htmlFor="note-title"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                标题（必填）
              </label>
              <input
                id="note-title"
                value={title}
                onChange={(event) => set({ title: event.target.value })}
                placeholder="例如：内存管理中的虚拟内存"
                aria-required="true"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="note-content"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                内容（必填）
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(event) => set({ content: event.target.value })}
                rows={4}
                placeholder="记录你的理解、疑问或反驳"
                aria-required="true"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="note-book"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  关联书籍
                </label>
                <select
                  id="note-book"
                  value={bookId}
                  onChange={(event) => set({ bookId: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter bg-white"
                >
                  <option value="">不关联</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="note-kind"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  类型
                </label>
                <select
                  id="note-kind"
                  value={kind}
                  onChange={(event) => set({ kind: event.target.value as NoteKind })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter bg-white"
                >
                  {(Object.keys(KIND_LABEL) as NoteKind[]).map((item) => (
                    <option key={item} value={item}>
                      {KIND_LABEL[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="note-page"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  页码
                </label>
                <input
                  id="note-page"
                  value={page}
                  onChange={(event) => set({ page: event.target.value })}
                  placeholder="128"
                  inputMode="numeric"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
                />
              </div>
              <div>
                <label
                  htmlFor="note-quote"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  原文片段
                </label>
                <input
                  id="note-quote"
                  value={quote}
                  onChange={(event) => set({ quote: event.target.value })}
                  placeholder="用于回溯定位"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p role="alert" className="text-sm font-inter text-red-600">
                {invalid ?? ' '}
              </p>
              <div className="flex gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={busy}
                  disabled={Boolean(invalid)}
                  title={invalid ?? undefined}
                >
                  保存笔记
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <Card variant="default" className="p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="按笔记类型过滤">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={filter === item.key}
              className={`px-4 py-2 rounded-lg font-inter font-medium transition-all duration-200 cursor-pointer-custom ${
                filter === item.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </Card>

      {state === 'loading' ? <StateBlock loading /> : null}

      {state === 'content' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              bookTitle={bookTitle(note.book_id)}
              bookMissing={isOrphan(note)}
              libraryBooks={libraryBooks}
              saving={busy}
              onReattach={(noteId, bookId) => {
                const title = books.find((book) => book.id === bookId)?.title ?? '';
                void run(
                  () => updateNote(noteId, { book_id: bookId }),
                  { success: `已改挂到《${title}》`, label: '改挂资料' },
                );
              }}
              onDelete={async (id) => {
                await run(() => removeNote(id), { success: '已删除笔记', label: '删除笔记' });
              }}
            />
          ))}
        </div>
      ) : null}

      {state === 'content' && filtered.length === 0 ? (
        <Card variant="default" className="p-8 text-center">
          <h3 className="font-inter font-semibold text-gray-900 mb-2">
            {settledQuery
              ? `没有匹配「${settledQuery}」的笔记`
              : filter === 'orphan'
                ? '没有未归属的笔记：每条笔记都能追溯到具体资料'
                : filter === 'all'
                  ? '当前筛选下没有笔记'
                  : `当前筛选下没有${KIND_LABEL[filter]}笔记`}
          </h3>
          <p className="font-inter text-gray-600">
            {settledQuery ? (
              <>
                换个关键词，或
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mx-1 text-blue-600 hover:text-blue-800 underline"
                >
                  清除搜索
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mx-1 text-blue-600 hover:text-blue-800 underline"
            >
              新建一条
            </button>
          </p>
        </Card>
      ) : null}

      {state === 'empty' ? (
        <StateBlock
          emptyTitle="还没有任何笔记"
          emptyAction={
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <PlusIcon size="sm" />
              <span className="ml-2">创建第一条笔记</span>
            </Button>
          }
        />
      ) : null}
    </div>
  );
};

export default NotesView;
