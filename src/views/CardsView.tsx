import React, { useMemo } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import KnowledgeCard from '../components/KnowledgeCard';
import DraftNotice from '../components/DraftNotice';
import FeedbackBanner from '../components/FeedbackBanner';
import { PlusIcon } from '../components/Icon';
import { matchesQuery, SearchBox, useDebouncedValue } from '../components/Search';
import StateBlock, { resolveState } from '../components/StateBlock';
import { useLibraryStore } from '../store/libraryStore';
import { useActionRunner } from '../hooks/useActionRunner';
import { useDraft } from '../hooks/useDraft';
import { useCreateFlag, useQueryFilter } from '../hooks/useUrlSync';
import type { CardType, KnowledgeCard as CardModel } from '../data/types';

const TYPE_LABEL: Record<CardType, string> = {
  concept: '概念',
  fact: '事实',
  quote: '引用',
  idea: '想法',
};

const CardsView: React.FC = () => {
  const cards = useLibraryStore((state) => state.cards);
  const books = useLibraryStore((state) => state.books);
  const notes = useLibraryStore((state) => state.notes);
  const addCard = useLibraryStore((state) => state.addCard);
  const updateCard = useLibraryStore((state) => state.updateCard);
  const removeCard = useLibraryStore((state) => state.removeCard);
  const load = useLibraryStore((state) => state.load);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);
  const loading = useLibraryStore((state) => state.loading);
  const initialized = useLibraryStore((state) => state.initialized);

  const { run, busy, feedback, dismiss } = useActionRunner();

  const [showForm, setShowForm] = useCreateFlag();
  // 未提交的内容暂存在本机：切页面、刷新都不该让人重敲一遍
  const draft = useDraft('cards', {
    title: '',
    definition: '',
    content: '',
    cardType: 'concept' as CardType,
    importance: 'medium' as 'low' | 'medium' | 'high',
    bookId: '',
    sourceNoteId: '',
  });
  const { title, cardType, definition, content, bookId, sourceNoteId, importance } = draft.values;
  const set = draft.set;
  // 过滤词写进 ?q=：从全站搜索跳过来时，用户刚输入的关键词不能凭空消失
  const [query, setQuery] = useQueryFilter();
  const settledQuery = useDebouncedValue(query);

  const reviewedCount = useMemo(() => cards.filter((card) => card.reviewed).length, [cards]);

  /** 卡片必须同时有标题与内容：只有标题的卡片在复习时毫无信息量。 */
  const invalid = useMemo(() => {
    if (!title.trim()) {
      return '请填写卡片标题。';
    }
    if (!content.trim()) {
      return '卡片内容不能为空——一句话说清这个知识是什么。';
    }
    return null;
  }, [title, content]);

  const visible = useMemo(
    () =>
      cards.filter((card) =>
        matchesQuery(settledQuery, [
          card.title,
          card.content,
          card.definition,
          ...(card.metadata.tags ?? []),
        ]),
      ),
    [cards, settledQuery],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid) {
      return;
    }

    const sourceNote = notes.find((note) => note.id === sourceNoteId);
    const ok = await run(
      () =>
        addCard({
          title: title.trim(),
          content: content.trim(),
          definition: definition.trim() || undefined,
          card_type: cardType,
          importance,
          book_id: bookId || sourceNote?.book_id,
          source_refs: sourceNote
            ? [
                {
                  source_id: `note:${sourceNote.id}`,
                  title: sourceNote.title,
                  retrieved_at: new Date().toISOString(),
                  source_type: 'user_input',
                  credibility: 'unknown',
                  content_hash: '',
                  anchors: sourceNote.anchors ?? [],
                  quote: sourceNote.content.slice(0, 200),
                },
              ]
            : [],
          relations: sourceNote
            ? [{ type: 'derived_from', target: sourceNote.id, target_type: 'note' }]
            : [],
        }),
      { success: `已创建卡片「${title.trim()}」`, label: '创建卡片' },
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
    isEmpty: cards.length === 0,
  });

  if (state === 'error') {
    return (
      <div className="space-y-6 font-inter">
        <h1 className="text-3xl font-inter font-bold text-gray-900">知识卡片</h1>
        <StateBlock error={error} hint={errorHint} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-inter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-inter font-bold text-gray-900">知识卡片</h1>
          <p className="font-inter text-gray-600 mt-1">
            {settledQuery
              ? `搜索到 ${visible.length} / ${cards.length} 张卡片`
              : `把阅读沉淀为可复用的原子知识（已核验 ${reviewedCount}/${cards.length}）`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="搜索标题、定义、内容…" />
          <Button variant="primary" size="lg" onClick={() => setShowForm((value) => !value)}>
            <PlusIcon size="sm" />
            <span className="ml-2">{showForm ? '收起表单' : '创建卡片'}</span>
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
                  htmlFor="card-title"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  标题（必填）
                </label>
                <input
                  id="card-title"
                  aria-required="true"
                  value={title}
                  onChange={(event) => set({ title: event.target.value })}
                  placeholder="例如：缓存一致性"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
                />
              </div>
              <div>
                <label
                  htmlFor="card-type"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  类型
                </label>
                <select
                  id="card-type"
                  value={cardType}
                  onChange={(event) => set({ cardType: event.target.value as CardType })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter bg-white"
                >
                  {(Object.keys(TYPE_LABEL) as CardType[]).map((item) => (
                    <option key={item} value={item}>
                      {TYPE_LABEL[item]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="card-definition"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                定义
              </label>
              <input
                id="card-definition"
                value={definition}
                onChange={(event) => set({ definition: event.target.value })}
                placeholder="一句话说明它是什么"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
              />
            </div>
            <div>
              <label
                htmlFor="card-content"
                className="block text-sm font-inter font-medium text-gray-700 mb-1"
              >
                内容（必填）
              </label>
              <textarea
                id="card-content"
                aria-required="true"
                value={content}
                onChange={(event) => set({ content: event.target.value })}
                rows={4}
                placeholder="展开说明、适用场景与边界条件"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="card-book"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  关联书籍
                </label>
                <select
                  id="card-book"
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
                  htmlFor="card-source-note"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  来源笔记
                </label>
                <select
                  id="card-source-note"
                  value={sourceNoteId}
                  onChange={(event) => set({ sourceNoteId: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter bg-white"
                >
                  <option value="">无</option>
                  {notes.map((note) => (
                    <option key={note.id} value={note.id}>
                      {note.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="card-importance"
                  className="block text-sm font-inter font-medium text-gray-700 mb-1"
                >
                  重要度
                </label>
                <select
                  id="card-importance"
                  value={importance}
                  onChange={(event) => set({ importance: event.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter bg-white"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
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
                  保存卡片
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {state === 'loading' ? <StateBlock loading /> : null}

      {state === 'content' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((card: CardModel) => (
            <KnowledgeCard
              key={card.id}
              card={card}
              onDelete={async (id) => {
                await run(() => removeCard(id), { success: '已删除卡片', label: '删除卡片' });
              }}
              onToggleReviewed={(id, reviewed) =>
                void run(
                  () => updateCard(id, { reviewed }),
                  {
                    success: reviewed ? '已标记为已核验' : '已取消核验标记',
                    label: '更新核验状态',
                  },
                )
              }
            />
          ))}
        </div>
      ) : null}

      {state === 'content' && visible.length === 0 ? (
        <Card variant="default" className="p-8 text-center">
          <h3 className="font-inter font-semibold text-gray-900 mb-2">
            没有匹配「{settledQuery}」的卡片
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
            查看全部 {cards.length} 张。
          </p>
        </Card>
      ) : null}

      {state === 'empty' ? (
        <StateBlock
          emptyTitle="还没有知识卡片"
          emptyAction={
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <PlusIcon size="sm" />
              <span className="ml-2">创建第一张卡片</span>
            </Button>
          }
        />
      ) : null}
    </div>
  );
};

export default CardsView;
