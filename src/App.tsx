import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import BookListsView from './views/BookListsView';
import CardsView from './views/CardsView';
import Dashboard from './views/Dashboard';
import ContentHomeView from './views/ContentHomeView';
import BooklistsHubView, { BooklistDetailRedirect } from './views/BooklistsHubView';
import FindView from './views/FindView';
import LibraryView from './views/LibraryView';
import NotesView from './views/NotesView';
import PublicNoteDetailView from './views/PublicNoteDetailView';
import PublicNotesView from './views/PublicNotesView';
import ReaderHubView from './views/ReaderHubView';
import PublicListView from './views/PublicListView';
import PublicListDetailView from './views/PublicListDetailView';
import SearchView from './views/SearchView';
import { useLibraryStore } from './store/libraryStore';

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
  const load = useLibraryStore((state) => state.load);
  const initialized = useLibraryStore((state) => state.initialized);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);

  useEffect(() => {
    if (!initialized) {
      void load();
    }
  }, [load, initialized]);

  return (
    <div className={`min-h-screen ${isWorkspace ? 'workspace-shell bg-page' : 'bg-page'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:rounded focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white">
        跳到主要内容
      </a>
      <Navbar />
      {/* 读取失败时在页面顶部常驻提示：单个视图里的错误 banner 一旦切换页面就看不到了 */}
      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 border-b border-red-200 text-red-800 font-inter text-sm"
        >
          <div className="container mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
            <span>
              本地数据读取失败：{error}
              {errorHint ? <span className="ml-2 opacity-80">{errorHint}</span> : null}
            </span>
            <button
              type="button"
              onClick={() => void load()}
              className="underline hover:text-red-900"
            >
              重试
            </button>
          </div>
        </div>
      ) : null}
      <main id="main" className="container mx-auto px-4 pb-20 pt-8 md:pb-8" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<ContentHomeView />} />
          <Route path="/workspace" element={<Dashboard />} />
          <Route path="/library" element={<LibraryView />} />
          <Route path="/notes" element={<NotesView />} />
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
          <Route path="/workspace/booklists" element={<BookListsView />} />
          <Route path="/cards" element={<CardsView />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <MobileBottomNav />
    </div>
  );
}

export default App;
