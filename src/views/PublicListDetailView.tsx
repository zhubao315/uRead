import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SafeMarkdown from '../components/SafeMarkdown';
import { loadPublicLists, type ListsResult, type PublicList } from '../data/publicLists';
import CollectionArtwork from '../components/media/CollectionArtwork';

/** 主题 / 书单详情：书表是主角，正文只作补充说明，避免把同一份信息念两遍。 */
const PublicListDetailView: React.FC<{ kind: 'theme' | 'booklist' }> = ({ kind }) => {
  const { id = '' } = useParams();
  const [result, setResult] = useState<ListsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void loadPublicLists().then((next) => {
      if (alive) { setResult(next); setLoading(false); }
    });
    return () => { alive = false; };
  }, []);

  const item = useMemo<PublicList | null>(() => {
    const source = kind === 'theme' ? result?.themes ?? [] : result?.booklists ?? [];
    return source.find((entry) => entry.id === id) ?? null;
  }, [kind, result, id]);

  const base = kind === 'theme' ? '/themes' : '/lists';

  if (loading && result === null) {
    return <p className="font-inter text-gray-700">正在读取内容…</p>;
  }
  if (!item) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-8 font-inter">
        <h1 className="text-2xl font-bold text-gray-900">这份清单不在公开集合里</h1>
        <p className="mt-2 text-gray-700">可能是地址写错，或者还没同步进来。</p>
        <Link to={base} className="mt-4 inline-block text-blue-700 hover:underline">返回列表</Link>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6 md:p-10 font-inter">
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); }}
        className="mb-3 rounded border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:border-brand">
        复制这份书单链接
      </button>

      <p className="text-sm text-gray-500">
        <Link to={base} className="hover:text-blue-700 hover:underline">{kind === 'theme' ? '主题阅读' : '书单推荐'}</Link>
        <span className="mx-2">/</span>{item.title}
      </p>
      <CollectionArtwork kind={kind} id={item.id} title={item.title} className="mt-5 w-full rounded-lg" eager highPriority />
      <h1 className="font-editorial mt-6 text-3xl font-semibold text-navy">{item.title}</h1>
      {item.description ? <p className="mt-3 text-gray-700">{item.description}</p> : null}
      <p className="mt-2 text-sm text-gray-500">
        {item.book_count} 本书 · {item.linked_notes} 本已有笔记{item.updated ? ` · 更新 ${item.updated}` : ''}
      </p>
      {item.tags.length ? <p className="mt-2 text-xs text-gray-500">{item.tags.join(' / ')}</p> : null}

      <section className="mt-8" aria-labelledby="book-table-title">
        <h2 id="book-table-title" className="text-xl font-bold text-gray-900">书目</h2>
        {item.books.length === 0 ? (
          <p className="mt-3 text-gray-600">这份清单没有可解析的书目。</p>
        ) : (
          <ol className="mt-4 divide-y divide-gray-100">
            {item.books.map((book, index) => (
              <li key={`${book.name}-${index}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                <span className="w-7 shrink-0 text-sm text-gray-600">{index + 1}</span>
                <span className="font-medium text-gray-900">
                  {book.note_slug ? (
                    <Link to={`/read/${encodeURIComponent(book.note_slug)}`} className="text-blue-700 hover:underline">{book.name}</Link>
                  ) : book.name}
                </span>
                {book.author ? <span className="text-sm text-gray-600">{book.author}</span> : null}
                {book.detail ? <span className="w-full pl-10 text-sm text-gray-500">{book.detail.replace(/[*`|]/g, '')}</span> : null}
                {book.note_slug ? <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">有笔记</span> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {item.body.replace(/^[\s\S]*?^#\s+[^\n]*\n/m, '').trim() ? (
        <details className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-800">查看原文与其他说明</summary>
          <div className="mt-4"><SafeMarkdown source={item.body} /></div>
        </details>
      ) : null}

      <footer className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-500">
        来源：私有 Obsidian 仓库 · <code>{item.source_ref.path}</code> · 内容版本 {item.content_hash}
      </footer>
    </article>
  );
};

export default PublicListDetailView;
