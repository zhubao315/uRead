import React from 'react';

/** Lucide 风格统一线性图标：24 网格 / 2px 线宽 / 圆角端点 / currentColor。 */
type Size = 'sm' | 'md' | 'lg';
interface Props extends React.SVGProps<SVGSVGElement> {
  size?: Size;
}

const px: Record<Size, number> = { sm: 16, md: 20, lg: 24 };

const make = (name: string, path: React.ReactNode) => {
  const Component: React.FC<Props> = ({ size = 'md', className = '', ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px[size]}
      height={px[size]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label={name}
      role="img"
      {...props}
    >
      {path}
    </svg>
  );
  Component.displayName = name;
  return Component;
};

export const HomeIcon = make('首页', <><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" /></>);
export const BookOpenIcon = make('书籍', <><path d="M12 7v14M12 7C9.5 5.5 6.5 5 3 6v13c3.5-1 6.5-.5 9 1 2.5-1.5 5.5-2 9-1V6c-3.5-1-6.5-.5-9 1Z" /></>);
export const NotebookPenIcon = make('笔记', <><path d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" /><path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2M10 8h6M10 12h4" /><path d="m16 17 2-2 2 2-2 2z" /></>);
export const ListIcon = make('书单', <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>);
export const TagsIcon = make('主题', <><path d="M20 13 12 21l-9-9V4h8z" /><path d="M7.5 7.5h.01" /></>);
export const SearchIcon = make('搜索', <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>);
export const HeadphonesIcon = make('听笔记', <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z" /></>);
export const BriefcaseIcon = make('工作台', <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>);
export const BookmarkIcon = make('书签', <><path d="M6 4h12v17l-6-5-6 5z" /></>);
export const QuoteIcon = make('来源', <><path d="M7 7h4v6a4 4 0 0 1-4 4M15 7h4v6a4 4 0 0 1-4 4" /></>);
export const NetworkIcon = make('相关内容', <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="m7.5 7.5 3 9M16.5 7.5l-3 9M8 6h8" /></>);
export const CalendarIcon = make('日期', <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>);
export const ArrowRightIcon = make('进入详情', <><path d="M5 12h14M13 6l6 6-6 6" /></>);
export const DownloadIcon = make('下载', <><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" /></>);
export const CheckIcon = make('完成', <><path d="m5 12 4 4L19 6" /></>);
export const AlertIcon = make('警告', <><path d="M12 3 2 20h20zM12 9v5M12 17h.01" /></>);
export const TrashIcon = make('删除', <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /></>);
export const EditIcon = make('编辑', <><path d="m4 20 4-1 11-11-3-3L5 16zM14 6l3 3" /></>);
export const ShareIcon = make('分享', <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>);
export const MenuIcon = make('菜单', <><path d="M4 7h16M4 12h16M4 17h16" /></>);
