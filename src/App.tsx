import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import WorkspaceMobileNav from './components/WorkspaceMobileNav';
import UpdateNotice from './components/UpdateNotice';
// 首页是默认落地页：保持静态导入，让它进入预缓存的应用外壳，离线也能立刻渲染。
import ContentHomeView from './views/ContentHomeView';

/**
 * 路由级代码拆分：只有当前路由的页面代码会进入首屏请求。
 * 工作台的布局壳也懒加载——它静态导入了 Zustand 仓储，
 * 因此公开门户不会把 IndexedDB 相关代码下载到浏览器。
 */
const Dashboard = lazy(() => import('./views/Dashboard'));
const LibraryView = lazy(() => import('./views/LibraryView'));
const NotesView = lazy(() => import('./views/NotesView'));
const CardsView = lazy(() => import('./views/CardsView'));
const BookListsView = lazy(() => import('./views/BookListsView'));
const SearchView = lazy(() => import('./views/SearchView'));
const ReadingLoopView = lazy(() => import('./views/ReadingLoopView'));
const TrashView = lazy(() => import('./views/TrashView'));
const WorkspaceGate = lazy(() => import('./components/WorkspaceGate'));

const PublicNotesView = lazy(() => import('./views/PublicNotesView'));
const PublicNoteDetailView = lazy(() => import('./views/PublicNoteDetailView'));
const PublicListView = lazy(() => import('./views/PublicListView'));
const PublicListDetailView = lazy(() => import('./views/PublicListDetailView'));
const BooklistsHubView = lazy(() => import('./views/BooklistsHubView'));
const BooklistDetailRedirect = lazy(
  () => import('./views/BooklistsHubView').then((module) => ({ default: module.BooklistDetailRedirect })),
);
const ReaderHubView = lazy(() => import('./views/ReaderHubView'));
const FindView = lazy(() => import('./views/FindView'));

/**
 * 各路由的浏览器标题。笔记详情自己管理标题（带笔记名），这里返回 null 不覆盖。
 * 标题同时用于屏幕阅读器的路由播报，让换页不只是「画面变了」。
 */
function titleForPath(pathname: string): string | null {
  if (/^\/read\/[^/]+/.test(pathname)) return null;
  if (pathname === '/') return 'uRead · 个人阅读档案与知识沉淀';
  if (pathname.startsWith('/workspace')) return '工作台 · uRead';
  if (pathname === '/read') return '公开读书笔记 · uRead';
  if (pathname.startsWith('/themes')) return '主题阅读 · uRead';
  if (pathname.startsWith('/lists') || pathname.startsWith('/booklists')) return '书单 · uRead';
  if (pathname === '/find') return '全站搜索 · uRead';
  if (pathname === '/reader') return '继续阅读 · uRead';
  return 'uRead · 个人阅读档案与知识沉淀';
}

/** 异步路由的轻量占位：不引入额外组件依赖，避免为了骨架屏反而增大首屏包。 */
const PageSkeleton: React.FC = () => (
  <p role="status" aria-live="polite" className="px-4 py-16 text-center text-sm text-muted">
    正在加载页面…
  </p>
);

/** 旧路由兼容：保留查询参数，迁移到 /workspace/* 命名空间。 */
const LegacyRedirect: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace />;
};

/** 兜底路由：原来未知地址只会渲染一个空白 `<main>`，用户不知道该去哪儿。 */
const NotFound = () => (
  <section className="bg-white border border-gray-200 rounded-xl p-10 text-center font-inter">
    <h1 className="text-2xl font-bold text-gray-900">这个地址下没有内容</h1>
    <p className="mt-2 text-gray-600">
      可能是收藏夹里的旧地址。你可以回到
      <Link to="/" className="mx-1 text-blue-600 hover:text-blue-800 underline">
        仪表板
      </Link>
      ，或者
      <Link to="/find" className="mx-1 text-brand hover:underline">
        搜索公开内容
      </Link>
      <Link to="/workspace" className="ml-2 text-brand hover:underline">管理工作台</Link>
      。
    </p>
  </section>
);

function App() {
  const location = useLocation();
  const isWorkspace = location.pathname.startsWith('/workspace');
  const [showTop, setShowTop] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const routeTitle = titleForPath(location.pathname);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (routeTitle) document.title = routeTitle;
  }, [routeTitle]);

  useEffect(() => {
    // 首次加载保持浏览器默认焦点；之后每次换页把焦点交回主内容，
    // 避免键盘用户停留在已卸载的链接上。只依赖 pathname，搜索输入时不抢焦点。
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className={`min-h-screen ${isWorkspace ? 'workspace-shell bg-page' : 'bg-page'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:rounded focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white">
        跳到主要内容
      </a>
      <p className="sr-only" role="status" aria-live="polite">{routeTitle ? `${routeTitle} 已打开` : ''}</p>
      <Navbar />
      <main ref={mainRef} id="main" className="container mx-auto px-4 pb-20 pt-8 md:pb-8" tabIndex={-1}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<ContentHomeView />} />

            {/* 工作台：由 WorkspaceGate 统一初始化 IndexedDB，公开门户不参与 */}
            <Route element={<WorkspaceGate />}>
              <Route path="/workspace" element={<Dashboard />} />
              <Route path="/workspace/library" element={<LibraryView />} />
              <Route path="/workspace/notes" element={<NotesView />} />
              <Route path="/workspace/booklists" element={<BookListsView />} />
              <Route path="/workspace/cards" element={<CardsView />} />
              <Route path="/workspace/search" element={<SearchView />} />
              <Route path="/workspace/loop" element={<ReadingLoopView />} />
              <Route path="/workspace/trash" element={<TrashView />} />
            </Route>

            {/* 旧地址跳转到工作台，重定向本身不需要初始化本地数据 */}
            <Route path="/library" element={<LegacyRedirect to="/workspace/library" />} />
            <Route path="/notes" element={<LegacyRedirect to="/workspace/notes" />} />
            <Route path="/cards" element={<LegacyRedirect to="/workspace/cards" />} />
            <Route path="/search" element={<LegacyRedirect to="/workspace/search" />} />

            <Route path="/reader" element={<ReaderHubView />} />
            <Route path="/find" element={<FindView />} />
            <Route path="/read" element={<PublicNotesView />} />
            <Route path="/read/:slug" element={<PublicNoteDetailView />} />
            <Route path="/themes" element={<PublicListView kind="theme" />} />
            <Route path="/themes/:id" element={<PublicListDetailView kind="theme" />} />
            <Route path="/lists" element={<PublicListView kind="booklist" />} />
            <Route path="/lists/:id" element={<PublicListDetailView kind="booklist" />} />
            <Route path="/booklists" element={<BooklistsHubView />} />
            <Route path="/booklists/:id" element={<BooklistDetailRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {showTop ? (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="回到顶部"
          className="fixed bottom-20 right-4 z-40 rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy shadow-raised md:bottom-6">
          ↑
        </button>
      ) : null}
      {isWorkspace ? <WorkspaceMobileNav /> : <MobileBottomNav />}
      <UpdateNotice />
    </div>
  );
}

export default App;
