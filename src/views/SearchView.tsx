/**
 * 全站搜索页（`/search?q=…`）。
 *
 * 导航栏原来放着一个搜索图标，但**没有任何搜索功能**：点下去不会发生任何事。
 * 与其留一个骗人的按钮，不如把它接成真的能用的东西——本地数据量不大，
 * 直接在前端全量过滤即可，不需要额外的索引。
 */
import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Card from '../components/Card';
import { BookOpenIcon, DocumentIcon, LightBulbIcon, StarIcon } from '../components/Icon';
import { matchesQuery, SearchBox, useDebouncedValue } from '../components/Search';
import StateBlock, { resolveState } from '../components/StateBlock';
import { useLibraryStore } from '../store/libraryStore';

interface Hit {
  id: string;
  title: string;
  snippet: string;
  to: string;
  group: string;
  icon: React.ReactElement;
}

const GROUP_ORDER = ['资料', '笔记', '知识卡片', '书单'];
const SearchView: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const settledQuery = useDebouncedValue(query);

  const books = useLibraryStore((state) => state.books);
  const notes = useLibraryStore((state) => state.notes);
  const cards = useLibraryStore((state) => state.cards);
  const booklists = useLibraryStore((state) => state.booklists);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);
  const loading = useLibraryStore((state) => state.loading);
  const initialized = useLibraryStore((state) => state.initialized);
  const load = useLibraryStore((state) => state.load);

  const hits = useMemo<Hit[]>(() => {
    if (!settledQuery.trim()) {
      return [];
    }
    // 每个命中都带着查询词跳转：只给路径的话，落地页显示全量列表、
    // 搜索框却是空的，用户刚做的筛选等于没做。
    const carry = `?q=${encodeURIComponent(settledQuery.trim())}`;
    const found: Hit[] = [];
    for (const book of books) {
      if (matchesQuery(settledQuery, [book.title, book.author, book.content, book.body, ...(book.metadata.tags ?? [])])) {
        found.push({
          id: book.id,
          title: book.title,
          snippet: book.author ? `作者：${book.author}` : (book.content ?? '').slice(0, 80),
          to: '/library' + carry,
          group: '资料',
          icon: <BookOpenIcon size="sm" />,
        });
      }
    }
    for (const note of notes) {
      if (matchesQuery(settledQuery, [note.title, note.content, ...(note.metadata.tags ?? [])])) {
        found.push({
          id: note.id,
          title: note.title,
          snippet: note.content.slice(0, 80),
          to: '/notes' + carry,
          group: '笔记',
          icon: <DocumentIcon size="sm" />,
        });
      }
    }
    for (const card of cards) {
      if (matchesQuery(settledQuery, [card.title, card.content, ...(card.metadata.tags ?? [])])) {
        found.push({
          id: card.id,
          title: card.title,
          snippet: card.content.slice(0, 80),
          to: '/cards' + carry,
          group: '知识卡片',
          icon: <LightBulbIcon size="sm" />,
        });
      }
    }
    for (const list of booklists) {
      if (matchesQuery(settledQuery, [list.title, list.description, ...list.tags])) {
        found.push({
          id: list.id,
          title: list.title,
          snippet: list.description ?? '',
          to: '/booklists' + carry,
          group: '书单',
          icon: <StarIcon size="sm" />,
        });
      }
    }
    return found;
  }, [settledQuery, books, notes, cards, booklists]);

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const hit of hits) {
      const bucket = map.get(hit.group) ?? [];
      bucket.push(hit);
      map.set(hit.group, bucket);
    }
    return GROUP_ORDER.filter((group) => (map.get(group) ?? []).length > 0).map((group) => ({
      group,
      items: map.get(group) ?? [],
    }));
  }, [hits]);

  const state = resolveState({ error, loading, initialized, isEmpty: false });

  if (state === 'error') {
    return (
      <div className="space-y-6 font-inter">
        <h1 className="text-3xl font-inter font-bold text-gray-900">搜索</h1>
        <StateBlock error={error} hint={errorHint} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-inter">
      <div>
        <h1 className="text-3xl font-inter font-bold text-gray-900">搜索</h1>
        <p className="font-inter text-gray-600 mt-1">
          在全部本地数据里查找：资料、笔记、知识卡片、书单
        </p>
      </div>

      <SearchBox
        value={query}
        onChange={(value) => {
          setQuery(value);
          const next = new URLSearchParams(params);
          if (value) {
            next.set('q', value);
          } else {
            next.delete('q');
          }
          setParams(next, { replace: true });
        }}
        placeholder="搜索全部数据…"
        label="搜索全部本地数据"
      />

      {!settledQuery.trim() ? (
        <StateBlock emptyTitle="输入关键词开始搜索（支持多个词，用空格分隔）" />
      ) : null}

      {settledQuery.trim() && hits.length === 0 ? (
        <Card variant="default" className="p-8 text-center">
          <h2 className="font-inter font-semibold text-gray-900 mb-2">
            没有找到包含「{settledQuery}」的条目
          </h2>
          <p className="font-inter text-gray-600">
            试试更短的关键词（例如只输入书名里的两个字），或先到
            <Link to="/library" className="mx-1 text-blue-600 hover:text-blue-800 underline">
              资料库
            </Link>
            导入内容。
          </p>
        </Card>
      ) : null}

      {grouped.map((section) => (
        <section key={section.group} aria-label={section.group}>
          <h2 className="text-lg font-inter font-semibold text-gray-900 mb-3">
            {section.group}（{section.items.length}）
          </h2>
          <div className="space-y-3">
            {section.items.map((hit) => (
              <Link key={hit.id} to={hit.to} className="block">
                <Card variant="glass" hoverEffect className="p-4 flex items-start gap-3">
                  <span className="p-2 rounded-lg bg-blue-100 text-blue-600">{hit.icon}</span>
                  <span className="min-w-0">
                    <span className="block font-inter font-medium text-gray-900">{hit.title}</span>
                    {hit.snippet ? (
                      <span className="block text-sm font-inter text-gray-600 truncate">
                        {hit.snippet}
                      </span>
                    ) : null}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default SearchView;
