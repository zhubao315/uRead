import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SITE_BASE } from '../config';
import { BookOpenIcon, DocumentIcon, LightBulbIcon, StarIcon } from './Icon';

const NavbarSearch: React.FC<{ initialQuery: string }> = ({ initialQuery }) => {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        navigate(trimmed ? `/find?q=${encodeURIComponent(trimmed)}` : '/find');
      }}
      className="flex items-center gap-2"
    >
      <label htmlFor="global-search" className="sr-only">
        搜索全部本地数据
      </label>
      <input
        id="global-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="搜索全部数据"
        aria-label="搜索全部本地数据"
        className="w-36 lg:w-56 px-3 py-2 border border-gray-200 rounded-lg text-sm font-inter bg-white"
      />
      <button
        type="submit"
        aria-label="提交搜索"
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-150"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </form>
  );
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const [dark, setDark] = React.useState(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark');
  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    localStorage.setItem('uread:theme', next ? 'dark' : 'light');
    setDark(next);
  };

  const navItems: Array<{
    path: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    /** Pages 上的静态目录不是 React 路由：必须用普通 <a>，否则会被 SPA 接管成 404。 */
    staticHref?: string;
  }> = [
    { path: '/', label: '首页', icon: <BookOpenIcon size="md" />, description: '读书内容门户' },
    { path: '/read', label: '笔记', icon: <DocumentIcon size="md" />, description: '读书笔记' },
    { path: '/booklists', label: '书单', icon: <StarIcon size="md" />, description: '主题与书单' },
    { path: '/books', label: '书籍', icon: <BookOpenIcon size="md" />, description: '书库', staticHref: `${SITE_BASE}books/` },
    { path: '/workspace', label: '工作台', icon: <LightBulbIcon size="md" />, description: '本地管理' }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group cursor-pointer-custom">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center transform transition-transform group-hover:scale-110">
              <BookOpenIcon size="lg" className="text-white" />
            </div>
            <div>
              <span className="text-xl font-inter font-bold text-gray-900">uRead</span>
              <p className="text-xs font-inter text-gray-500 -mt-1">认知沉淀工具</p>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const className = `relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-inter font-medium transition-all duration-200 cursor-pointer-custom ${
                location.pathname === item.path
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`;
              const content = (
                <>
                  <span className={`transition-transform ${location.pathname === item.path ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  <div className="flex flex-col items-start">
                    <span>{item.label}</span>
                    <span className="text-xs opacity-75">{item.description}</span>
                  </div>
                  {location.pathname === item.path && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                  )}
                </>
              );
              return item.staticHref ? (
                <a key={item.path} href={item.staticHref} className={className}>{content}</a>
              ) : (
                <Link key={item.path} to={item.path} className={className}>{content}</Link>
              );
            })}
          </div>

          {/* 搜索：以前只是一个没有 onClick 的图标按钮，点了不会有任何反应 */}
          {/*
            key 绑定 pathname：换页时重挂载输入框，让它带上目标页面的 ?q=，
            既不会出现「留着上次的关键词」，也不用在 effect 里 setState 造成级联渲染。
          */}
          <button type="button" onClick={toggleTheme} aria-label={dark ? '切换到日间模式' : '切换到夜间模式'}
            title={dark ? '切换到日间模式' : '切换到夜间模式'}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600">
            {dark ? '☀' : '☾'}
          </button>
          <NavbarSearch
            key={location.pathname}
            initialQuery={new URLSearchParams(location.search).get('q') ?? ''}
          />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 bg-white">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 p-2">
          {navItems.map((item) => {
            const className = `flex flex-col items-center space-y-1 p-3 rounded-lg text-xs font-inter transition-all duration-200 cursor-pointer-custom ${
              location.pathname === item.path
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`;
            const content = (
              <>
                <span className={`${location.pathname === item.path ? 'scale-110' : ''}`}>
                  {React.cloneElement(
                    item.icon as React.ReactElement<{ size?: 'sm' | 'md' | 'lg' }>,
                    { size: 'sm' },
                  )}
                </span>
                <span className="font-medium">{item.label}</span>
              </>
            );
            return item.staticHref ? (
              <a key={item.path} href={item.staticHref} className={className}>{content}</a>
            ) : (
              <Link key={item.path} to={item.path} className={className}>{content}</Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;