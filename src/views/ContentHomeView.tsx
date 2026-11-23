import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SITE_BASE } from '../config';
import { loadNoteIndex, type NoteIndexItem } from '../data/publicNotes';
import { loadPublicLists, type PublicList } from '../data/publicLists';
import { ArrowRightIcon, HeadphonesIcon, ListIcon, NotebookPenIcon, SearchIcon, TagsIcon } from '../components/icons';
import BookCover from '../components/media/BookCover';
import CollectionArtwork from '../components/media/CollectionArtwork';

interface HomeBook { id: string; title: string; author: string; format: string; cover: string; }
interface HomeState {
  ready: boolean;
  notes: NoteIndexItem[];
  audio: number;
  themes: PublicList[];
  booklists: PublicList[];
  books: HomeBook[];
  generated_at: string;
  config: { featured_booklist_ids: string[]; featured_theme_ids: string[]; featured_book_ids: string[] } | null;
  /** 快照提供的真实计数；缺省时退回索引长度，不编造数字。 */
  counts: { notes: number; audio: number; themes: number; booklists: number } | null;
  source: 'snapshot' | 'index' | null;
}

interface HomeSnapshot {
  generated_at: string;
  counts: { notes: number; audio: number; themes: number; booklists: number };
  featured_book_ids: string[];
  featured_books: HomeBook[];
  featured_lists: PublicList[];
  themes: PublicList[];
  latest_notes: NoteIndexItem[];
}

function isHomeSnapshot(value: unknown): value is HomeSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<HomeSnapshot>;
  return Array.isArray(candidate.featured_books)
    && Array.isArray(candidate.featured_lists)
    && Array.isArray(candidate.latest_notes)
    && Array.isArray(candidate.themes)
    && Boolean(candidate.counts && typeof candidate.counts.notes === 'number');
}

