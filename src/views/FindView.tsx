import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SITE_BASE } from '../config';
import { loadPublicNotes, type PublicNote } from '../data/publicNotes';
import { loadPublicLists, type PublicList } from '../data/publicLists';

interface FindBook { id: string; title: string; author: string; note_count?: number; }
interface Pool {
  notes: PublicNote[];
  lists: PublicList[];
  books: FindBook[];
}

/** 内容搜索：四类分组显示，不把书籍/笔记/书单/主题混成一条流。 */
const FindView: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [pool, setPool] = useState<Pool | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        document.getElementById('find-q')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadPublicNotes(),
      loadPublicLists(),
      fetch(`${SITE_BASE}books/aggregate.json`, { cache: 'no-store' }).catch(() => null),
    ]).then(async ([notes, lists, response]) => {
      const books: FindBook[] = response?.ok ? (await response.json()).books ?? [] : [];
      if (alive) setPool({ notes: notes.notes, lists: [...lists.themes, ...lists.booklists], books });
    });
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length || !pool) return { notes: [], books: [], booklists: [], themes: [] };
    const hit = (text: string) => words.every((word) => text.toLowerCase().includes(word));
    return {
      notes: pool.notes.filter((n) => hit([n.title, n.body, ...n.tags].join('\n'))).slice(0, 30),
      books: pool.books.filter((b) => hit([b.title, b.author].join('\n'))),
      booklists: pool.lists.filter((l) => l.kind === 'booklist' && hit([l.title, l.description].join('\n'))),
      themes: pool.lists.filter((l) => l.kind === 'theme' && hit([l.title, l.description].join('\n'))),
    };
  }, [pool, query]);

  const total = groups.notes.length + groups.books.length + groups.booklists.length + groups.themes.length;

  return (
    <section className="mx-auto max-w-5xl px-5 py-8 font-inter text-body">
      <h1 className="text-2xl font-semibold text-ink">搜索读书内容</h1>
      <form onSubmit={(event) => { event.preventDefault(); setParams(query ? { q: query } : {}); }} className="mt-4 flex gap-2">
        <label htmlFor="find-q" className="sr-only">搜索</label>
        <input id="find-q" type="search" aria-label="搜索" value={query}
          onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })}
          placeholder="搜索书名、作者、笔记或主题" className="w-full rounded border border-slate-300 bg-white px-3 py-2" />
        <button type="submit" className="rounded bg-brand px-4 py-2 text-white">搜索</button>
      </form>
      {pool === null ? <p className="mt-6 text-slate-600">正在载入内容索引…</p> : null}
      {query && pool ? <p className="mt-4 text-sm text-slate-600">「{query}」命中 {total} 条内容，按类型分组。</p> : null}

      {[
        ['书籍', groups.books, (item: FindBook) => (
          <a key={item.id} href={`${SITE_BASE}books/${item.id}/`} className="text-brand hover:underline">
            {item.title}<span className="ml-2 text-slate-500">{item.author} · {item.note_count ?? 0} 篇笔记</span>
          </a>)],
        ['读书笔记', groups.notes, (item: PublicNote) => (
          <Link key={item.slug} to={`/read/${encodeURIComponent(item.slug)}`} className="text-brand hover:underline">{item.title}</Link>)],
        ['书单', groups.booklists, (item: PublicList) => (
          <Link key={item.id} to={`/lists/${item.id}`} className="text-brand hover:underline">{item.title}</Link>)],
        ['主题阅读', groups.themes, (item: PublicList) => (
          <Link key={item.id} to={`/themes/${item.id}`} className="text-brand hover:underline">{item.title}</Link>)],
      ].map(([label, items, render]) => {
        const typed = items as Array<FindBook | PublicNote | PublicList>;
        if (!typed.length) return null;
        return (
          <section key={label as string} className="mt-8" aria-label={label as string}>
            <h2 className="text-lg font-semibold text-ink">{label as string}（{typed.length}）</h2>
            <ul className="mt-3 space-y-2">
              {typed.slice(0, 12).map((item) => <li key={(item as { id?: string; slug?: string }).id ?? (item as PublicNote).slug}>{(render as (x: typeof item) => React.ReactNode)(item)}</li>)}
            </ul>
          </section>
        );
      })}
      {query && pool && total === 0 ? (
        <div className="mt-8 rounded-md border border-border bg-surface p-5 text-sm text-muted">
          <p>没有匹配的内容。你可以换个关键词，或从这些真实内容入口开始：</p>
          <p className="mt-2">
            <Link to="/booklists" className="text-brand hover:underline">浏览全部书单</Link>
            <Link to="/read" className="ml-4 text-brand hover:underline">浏览全部笔记</Link>
            <Link to="/themes" className="ml-4 text-brand hover:underline">按主题探索</Link>
          </p>
        </div>
      ) : null}
    </section>
  );
};

export default FindView;
