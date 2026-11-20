---
type: docs
title: 2026-11-20 路由与导航审计
description: "公开站与工作台的真实路由映射、旧路径兼容与移动端重复导航问题。"
---

审计时间：2026-11-20

## 真实路由映射（src/App.tsx）

| 路径 | 组件 | 场景 |
| --- | --- | --- |
| `/` | ContentHomeView | 公开内容门户 |
| `/read` / `/read/:slug` | PublicNotesView / PublicNoteDetailView | 公开笔记 |
| `/booklists` / `/booklists/:id` | BooklistsHubView / BooklistDetailRedirect | 公开主题书单 |
| `/themes` / `/lists` | PublicListView | 旧兼容入口（仍保留） |
| `/find` | FindView | 公开内容搜索 |
| `/reader` | ReaderHubView | 统一继续阅读 |
| `/books/` | 静态 | EPUB/PDF 书库与书籍索引 |
| `/workspace` | Dashboard | 本地工作台首页 |
| `/workspace/booklists` | BookListsView | 本地书单管理 |
| `/library` | LibraryView | **根级旧路径，未纳入 workspace-shell** |
| `/notes` | NotesView | **根级旧路径，实际是本地笔记管理** |
| `/cards` | CardsView | **根级旧路径** |
| `/search` | SearchView | **根级旧路径** |

## 已确认问题

1. `isWorkspace = location.pathname.startsWith('/workspace')` 只覆盖 `/workspace` 与 `/workspace/booklists`；
   `/library` `/notes` `/cards` `/search` 这些实际管理页仍使用公开站背景与布局。
2. `/notes` 在代码里是**本地笔记管理**，不是公开笔记（公开是 `/read`）；文档必须明确，避免智能体混淆。
3. Navbar 在手机上渲染整套 navItems 网格，MobileBottomNav 又渲染首页/笔记/书单/书籍，重复且占屏。
4. MobileBottomNav 在 App 中无条件渲染，工作台页也显示公开站底栏。
5. `/reader` 是有价值的继续阅读入口，但主导航没有直接入口。

## 目标结构

公开：`/` `/read` `/read/:slug` `/booklists` `/themes` `/lists` `/books/` `/find`
工作台：`/workspace` `/workspace/library` `/workspace/notes` `/workspace/cards` `/workspace/booklists` `/workspace/search`
独立：`/reader`；文档：`/docs/`

旧路径重定向到 workspace 对应路径，并保留 `q` / `new` 等查询参数；不删除旧 URL。
移动端公开站：顶部只留 Logo + 搜索 + 菜单；底部一套四入口。工作台用独立底栏。
