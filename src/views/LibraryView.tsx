import React, { useMemo } from 'react';

import Button from '../components/Button';
import Card from '../components/Card';
import ConfirmAction from '../components/ConfirmAction';
import DraftNotice from '../components/DraftNotice';
import FeedbackBanner from '../components/FeedbackBanner';
import { BookOpenIcon, PlusIcon, ClockIcon } from '../components/Icon';
import { matchesQuery, SearchBox, useDebouncedValue } from '../components/Search';
import StateBlock, { resolveState } from '../components/StateBlock';
import { READING_STATUS_LABEL } from '../data/labels';
import { SAMPLE_TAG, type SampleCounts } from '../data/sample';
import type { ReadingStatus } from '../data/types';
import { useActionRunner } from '../hooks/useActionRunner';
import { useDraft } from '../hooks/useDraft';
import { useCreateFlag, useQueryFilter } from '../hooks/useUrlSync';
import { useLibraryStore } from '../store/libraryStore';

const STATUS_LABEL = READING_STATUS_LABEL;

const LibraryView: React.FC = () => {
  const books = useLibraryStore((state) => state.books);
  const notes = useLibraryStore((state) => state.notes);
  const cards = useLibraryStore((state) => state.cards);
  const addBook = useLibraryStore((state) => state.addBook);
  const updateBook = useLibraryStore((state) => state.updateBook);
  const removeBook = useLibraryStore((state) => state.removeBook);
  const sampleBusy = useLibraryStore((state) => state.sampleBusy);
  const loadSample = useLibraryStore((state) => state.loadSample);
  const removeSample = useLibraryStore((state) => state.removeSample);
  const load = useLibraryStore((state) => state.load);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);
  const loading = useLibraryStore((state) => state.loading);
  const initialized = useLibraryStore((state) => state.initialized);

  const { run, busy, feedback, dismiss } = useActionRunner();

  // `?q=` 让搜索结果可以被分享与后退，也让全站搜索能带着关键词落到本页
  const [query, setQuery] = useQueryFilter();
  const settledQuery = useDebouncedValue(query);

  const visible = useMemo(
    () =>
      books.filter((book) =>
        matchesQuery(settledQuery, [
          book.title,
          book.author,
          book.content,
          book.body,
          ...(book.metadata.tags ?? []),
        ]),
      ),
    [books, settledQuery],
  );

  const hasSample = books.some((book) => (book.metadata.tags ?? []).includes(SAMPLE_TAG));

  // 仪表板的「导入资料」写着新建，就该真的把表单摊开
  const [showForm, setShowForm] = useCreateFlag();
  // 未提交的内容暂存在本机：切页面、刷新都不该让人重敲一遍
  const draft = useDraft('library', {
    title: '',
    author: '',
    description: '',
    body: '',
    status: 'reading' as ReadingStatus,
  });
  const { title, author, description, body, status } = draft.values;
  const set = draft.set;

  // 与另外三个表单页保持同一口径：原因要看得见。
  // 只把按钮置灰、原因塞进 title 提示，鼠标不悬停的人只知道「点了没反应」。
  const invalid = title.trim() ? null : '请填写资料标题：没有标题的资料之后既搜不到也认不出来。';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid) {
      return;
    }
    const ok = await run(
      () =>
        addBook({
          title: title.trim(),
          author: author.trim() || undefined,
          description: description.trim() || undefined,
          body,
          reading_status: status,
        }),
      { success: `已导入《${title.trim()}》`, label: '导入资料' },
    );
    if (!ok) {
      return; // 表单保留，用户不必重新输入
    }
    draft.clear();
    setShowForm(false);
  };

  const state = resolveState({
    error,
    loading,
    initialized,
    isEmpty: books.length === 0,
  });

  if (state === 'error') {
    return (
      <div className="space-y-6 font-inter">
        <h1 className="text-3xl font-inter font-bold text-gray-900">资料库</h1>
        <StateBlock error={error} hint={errorHint} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-inter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-inter font-bold text-gray-900">资料库</h1>
          <p className="font-inter text-gray-600 mt-1">
            {settledQuery
              ? `搜索到 ${visible.length} / ${books.length} 项资料`
              : `导入书籍与原始资料，共 ${books.length} 项`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="搜索书名、作者、原文…" />
          <Button variant="primary" size="lg" onClick={() => setShowForm((value) => !value)}>
            <PlusIcon size="sm" />
            <span className="ml-2">{showForm ? '收起表单' : '导入资料'}</span>
          </Button>
        </div>
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={dismiss} />

      {showForm && (
        <Card variant="default" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DraftNotice draft={draft} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="book-title"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  标题（必填）
                </label>
                <input
                  id="book-title"
                  value={title}
                  onChange={(event) => set({ title: event.target.value })}
                  placeholder="书名或资料名"
                  aria-required="true"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
                />
              </div>
              <div>
                <label
                  htmlFor="book-author"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  作者
                </label>
                <input
                  id="book-author"
                  value={author}
                  onChange={(event) => set({ author: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="book-description"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                简介
              </label>
              <input
                id="book-description"
                value={description}
                onChange={(event) => set({ description: event.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
              />
            </div>
            <div>
              <label
                htmlFor="book-body"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                原文内容（可选，用于阅读与定位）
              </label>
              <textarea
                id="book-body"
                value={body}
                onChange={(event) => set({ body: event.target.value })}
                rows={6}
                placeholder="粘贴 Markdown 或纯文本内容"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="book-status"
                  className="text-sm font-inter font-medium text-gray-700"
                >
                  状态
                </label>
                <select
                  id="book-status"
                  value={status}
                  onChange={(event) => set({ status: event.target.value as ReadingStatus })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter bg-white"
                >
                  {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((item) => (
                    <option key={item} value={item}>
                      {STATUS_LABEL[item]}
                    </option>
                  ))}
                </select>
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
                    保存资料
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Card>
      )}

      {state === 'loading' ? <StateBlock loading /> : null}

      {state === 'content' && visible.length === 0 ? (
        <Card variant="default" className="p-8 text-center">
          <h3 className="font-inter font-semibold text-gray-900 mb-2">
            没有匹配「{settledQuery}」的资料
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
            查看全部 {books.length} 项。
          </p>
        </Card>
      ) : null}

      {state === 'content' && visible.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((book) => {
            const bookNotes = notes.filter((note) => note.book_id === book.id);
            const bookCards = cards.filter((card) => card.book_id === book.id);
            return (
              <Card key={book.id} variant="glass" hoverEffect className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <BookOpenIcon size="sm" />
                    </div>
                    <div>
                      <h3 className="font-inter font-semibold text-gray-900">{book.title}</h3>
                      {book.author && (
                        <p className="font-inter text-sm text-gray-600">{book.author}</p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-inter font-medium bg-blue-100 text-blue-700">
                    {STATUS_LABEL[book.reading_status]}
                  </span>
                </div>

                {book.content && (
                  <p className="font-inter text-sm text-gray-600 mb-3 line-clamp-2">
                    {book.content}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs font-inter text-gray-500 mb-4">
                  <span>{bookNotes.length} 条笔记</span>
                  <span>{bookCards.length} 张卡片</span>
                  <span>{book.body ? `${book.body.length} 字原文` : '未导入原文'}</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-1">
                    <ClockIcon size="sm" className="text-gray-500" />
                    <span className="font-inter text-xs text-gray-500">
                      {new Date(book.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        void run(
                          () =>
                            updateBook(book.id, {
                              reading_status:
                                book.reading_status === 'completed' ? 'reading' : 'completed',
                            }),
                          {
                            success: `《${book.title}》已标记为${
                              book.reading_status === 'completed'
                                ? STATUS_LABEL.reading
                                : STATUS_LABEL.completed
                            }`,
                            label: '更新状态',
                          },
                        )
                      }
                      className="cursor-pointer-custom text-xs text-blue-600 hover:text-blue-800 transition-colors duration-150"
                    >
                      {book.reading_status === 'completed' ? '标记在读' : '标记已读'}
                    </button>
                    <ConfirmAction
                      label="删除"
                      confirmLabel="确认删除？"
                      detail={`会连带删除 ${bookNotes.length} 条笔记与 ${bookCards.length} 张卡片，且无法撤销`}
                      onConfirm={() =>
                        run(() => removeBook(book.id), {
                          success: `已删除《${book.title}》`,
                          label: '删除资料',
                        })
                      }
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {state === 'empty' ? (
        <StateBlock
          emptyTitle="资料库是空的"
          emptyAction={
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <PlusIcon size="sm" />
                <span className="ml-2">导入资料</span>
              </Button>
              <Button
                variant="outline"
                isLoading={sampleBusy || busy}
                onClick={() =>
                  void run(() => loadSample(), {
                    label: '加载示例库',
                    success: (result) => countsMessage('已加载合成示例库', result as SampleCounts),
                  })
                }
              >
                <span>加载示例库（合成数据）</span>
              </Button>
            </div>
          }
        />
      ) : null}

      {state === 'empty' ? (
        <Card variant="default" className="p-6">
          <p className="font-inter text-xs text-gray-500 max-w-prose mx-auto text-center">
            示例库是<strong>合成演示数据</strong>（标签 {SAMPLE_TAG}），用于演示「原文 → 笔记（带锚点）
            → 知识卡片 → 关系 → 书单」的完整链路，不代表任何真实书籍内容，可随时清除。
          </p>
        </Card>
      ) : null}

      {hasSample ? (
        <Card variant="default" className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="font-inter text-sm text-gray-600 flex-1">
            当前资料库含<strong>合成示例数据</strong>（标签 {SAMPLE_TAG}）：3 本示例书、6 条笔记、
            5 张卡片、1 条书单。它们不是真实阅读记录，导出时会携带该标签。
          </p>
          <Button
            variant="ghost"
            size="sm"
            isLoading={sampleBusy || busy}
            onClick={() =>
              void run(() => removeSample(), {
                label: '清除示例数据',
                success: (result) => countsMessage('已清除示例数据', result as SampleCounts),
              })
            }
          >
            <span>清除示例数据</span>
          </Button>
        </Card>
      ) : null}
    </div>
  );
};

/** 示例库操作的统一话术：把「动了多少条」说清楚，且再次强调真实数据未受影响。 */
function countsMessage(prefix: string, counts: SampleCounts): string {
  if (counts.skipped) {
    return '示例库已存在，未重复写入；可先清除后再加载。';
  }
  return (
    `${prefix}：${counts.books} 本书、${counts.notes} 条笔记、${counts.cards} 张卡片、` +
    `${counts.booklists} 条书单、${counts.relations} 条关系。真实数据未受影响。`
  );
}

export default LibraryView;
