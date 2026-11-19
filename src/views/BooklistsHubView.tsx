import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { loadPublicLists, type PublicList } from '../data/publicLists';

/** 统一「主题书单」入口：保留 THEME / BOOKLIST 两种类型，不合并丢失说明。 */
const BooklistsHubView: React.FC = () => {
  const [items, setItems] = useState<PublicList[] | null>(null);
  const [kind, setKind] = useState<'all' | 'theme' | 'booklist'>('all');
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const setQuery = (value: string) => setParams(value ? { q: value } : {}, { replace: true });

  useEffect(() => {
    let alive = true;
    void loadPublicLists().then((result) => {
      if (alive) setItems([...result.themes, ...result.booklists]);
    });
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => (items ?? []).filter((item) => {
    if (kind !== 'all' && item.kind !== kind) return false;
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hay = [item.title, item.description, ...item.tags].join('\n').toLowerCase();
    return words.every((word) => hay.includes(word));
  }), [items, kind, query]);

  if (items === null) {
    return <p className="mx-auto max-w-5xl px-4 py-12 font-inter text-body">正在读取书单…</p>;
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-8 font-inter text-body">
      <p className="text-sm text-slate-500">公开内容 / 书单</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">主题书单</h1>
      <p className="mt-2 text-sm text-slate-600">
        主题阅读与具体书单保留各自类型与原始说明；共 {items.length} 份内容。
      </p>
      <p className="mt-1 text-xs text-slate-500">
        旧入口 <Link to="/themes" className="text-brand hover:underline">/themes</Link>
        {' / '}<Link to="/lists" className="text-brand hover:underline">/lists</Link> 继续有效。
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <label htmlFor="booklists-search" className="sr-only">搜索书单</label>
        <input id="booklists-search" type="search" aria-label="搜索书单" value={query}
          onChange={(event) => setQuery(event.target.value)} placeholder="搜索书单或主题"
          className="w-full max-w-sm rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
        {(['all', 'theme', 'booklist'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setKind(value)} aria-pressed={kind === value}
            className={`rounded border px-3 py-2 text-sm ${kind === value ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'}`}>
            {value === 'all' ? '全部' : value === 'theme' ? '主题阅读' : '书单'}
          </button>
        ))}
      </div>

      <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <li key={item.id} className="rounded border border-slate-200 bg-white p-5 hover:border-brand">
            <p className="text-xs text-accent">{item.kind === 'theme' ? '主题阅读' : '书单'}</p>
            <Link to={item.kind === 'theme' ? `/themes/${item.id}` : `/lists/${item.id}`}
              className="mt-1 block text-lg font-medium text-ink hover:underline">{item.title}</Link>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.description || '（无摘要）'}</p>
            <p className="mt-3 text-xs text-slate-500">{item.book_count} 本书 · {item.linked_notes} 本有笔记</p>
          </li>
        ))}
      </ul>
      {visible.length === 0 ? <p className="mt-6 text-slate-600">没有匹配的内容。</p> : null}
    </section>
  );
};

/** /booklists/:id 兼容路由：按 id 找到真实类型后转到既有详情，不复制内容、不覆盖原文。 */
export const BooklistDetailRedirect: React.FC = () => {
  const { id = '' } = useParams();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void loadPublicLists().then((result) => {
      if (!alive) return;
      const found = [...result.themes, ...result.booklists].find((item) => item.id === id);
      setTarget(found ? (found.kind === 'theme' ? `/themes/${id}` : `/lists/${id}`) : '/booklists');
    });
    return () => { alive = false; };
  }, [id]);

  if (target === null) {
    return <p className="mx-auto max-w-5xl px-4 py-12 font-inter text-body">正在定位书单…</p>;
  }
  return <Navigate to={target} replace />;
};

export default BooklistsHubView;
