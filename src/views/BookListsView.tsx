import React, { useMemo } from 'react';

import BookListCard, { type BookListEntry } from '../components/BookListCard';
import Button from '../components/Button';
import Card from '../components/Card';
import DraftNotice from '../components/DraftNotice';
import FeedbackBanner from '../components/FeedbackBanner';
import { PlusIcon } from '../components/Icon';
import { matchesQuery, SearchBox, useDebouncedValue } from '../components/Search';
import StateBlock, { resolveState } from '../components/StateBlock';
import type { BookList } from '../data/types';
import { useActionRunner } from '../hooks/useActionRunner';
import { useDraft } from '../hooks/useDraft';
import { useCreateFlag, useQueryFilter } from '../hooks/useUrlSync';
import { useLibraryStore } from '../store/libraryStore';

const BookListsView: React.FC = () => {
  const booklists = useLibraryStore((state) => state.booklists);
  const books = useLibraryStore((state) => state.books);
  const addBookList = useLibraryStore((state) => state.addBookList);
  const removeBookList = useLibraryStore((state) => state.removeBookList);
  const setBookListBooks = useLibraryStore((state) => state.setBookListBooks);
  const load = useLibraryStore((state) => state.load);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);
  const loading = useLibraryStore((state) => state.loading);
  const initialized = useLibraryStore((state) => state.initialized);

  const { run, busy, feedback, dismiss } = useActionRunner();

  const [showForm, setShowForm] = useCreateFlag();
  // 未提交的内容暂存在本机：切页面、刷新都不该让人重敲一遍
  const draft = useDraft('booklists', {
    title: '',
    description: '',
    tags: '',
  });
  const { title, description, tags } = draft.values;
  const set = draft.set;
  // 过滤词写进 ?q=：从全站搜索跳过来时，用户刚输入的关键词不能凭空消失
  const [query, setQuery] = useQueryFilter();
  const settledQuery = useDebouncedValue(query);

  const invalid = title.trim() ? null : '请填写书单名称。';

  const visible = useMemo(
    () =>
      booklists.filter((booklist) =>
        matchesQuery(settledQuery, [booklist.title, booklist.description, ...booklist.tags]),
      ),
    [booklists, settledQuery],
  );

  const knownBookIds = useMemo(() => new Set(books.map((book) => book.id)), [books]);
  // 卡片上要能看见「是哪几本书」，所以按书单存的顺序把 id 解析成条目；
  // 解析不出来的（资料已删除）不进列表，由 missingBookCount 说明，绝不画成空标题。
  const entryIndex = useMemo(
    () => new Map(books.map((book) => [book.id, { id: book.id, title: book.title, status: book.reading_status }])),
    [books],
  );
  const entriesFor = (bookList: BookList): BookListEntry[] =>
    bookList.book_ids
      .map((id) => entryIndex.get(id))
      .filter((entry): entry is BookListEntry => entry !== undefined);
  // 书单卡片的勾选列表按书名排：资料一多，插入顺序就没有可读性可言
  const libraryBooks = useMemo(
    () =>
      [...books]
        .sort((left, right) => left.title.localeCompare(right.title, 'zh-Hans-CN'))
        .map((book) => ({ id: book.id, title: book.title })),
    [books],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid) {
      return;
    }
    const ok = await run(
      () =>
        addBookList({
          title: title.trim(),
          description: description.trim() || undefined,
          tags: tags
            .split(/[,，\s]+/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      { success: `已创建书单「${title.trim()}」`, label: '创建书单' },
    );
    if (!ok) {
      return;
    }
    draft.clear();
    setShowForm(false);
  };

  const state = resolveState({
    error,
    loading,
    initialized,
    isEmpty: booklists.length === 0,
  });

  if (state === 'error') {
    return (
      <div className="space-y-6 font-inter">
        <h1 className="text-3xl font-inter font-bold text-gray-900">精选书单</h1>
        <StateBlock error={error} hint={errorHint} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-inter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-inter font-bold text-gray-900">精选书单</h1>
          <p className="font-inter text-gray-600 mt-1">
            {settledQuery
              ? `搜索到 ${visible.length} / ${booklists.length} 个书单`
              : '组织阅读计划与待读书目：在卡片上点「管理书目」即可从资料库勾选内容'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="搜索书单名称、描述、标签…" />
          <Button variant="primary" size="lg" onClick={() => setShowForm((value) => !value)}>
            <PlusIcon size="sm" />
            <span className="ml-2">{showForm ? '收起表单' : '新建书单'}</span>
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
                htmlFor="list-title"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                名称（必填）
              </label>
              <input
                id="list-title"
                aria-required="true"
                value={title}
                onChange={(event) => set({ title: event.target.value })}
                placeholder="例如：系统设计经典"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
              />
            </div>
            <div>
              <label
                htmlFor="list-description"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                描述
              </label>
              <input
                id="list-description"
                value={description}
                onChange={(event) => set({ description: event.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
              />
            </div>
            <div>
              <label
                htmlFor="list-tags"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                标签
              </label>
              <input
                id="list-tags"
                value={tags}
                onChange={(event) => set({ tags: event.target.value })}
                placeholder="用空格或逗号分隔"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
              />
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
                  保存书单
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {state === 'loading' ? <StateBlock loading /> : null}

      {state === 'content' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((booklist) => (
            <BookListCard
              key={booklist.id}
              bookList={booklist}
              entries={entriesFor(booklist)}
              onDelete={async (id) => {
                await run(() => removeBookList(id), { success: '已删除书单', label: '删除书单' });
              }}
              missingBookCount={
                booklist.book_ids.filter((id) => !knownBookIds.has(id)).length
              }
              libraryBooks={libraryBooks}
              saving={busy}
              onSaveBooks={(id, bookIds) => {
                void run(
                  () => setBookListBooks(id, bookIds),
                  {
                    success:
                      bookIds.length > 0
                        ? `已更新书单，现在共 ${bookIds.length} 项`
                        : '已从书单移除全部资料',
                    label: '更新书单',
                  },
                );
              }}
            />
          ))}
        </div>
      ) : null}

      {state === 'content' && visible.length === 0 ? (
        <Card variant="default" className="p-8 text-center">
          <h3 className="font-inter font-semibold text-gray-900 mb-2">
            没有匹配「{settledQuery}」的书单
          </h3>
          <p className="font-inter text-gray-600">
            换个关键词试试，或
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mx-1 text-blue-600 hover:text-blue-800 underline"
            >
              清除搜索
            </button>
            查看全部 {booklists.length} 个。
          </p>
        </Card>
      ) : null}

      {state === 'empty' ? (
        <StateBlock
          emptyTitle="还没有书单"
          emptyAction={
            <div className="space-y-4">
              <p className="font-inter text-sm text-gray-600">
                当前共收录 {books.length} 本书；
                {books.length === 0 ? '先在资料库导入内容，再规划阅读路径。' : '创建书单开始规划阅读路径。'}
              </p>
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <PlusIcon size="sm" />
                <span className="ml-2">创建书单</span>
              </Button>
            </div>
          }
        />
      ) : null}
    </div>
  );
};

export default BookListsView;
