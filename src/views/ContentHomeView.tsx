import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_BASE } from '../config';
import { loadPublicNotes } from '../data/publicNotes';
import { loadPublicLists, type PublicList } from '../data/publicLists';

interface HomeBook { id: string; title: string; author: string; format: string; cover: string; }
interface HomeState {
  ready: boolean;
  notes: number;
  audio: number;
  themes: PublicList[];
  booklists: PublicList[];
  books: HomeBook[];
  generated_at: string;
}

/** Content Edition 首页：编辑式内容门户，不堆统计数字，不放样例数据。 */
const ContentHomeView: React.FC = () => {
  const [state, setState] = useState<HomeState>({
    ready: false, notes: 0, audio: 0, themes: [], booklists: [], books: [], generated_at: '',
  });
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadPublicNotes(),
      loadPublicLists(),
      fetch(`${SITE_BASE}books/catalog.json`, { cache: 'no-store' }).catch(() => null),
    ]).then(async ([notes, lists, booksResponse]) => {
      const books: HomeBook[] = booksResponse?.ok ? await booksResponse.json() : [];
      if (!alive) return;
      setState({
        ready: true,
        notes: notes.notes.length,
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

  if (!state.ready) {
    return <p className="mx-auto max-w-4xl px-4 py-16 font-inter text-body">正在整理读书内容…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 font-inter text-body">
      <section className="border-b border-slate-200 pb-10">
        <p className="text-sm tracking-[0.2em] text-accent">PERSONAL READING LIBRARY</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink">uRead · 个人读书笔记与主题书单库</h1>
        <p className="mt-3 text-lg text-slate-600">让读过的书，留下值得反复阅读的内容。</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          window.location.href = `${SITE_BASE}find?q=${encodeURIComponent(query)}`;
        }} className="mt-6 flex max-w-2xl gap-2">
          <label htmlFor="home-search" className="sr-only">搜索书名、作者、笔记或主题</label>
          <input id="home-search" type="search" aria-label="搜索书名、作者、笔记或主题" value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索书名、作者、笔记或主题……"
            className="w-full rounded border border-slate-300 bg-white px-4 py-3 text-base" />
          <button type="submit" className="rounded bg-brand px-5 py-3 text-white hover:bg-brandDark">搜索</button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          {state.notes} 篇读书笔记 · {state.themes.length} 个主题 · {state.booklists.length} 份书单 · {state.audio} 篇可听
          {state.generated_at ? ` · 内容更新 ${state.generated_at.slice(0, 10)}` : ''}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="featured-lists">
        <h2 id="featured-lists" className="text-2xl font-semibold text-ink">精选书单</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((item) => (
            <Link key={item.id} to={item.kind === 'theme' ? `/themes/${item.id}` : `/lists/${item.id}`}
              className="rounded border border-slate-200 bg-white p-5 hover:border-brand">
              <p className="text-xs text-accent">{item.kind === 'theme' ? '主题阅读' : '书单'}</p>
              <h3 className="mt-1 text-lg font-medium text-ink">{item.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description || '（无摘要）'}</p>
              <p className="mt-3 text-xs text-slate-500">{item.book_count} 本书</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="themes-title">
        <h2 id="themes-title" className="text-2xl font-semibold text-ink">主题阅读</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {state.themes.map((theme) => (
            <Link key={theme.id} to={`/themes/${theme.id}`}
              className="rounded border border-slate-200 bg-white px-3 py-2 text-sm hover:border-brand">
              {theme.title}<span className="ml-2 text-slate-500">{theme.book_count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="books-title">
        <h2 id="books-title" className="text-2xl font-semibold text-ink">推荐书籍</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.books.map((book) => (
            <a key={book.id} href={`${SITE_BASE}books/reader.html?id=${encodeURIComponent(book.id)}`}
              className="flex gap-4 rounded border border-slate-200 bg-white p-4 hover:border-brand">
              {book.cover ? <img src={`${SITE_BASE}books/${book.cover}`} alt="" className="h-24 w-16 rounded object-cover" /> : null}
              <div>
                <h3 className="font-medium text-ink">{book.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{book.author || '作者未标注'}</p>
                <p className="mt-2 text-xs text-slate-500">点击在线阅读</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-600">
        <p>uRead 以书籍为索引、以读书笔记为核心、以主题书单为导航。公开内容只读，来源为私人 Obsidian 仓库的已发布产物。</p>
        <p className="mt-2">
          <Link to="/read" className="text-brand hover:underline">浏览全部笔记</Link>
          <Link to="/booklists" className="ml-4 text-brand hover:underline">全部书单</Link>
          <Link to="/workspace" className="ml-4 text-brand hover:underline">管理工作台</Link>
          <a href={`${SITE_BASE}books/`} className="ml-4 text-brand hover:underline">书库</a>
        </p>
      </section>
    </div>
  );
};

export default ContentHomeView;