/** 公开站首页：编辑式数字阅读杂志，只展示真实产物。 */
const ContentHomeView: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<HomeState>({
    ready: false, notes: [], audio: 0, themes: [], booklists: [], books: [], generated_at: '', config: null, counts: null, source: null,
  });
  const [query, setQuery] = useState('');

  // 首选构建期生成的首页快照（只有几十 KB）；快照缺失时回退到完整索引。
  useEffect(() => {
    let alive = true;

    const fromFullIndex = () => {
      void Promise.all([loadNoteIndex(), loadPublicLists()]).then(([notes, lists]) => {
        if (!alive) return;
        setState({
          ready: true,
          notes,
          audio: notes.filter((note) => note.audio).length,
          themes: lists.themes,
          booklists: lists.booklists,
          books: [],
          generated_at: lists.manifest?.generated_at ?? '',
          config: null,
          counts: null,
          source: 'index',
        });
      });
    };

    void fetch(`${SITE_BASE}publishing/homepage-snapshot.json`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          throw new Error('missing snapshot');
        }
        return await response.json() as unknown;
      })
      .then((data) => {
        if (!alive || !isHomeSnapshot(data)) {
          if (alive) fromFullIndex();
          return;
        }
        setState({
          ready: true,
          notes: data.latest_notes,
          audio: data.counts.audio,
          themes: data.themes,
          booklists: data.featured_lists,
          books: data.featured_books,
          generated_at: data.generated_at,
          config: {
            featured_book_ids: data.featured_book_ids,
            featured_booklist_ids: data.featured_lists.map((list) => list.id),
            featured_theme_ids: data.themes.map((theme) => theme.id),
          },
          counts: data.counts,
          source: 'snapshot',
        });
      })
      .catch(() => { if (alive) fromFullIndex(); });

    return () => { alive = false; };
  }, []);

  // 书籍聚合（361 KB）与首页策展配置是增强内容：后台取，到了再填，不阻塞首屏。
  useEffect(() => {
    let alive = true;
    void Promise.all([
      fetch(`${SITE_BASE}publishing/homepage.json`, { cache: 'no-store' }).catch(() => null),
      fetch(`${SITE_BASE}books/aggregate.json`, { cache: 'no-store' }).catch(() => null),
    ]).then(async ([configResponse, booksResponse]) => {
      const aggregate = booksResponse?.ok ? await booksResponse.json() : null;
      const config = configResponse?.ok && configResponse.headers.get('content-type')?.includes('application/json')
        ? await configResponse.json() : null;
      if (!alive) return;
      // 快照路径已经带好了精选书籍与策展配置，不再下载整份聚合数据。
      setState((previous) => previous.source === 'snapshot'
        ? previous
        : { ...previous, books: aggregate?.books ?? [], config });
    });
    return () => { alive = false; };
  }, []);

  const pick = <T extends { id: string }>(items: T[], ids: string[] | undefined, limit: number) => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const chosen = (ids ?? []).map((id) => byId.get(id)).filter((item): item is T => !!item);
    return (chosen.length ? chosen : items).slice(0, limit);
  };
  const featured = useMemo(() => pick(state.booklists, state.config?.featured_booklist_ids, 6), [state.booklists, state.config]);
  const featuredBooks = useMemo(() => pick(state.books, state.config?.featured_book_ids, 6), [state.books, state.config]);
  const latest = useMemo(() =>
    [...state.notes]
      .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
      .slice(0, 6), [state.notes]);

  if (!state.ready) {
    // 断网时不给空白页：先渲染静态主视觉，并明确说明内容会在联网后恢复。
    return (
      <div className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-xs font-semibold tracking-[0.24em] text-gold">READ · REFLECT · REVISIT</p>
        <h1 className="font-editorial mt-4 text-4xl leading-[1.25] text-navy sm:text-5xl">
          让读过的书，<br />留下值得反复阅读的内容。
        </h1>
        <p role="status" aria-live="polite" className="mt-6 text-sm text-muted">
          正在整理读书内容…（若当前离线，联网后将自动恢复）
        </p>
      </div>
    );
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
            navigate(query.trim() ? `/find?q=${encodeURIComponent(query.trim())}` : '/find');
          }} className="mt-7 flex max-w-xl gap-2">
            <label htmlFor="home-search" className="sr-only">搜索书名、作者、笔记或主题</label>
            <SearchIcon size="md" className="mt-3 shrink-0 text-muted" />
            <input id="home-search" type="search" aria-label="搜索书名、作者、笔记或主题" value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索书名、作者、笔记或主题……"
              className="w-full min-w-0 rounded-md border border-border bg-surface px-4 py-3 text-base" />
            <button type="submit" className="shrink-0 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brandActive">搜索</button>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/booklists" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand">
              开始探索 <ArrowRightIcon size="sm" />
            </Link>
            {state.booklists.length ? (
              <button type="button"
                onClick={() => {
                  const picked = state.booklists[Math.floor(Math.random() * state.booklists.length)];
                  navigate(`/booklists/${picked.id}`);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-mist bg-mist/40 px-5 py-2.5 text-sm font-medium text-navy hover:border-brand">
                随手翻一份书单
              </button>
            ) : null}
            <Link to="/read" className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium text-navy hover:border-brand">
              浏览读书笔记
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted">
            {state.counts?.notes ?? state.notes.length} 篇读书笔记 · {state.counts?.themes ?? state.themes.length} 个主题 · {state.counts?.booklists ?? state.booklists.length} 份书单 · {state.audio} 篇可听
            {state.generated_at ? ` · 内容更新 ${state.generated_at.slice(0, 10)}` : ''}
          </p>
        </div>
        <div className="hidden lg:grid grid-cols-2 gap-3" aria-hidden="true">
          {featuredBooks.length
            ? featuredBooks.slice(0, 4).map((book) => (
                <div key={book.id} className="aspect-[2/3] rounded-lg border border-border bg-white p-2 shadow-card">
                  <BookCover id={book.id} title={book.title} author={book.author} realCover={book.cover} className="h-full w-full rounded" />
                </div>
              ))
            : Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="aspect-[2/3] rounded-lg border border-border bg-mist/40" />
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
              className="overflow-hidden rounded-lg border border-border bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-brand">
              <CollectionArtwork kind={item.kind} id={item.id} title={item.title} className="w-full" />
              <div className="p-5">
                <p className="inline-flex items-center gap-1.5 text-xs text-gold">
                  {item.kind === 'theme' ? <TagsIcon size="sm" /> : <ListIcon size="sm" />}
                  {item.kind === 'theme' ? '主题阅读' : '书单'}
                </p>
                <h3 className="font-editorial mt-2 text-lg text-navy">{item.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{item.description || '（无摘要）'}</p>
                <p className="mt-3 text-xs text-muted">{item.book_count} 本书</p>
              </div>
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
        {latest.length === 0 ? <p className="mt-4 text-sm text-muted">还没有可展示的公开笔记。</p> : null}
        <ul className="mt-5 divide-y divide-border border-y border-border">
          {latest.map((note) => (
            <li key={note.slug} className="py-4">
              <Link to={`/read/${encodeURIComponent(note.slug)}`} className="group flex items-start gap-4">
                <NotebookPenIcon size="md" className="mt-1 shrink-0 text-brand" />
                <div className="min-w-0">
                  <h3 className="font-editorial text-base text-navy group-hover:text-brand">{note.title}</h3>
                  <p className="mt-1 truncate text-sm text-muted">{note.excerpt}</p>
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
        <a href={`${SITE_BASE}books/`} className="float-right text-sm text-brand hover:underline">全部书籍 →</a>
        {featuredBooks.length === 0 ? (
          <p className="mt-5 rounded-lg border border-border bg-surface p-5 text-sm text-muted">正在整理推荐书籍…</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredBooks.map((book) => (
              <a key={book.id} href={`${SITE_BASE}books/${book.id}/`}
                className="flex gap-4 rounded-lg border border-border bg-surface p-4 shadow-card hover:border-brand">
                <BookCover id={book.id} title={book.title} author={book.author} realCover={book.cover} className="h-24 w-16 shrink-0 rounded" />
                <div>
                  <h3 className="font-editorial text-base text-navy">{book.title}</h3>
                  <p className="mt-1 text-sm text-muted">{book.author || '作者未标注'}</p>
                  <p className="mt-2 text-xs text-brand">查看书籍档案 →</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-border pt-8 text-sm text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <img loading="lazy" decoding="async" src={`${SITE_BASE}brand/logo-symbol.svg`} alt="" className="h-8 w-8" />
          <span className="font-semibold text-navy">uRead</span>
          <span className="text-xs tracking-[0.16em]">READ · REFLECT · REVISIT</span>
        </div>
        <p className="mt-3">uRead 以书籍为索引、以读书笔记为核心、以主题书单为导航。公开内容只读，来源为私人 Obsidian 仓库的已发布产物。</p>
        <p className="mt-2">
          <Link to="/read" className="text-brand hover:underline">浏览全部笔记</Link>
          <Link to="/booklists" className="ml-4 text-brand hover:underline">全部书单</Link>
          <Link to="/workspace" className="ml-4 text-brand hover:underline">管理工作台</Link>
          <a href={`${SITE_BASE}books/`} className="ml-4 text-brand hover:underline">书库</a>
          <Link to="/find" className="ml-4 text-brand hover:underline">搜索</Link>
          <a href={`${SITE_BASE}docs/`} className="ml-4 text-brand hover:underline">文档</a>
        </p>
      </footer>
    </div>
  );
};

export default ContentHomeView;
