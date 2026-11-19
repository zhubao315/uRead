import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_BASE } from '../config';
import { loadPublicNotes, type PublicNote } from '../data/publicNotes';
import { loadPublicLists, type PublicList } from '../data/publicLists';
import { ArrowRightIcon, BookOpenIcon, HeadphonesIcon, ListIcon, NotebookPenIcon, SearchIcon, TagsIcon } from '../components/icons';

interface HomeBook { id: string; title: string; author: string; format: string; cover: string; }
interface HomeState {
  ready: boolean;
  notes: PublicNote[];
  audio: number;
  themes: PublicList[];
  booklists: PublicList[];
  books: HomeBook[];
  generated_at: string;
}

/** 公开站首页：编辑式数字阅读杂志，只展示真实产物。 */
const ContentHomeView: React.FC = () => {
  const [state, setState] = useState<HomeState>({
    ready: false, notes: [], audio: 0, themes: [], booklists: [], books: [], generated_at: '',
  });
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadPublicNotes(),
      loadPublicLists(),
      fetch(`${SITE_BASE}books/aggregate.json`, { cache: 'no-store' }).catch(() => null),
    ]).then(async ([notes, lists, booksResponse]) => {
      const aggregate = booksResponse?.ok ? await booksResponse.json() : null;
      const books: HomeBook[] = aggregate?.books ?? [];
      if (!alive) return;
      setState({
        ready: true,
        notes: notes.notes,
        audio: notes.notes.filter((note) => note.audio).length,
        themes: lists.themes,
        booklists: lists.booklists,
        books,
        generated_at: lists.manifest?.generated_at ?? notes.manifest?.generated_at ?? '',
      });
    });
    return () => { alive = false; };
  }, []);

  const featured = useMemo(() => state.booklists.slice(0, 6), [state.booklists]);
  const latest = useMemo(() =>
    [...state.notes]
      .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
      .slice(0, 6), [state.notes]);

  if (!state.ready) {
    return <p className="mx-auto max-w-4xl px-4 py-16 text-muted">正在整理读书内容…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      {/* Hero */}
      <section className="grid gap-10 border-b border-border pb-12 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-gold">READ · REFLECT · REVISIT</p>
          <h1 className="font-editorial mt-4 text-4xl leading-[1.25] text-navy sm:text-5xl">
            让读过的书，<br />留下值得反复阅读的内容。
          </h1>
          <p className="mt-4 text-lg text-muted">在阅读中思考，在思考中沉淀。</p>
          <p className="mt-2 text-sm text-muted">Personal Reading Library · 个人阅读档案与知识沉淀</p>
          <form onSubmit={(event) => {
            event.preventDefault();
            window.location.href = `${SITE_BASE}find?q=${encodeURIComponent(query)}`;
          }} className="mt-7 flex max-w-xl gap-2">
            <label htmlFor="home-search" className="sr-only">搜索书名、作者、笔记或主题</label>
            <SearchIcon size="md" className="mt-3 shrink-0 text-muted" />
            <input id="home-search" type="search" aria-label="搜索书名、作者、笔记或主题" value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索书名、作者、笔记或主题……"
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base" />
            <button type="submit" className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brandActive">搜索</button>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/booklists" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand">
              开始探索 <ArrowRightIcon size="sm" />
            </Link>
            <Link to="/read" className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium text-navy hover:border-brand">
              浏览读书笔记
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted">
            {state.notes.length} 篇读书笔记 · {state.themes.length} 个主题 · {state.booklists.length} 份书单 · {state.audio} 篇可听
            {state.generated_at ? ` · 内容更新 ${state.generated_at.slice(0, 10)}` : ''}
          </p>
        </div>
        <div className="hidden lg:grid grid-cols-2 gap-3" aria-hidden="true">
          {state.books.slice(0, 4).map((book) => (
            <div key={book.id} className="aspect-[2/3] rounded-lg border border-border bg-white p-3 shadow-card">
              {book.cover ? <img src={`${SITE_BASE}books/${book.cover}`} alt="" className="h-full w-full rounded object-cover" /> : (
                <div className="flex h-full flex-col justify-between">
                  <span className="text-[10px] font-semibold tracking-widest text-gold">uREAD ARCHIVE</span>
                  <span className="font-editorial text-sm leading-snug text-navy">{book.title}</span>
                  <span className="text-[10px] text-muted">{book.author}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 精选书单 */}
      <section className="mt-12" aria-labelledby="featured-lists">
        <div className="flex items-center justify-between">
          <h2 id="featured-lists" className="font-editorial text-2xl text-navy">精选书单</h2>
          <Link to="/booklists" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">全部书单 <ArrowRightIcon size="sm" /></Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((item) => (
            <Link key={item.id} to={item.kind === 'theme' ? `/themes/${item.id}` : `/lists/${item.id}`}
              className="rounded-lg border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand">
              <p className="inline-flex items-center gap-1.5 text-xs text-gold">
                {item.kind === 'theme' ? <TagsIcon size="sm" /> : <ListIcon size="sm" />}
                {item.kind === 'theme' ? '主题阅读' : '书单'}
              </p>
              <h3 className="font-editorial mt-2 text-lg text-navy">{item.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{item.description || '（无摘要）'}</p>
              <p className="mt-3 text-xs text-muted">{item.book_count} 本书</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 最新笔记 */}
      <section className="mt-14" aria-labelledby="latest-notes">
        <div className="flex items-center justify-between">
          <h2 id="latest-notes" className="font-editorial text-2xl text-navy">最新读书笔记</h2>
          <Link to="/read" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">全部笔记 <ArrowRightIcon size="sm" /></Link>
        </div>
        <ul className="mt-5 divide-y divide-border border-y border-border">
          {latest.map((note) => (
            <li key={note.slug} className="py-4">
              <Link to={`/read/${encodeURIComponent(note.slug)}`} className="group flex items-start gap-4">
                <NotebookPenIcon size="md" className="mt-1 shrink-0 text-brand" />
                <div className="min-w-0">
                  <h3 className="font-editorial text-base text-navy group-hover:text-brand">{note.title}</h3>
                  <p className="mt-1 truncate text-sm text-muted">{note.body.replace(/[#*`>|]/g, '').trim().slice(0, 120)}</p>
                  <p className="mt-1 text-xs text-muted">{note.author || '作者未标注'} · {note.category || '未分类'}{note.updated ? ` · ${note.updated}` : ''}</p>
                </div>
                {note.audio ? <HeadphonesIcon size="sm" className="ml-auto mt-1 shrink-0 text-gold" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 主题阅读 */}
      <section className="mt-14" aria-labelledby="themes-title">
        <h2 id="themes-title" className="font-editorial text-2xl text-navy">主题阅读</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {state.themes.map((theme) => (
            <Link key={theme.id} to={`/themes/${theme.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-mist/40 px-3 py-2 text-sm text-navy hover:border-brand">
              <TagsIcon size="sm" />{theme.title}<span className="text-muted">{theme.book_count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 推荐书籍 */}
      <section className="mt-14" aria-labelledby="books-title">
        <h2 id="books-title" className="font-editorial text-2xl text-navy">推荐书籍</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.books.map((book) => (
            <a key={book.id} href={`${SITE_BASE}books/${book.id}/`}
              className="flex gap-4 rounded-lg border border-border bg-surface p-4 shadow-card hover:border-brand">
              {book.cover ? <img src={`${SITE_BASE}books/${book.cover}`} alt="" className="h-24 w-16 rounded object-cover" /> : <BookOpenIcon size="lg" className="shrink-0 text-brand" />}
              <div>
                <h3 className="font-editorial text-base text-navy">{book.title}</h3>
                <p className="mt-1 text-sm text-muted">{book.author || '作者未标注'}</p>
                <p className="mt-2 text-xs text-brand">查看书籍档案 →</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-border pt-8 text-sm text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <img src={`${SITE_BASE}brand/logo-symbol.svg`} alt="" className="h-8 w-8" />
          <span className="font-semibold text-navy">uRead</span>
          <span className="text-xs tracking-[0.16em]">READ · REFLECT · REVISIT</span>
        </div>
        <p className="mt-3">uRead 以书籍为索引、以读书笔记为核心、以主题书单为导航。公开内容只读，来源为私人 Obsidian 仓库的已发布产物。</p>
        <p className="mt-2">
          <Link to="/read" className="text-brand hover:underline">浏览全部笔记</Link>
          <Link to="/booklists" className="ml-4 text-brand hover:underline">全部书单</Link>
          <Link to="/workspace" className="ml-4 text-brand hover:underline">管理工作台</Link>
          <a href={`${SITE_BASE}books/`} className="ml-4 text-brand hover:underline">书库</a>
        </p>
      </footer>
    </div>
  );
};

export default ContentHomeView;
