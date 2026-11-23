import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SITE_BASE } from '../config';
import { loadNoteIndex, type NoteIndexItem } from '../data/publicNotes';
import { loadPublicLists, type PublicList } from '../data/publicLists';

interface FindBook { id: string; title: string; author: string; note_count?: number; }
interface Pool {
  notes: NoteIndexItem[];
  lists: PublicList[];
  books: FindBook[];
}

/** 内容搜索：四类分组显示，不把书籍/笔记/书单/主题混成一条流。 */
const FindView: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [pool, setPool] = useState<Pool | null>(null);
  const [type, setType] = useState<'all' | 'book' | 'note' | 'list' | 'theme'>('all');
  // 输入框先本地响应，200ms 后再写回 URL；避免每敲一个键都触发整页筛选与历史替换。
  const [draft, setDraft] = useState(query);
  const debounceTimer = useRef<number | null>(null);

  const commitQuery = (value: string, immediate = false) => {
    if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    const write = () => setParams(value.trim() ? { q: value.trim() } : {}, { replace: true });
    if (immediate) write();
    else debounceTimer.current = window.setTimeout(write, 200);
  };

  useEffect(() => () => {
    if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
  }, []);

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
      loadNoteIndex(),
      loadPublicLists(),
      fetch(`${SITE_BASE}books/aggregate.json`, { cache: 'no-store' }).catch(() => null),
    ]).then(async ([notes, lists, response]) => {
      const books: FindBook[] = response?.ok ? (await response.json()).books ?? [] : [];
      if (alive) setPool({ notes, lists: [...lists.themes, ...lists.booklists], books });
    });
    return () => { alive = false; };
  }, []);

  // 小写检索串只在索引加载后计算一次；每次按键只做 includes，
  // 避免 1595 篇笔记逐次 join + toLowerCase 形成长任务、拖慢 INP。
  const haystacks = useMemo(() => {
    if (!pool) return null;
    return {
      notes: pool.notes.map((n) => [n.title, n.excerpt, ...n.tags, n.author].join('\n').toLowerCase()),
      books: pool.books.map((b) => `${b.title}\n${b.author}`.toLowerCase()),
      lists: pool.lists.map((l) => `${l.title}\n${l.description ?? ''}`.toLowerCase()),
    };
  }, [pool]);

  const groups = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length || !pool || !haystacks) {
      return { notes: [], books: [], booklists: [], themes: [] };
    }
    const hit = (text: string) => words.every((word) => text.includes(word));
    const matching = <T,>(items: T[], texts: string[]): T[] => items.filter((_, i) => hit(texts[i]));
    return {
      notes: matching(pool.notes, haystacks.notes).slice(0, 30),
      books: matching(pool.books, haystacks.books),
      booklists: pool.lists.flatMap((list, i) =>
        list.kind === 'booklist' && hit(haystacks.lists[i]) ? [list] : []),
      themes: pool.lists.flatMap((list, i) =>
        list.kind === 'theme' && hit(haystacks.lists[i]) ? [list] : []),
    };
  }, [pool, haystacks, query]);

  const total = groups.notes.length + groups.books.length + groups.booklists.length + groups.themes.length;

  return (
    <section className="mx-auto max-w-5xl px-5 py-8 font-inter text-body">
      <h1 className="text-2xl font-semibold text-ink">搜索读书内容</h1>
      <form onSubmit={(event) => { event.preventDefault(); commitQuery(draft, true); }} className="mt-4 flex gap-2">
        <label htmlFor="find-q" className="sr-only">搜索</label>
        <input id="find-q" type="search" aria-label="搜索" value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            commitQuery(event.target.value);
          }}
          placeholder="搜索书名、作者、笔记或主题" className="w-full rounded border border-slate-300 bg-white px-3 py-2" />
        {draft ? (
          <button type="button" aria-label="清空搜索" title="清空搜索"
            onClick={() => { setDraft(''); commitQuery('', true); }}
            className="shrink-0 rounded border border-border px-3 text-muted hover:bg-mist">×</button>
        ) : null}
        <button type="submit" className="shrink-0 rounded bg-brand px-4 py-2 text-white">搜索</button>
      </form>
      <p className="mt-2 text-xs text-muted">
        按 <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">/</kbd> 可快速聚焦搜索框
      </p>
      {pool === null ? <p className="mt-6 text-slate-600">正在载入内容索引…</p> : null}
      {query && pool ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {(['all', 'book', 'note', 'list', 'theme'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setType(value)} aria-pressed={type === value}
              className={`rounded border px-3 py-1.5 text-xs ${type === value ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted'}`}>
              {{ all: '全部', book: '书籍', note: '笔记', list: '书单', theme: '主题' }[value]}
            </button>
          ))}
        </div>
      ) : null}

      {[
        ['书籍', groups.books, (item: FindBook) => (
          <a key={item.id} href={`${SITE_BASE}books/${item.id}/`} className="text-brand hover:underline">
            {item.title}<span className="ml-2 text-slate-500">{item.author} · {item.note_count ?? 0} 篇笔记</span>
          </a>)],
        ['读书笔记', groups.notes, (item: NoteIndexItem) => (
          <Link key={item.slug} to={`/read/${encodeURIComponent(item.slug)}`} className="text-brand hover:underline">{item.title}</Link>)],
        ['书单', groups.booklists, (item: PublicList) => (
          <Link key={item.id} to={`/lists/${item.id}`} className="text-brand hover:underline">{item.title}</Link>)],
        ['主题阅读', groups.themes, (item: PublicList) => (
          <Link key={item.id} to={`/themes/${item.id}`} className="text-brand hover:underline">{item.title}</Link>)],
      ].map(([label, items, render]) => {
        const typed = items as Array<FindBook | NoteIndexItem | PublicList>;
        const typeKey = label === '书籍' ? 'book' : label === '读书笔记' ? 'note' : label === '书单' ? 'list' : 'theme';
        if (type !== 'all' && type !== typeKey) return null;
        if (!typed.length) return null;
        return (
          <section key={label as string} className="mt-8" aria-label={label as string}>
            <h2 className="text-lg font-semibold text-ink">{label as string}（{typed.length}）</h2>
            <ul className="mt-3 space-y-2">
              {typed.slice(0, 12).map((item) => <li key={(item as { id?: string; slug?: string }).id ?? (item as NoteIndexItem).slug}>{(render as (x: typeof item) => React.ReactNode)(item)}</li>)}
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
