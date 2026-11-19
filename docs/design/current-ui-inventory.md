# 当前 UI 资产盘点（2026-11-19）

## Logo / 品牌图形

改版前：无独立 Logo 资产；Navbar 为手写 SVG + 文字；favicon 为 Vite 默认 `vite.svg`。
改版后：`public/brand/logo-symbol.svg`、`logo-horizontal.svg`、`logo-stacked.svg`、`logo-monochrome.svg`、`logo-dark.svg`、`favicon.svg`、`icon-192.png`、`icon-512.png`。

## 图标

`src/components/Icon.tsx`：手写内联 SVG，24 viewBox，stroke-width 1.5，包含 BookOpen / Document / LightBulb / Star 等少量图标。
页面文案仍有 Emoji（📖 / 📚 / 🧭 / 🎧）作为视觉标记，违反统一线性图标规则，页面级重构时替换为图标组件。

## 字体

`src/index.css` 单行 `@import` 只引入 Inter；`.font-inter` 类全站使用。中文标题没有宋体层级。

## 颜色变量（改版前）

旧：`--primary-color/#3B82F6`、`--surface-white`、`--text-primary` 等；
新令牌（Phase 4）：`--brand/#2457A6`、`--ink/#17243A`、`--body/#263244`、`--accent/#C58B42`、`--page/#F5F7FA`、`--line/#DDE3EA`；
另有主题令牌 `--theme-page/--theme-surface/...` 使用 `light-dark()`。
三套变量并存 → 本次统一到 `src/styles/tokens.css`。

## 页面与组件

公开站：`ContentHomeView`、`PublicNotesView`、`PublicNoteDetailView`、`BooklistsHubView`、`PublicListView`、`PublicListDetailView`、`FindView`、`ReaderHubView`。
工作台：`Dashboard`、`LibraryView`、`NotesView`、`CardsView`、`BookListsView`、`SearchView`。
共享组件：`Navbar`、`Button`、`Card`、`SafeMarkdown`、`ConfirmAction`、`StateBlock` 等。

## 布局与断点

Tailwind 3.4 响应式断点；Navbar 移动端 3 列网格 → sm 5 列；书单/笔记卡片 md 2 列、xl 3 列；笔记正文 `note-article` 最大 46rem。
`MULTI_DEVICE.md` 列出 360/375/390/430/768/1024/1280/1440/1920 验收项，本沙箱无浏览器，真机项待用户执行。

## 重复样式

`.bg-white` / `[class*='bg-white']` 在暗色规则中被全局覆盖；组件内仍有十六进制 Tailwind 任意值类；卡片边框/圆角/阴影没有统一 token。
