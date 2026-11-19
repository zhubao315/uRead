# uRead 图标系统

统一使用 Lucide 风格线性图标：24×24 网格、2px 线宽、圆角端点、currentColor 描边。禁止 Emoji、彩色插画图标、不同粗细的混用。

## 映射

| 功能 | 图标语义 | 组件名 |
| --- | --- | --- |
| 首页 | house | `HomeIcon` |
| 书籍 | book-open | `BookOpenIcon` |
| 笔记 | notebook-pen | `NotebookPenIcon` |
| 书单 | list | `ListIcon` |
| 主题 | tags | `TagsIcon` |
| 搜索 | search | `SearchIcon` |
| 听笔记 | headphones | `HeadphonesIcon` |
| 工作台 | briefcase-business | `BriefcaseIcon` |
| 书签 | bookmark | `BookmarkIcon` |
| 来源 | quote | `QuoteIcon` |
| 相关内容 | network | `NetworkIcon` |
| 时间 | calendar-days | `CalendarIcon` |

## 使用

组件文件：`src/components/icons/index.tsx`。统一属性：`size: 'sm' | 'md' | 'lg'`（16/20/24px）、`className`、`strokeWidth = 2`。

页面级重构时替换所有 Emoji 标记（📖 / 📚 / 🧭 / 🎧 等）为对应图标组件；工作台保留现有图标组件，逐步迁移到同一套 2px 线宽。
