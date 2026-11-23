import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, BookOpenIcon, NotebookPenIcon, ListIcon, SearchIcon } from './icons';
import { LightBulbIcon } from './Icon';

/** 工作台移动端导航：与公开站底栏分离，避免两套内容入口重叠。 */
const WorkspaceMobileNav: React.FC = () => (
  <nav aria-label="工作台移动导航" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden"
    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <ul className="grid grid-cols-6">
      {[
        { to: '/workspace', label: '总览', icon: <HomeIcon size="md" /> },
        { to: '/workspace/library', label: '资料库', icon: <BookOpenIcon size="md" /> },
        { to: '/workspace/notes', label: '笔记', icon: <NotebookPenIcon size="md" /> },
        { to: '/workspace/loop', label: '闭环', icon: <LightBulbIcon size="md" /> },
        { to: '/workspace/booklists', label: '书单', icon: <ListIcon size="md" /> },
        { to: '/workspace/search', label: '搜索', icon: <SearchIcon size="md" /> },
      ].map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.to === '/workspace'}
            className={({ isActive }) => `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? 'text-brand' : 'text-muted'}`}>
            {item.icon}<span>{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);

export default WorkspaceMobileNav;
