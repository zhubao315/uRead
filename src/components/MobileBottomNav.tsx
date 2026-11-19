import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SITE_BASE } from '../config';
import { HomeIcon, NotebookPenIcon, ListIcon, BookOpenIcon } from './icons';

/** 移动端公开站底部导航：只保留四个内容入口，工作台在页首/页尾单独进入。 */
const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const items = [
    { path: '/', label: '首页', icon: <HomeIcon size="md" /> },
    { path: '/read', label: '笔记', icon: <NotebookPenIcon size="md" /> },
    { path: '/booklists', label: '书单', icon: <ListIcon size="md" /> },
    { path: '/books', label: '书籍', icon: <BookOpenIcon size="md" />, href: `${SITE_BASE}books/` },
  ];

  return (
    <nav aria-label="移动端底部导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = item.path === '/books'
            ? location.pathname.startsWith('/books')
            : location.pathname === item.path;
          const content = (
            <>
              <span className={active ? 'text-brand' : 'text-muted'}>{item.icon}</span>
              <span className={`text-[11px] ${active ? 'font-semibold text-brand' : 'text-muted'}`}>{item.label}</span>
            </>
          );
          return (
            <li key={item.path}>
              {'href' in item && item.href ? (
                <a href={item.href} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5">{content}</a>
              ) : (
                <Link to={item.path} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5">{content}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
