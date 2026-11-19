import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SITE_BASE } from '../config';
import { useColorScheme } from '../hooks/useColorScheme';
import { HomeIcon, BookOpenIcon, NotebookPenIcon, ListIcon, BriefcaseIcon, SearchIcon } from './icons';

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
<SearchIcon size="md" />
      </button>
    </form>
  );
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const { dark, toggle: toggleTheme } = useColorScheme();

  const navItems: Array<{
    path: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    /** Pages 上的静态目录不是 React 路由：必须用普通 <a>，否则会被 SPA 接管成 404。 */
    staticHref?: string;
  }> = [
    { path: '/', label: '首页', icon: <HomeIcon size="md" />, description: '读书内容门户' },
    { path: '/read', label: '笔记', icon: <NotebookPenIcon size="md" />, description: '读书笔记' },
    { path: '/booklists', label: '书单', icon: <ListIcon size="md" />, description: '主题与书单' },
    { path: '/books', label: '书籍', icon: <BookOpenIcon size="md" />, description: '书库', staticHref: `${SITE_BASE}books/` },
    { path: '/workspace', label: '工作台', icon: <BriefcaseIcon size="md" />, description: '本地管理' }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo：统一品牌资产，不再用渐变方块 */}
          <Link to="/" className="flex items-center space-x-3 group cursor-pointer-custom" aria-label="uRead 首页">
            <img src={`${SITE_BASE}brand/logo-symbol.svg`} alt="" className="w-9 h-9 shrink-0" />
            <div>
              <span className="text-xl font-semibold tracking-tight text-navy">uRead</span>
              <p className="text-[11px] font-medium tracking-[0.12em] text-muted -mt-0.5">READ · REFLECT · REVISIT</p>
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
          <button type="button" onClick={toggleTheme} aria-label={dark ? '切换到日间模式' : '切换到夜间模式'}
            className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-lg text-xs text-muted">
            <span className="text-base">{dark ? '☀' : '☾'}</span>
            <span>{dark ? '日间' : '夜间'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;