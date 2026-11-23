# uRead Design System（以实际代码为准）

> 状态基准：2026-11-23 · 版本 0.34.2 · Content Edition
> 本文件只记录当前真实组件与令牌。旧版「功能堆叠 / 渐变卡片 / 瀑布流」示例已失效。

## 设计定位

Editorial Reading Library：数字阅读杂志 + 个人图书馆。
安静、内容优先、高可读性；不用渐变卡片、不堆统计数字、不用复杂动画。

## 设计令牌

定义在 `tailwind.config.js`（Tailwind 类）与 `src/index.css`（`:root` CSS 变量），两处值必须一致。

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `brand` / `--brand` | `#2457A6` | 主交互、链接、焦点 |
| `brandDark` | `#1C4683` | 悬停 |
| `brandSoft` | `#5B8DEF` | 辅助蓝 |
| `ink` / `--ink` | `#172033` | 标题 |
| `body` / `--body` | `#263244` | 正文 |
| `accent` / `--accent` | `#C58B42` | 主题标签、摘录边线 |
| `page` / `--page` | `#F5F7FA` | 页面背景 |
| `surface` | `#FFFFFF` | 内容表面 |
| `line` / `--line` | `#DDE3EA` | 分隔线 |
| `muted` | `#64748B` | 次要信息 |

管理工作台旧令牌 `primary/secondary/success/warning/error` 保留，历史组件不强制迁移。

## 真实组件清单（按源码）

公开内容站：
- `ContentHomeView`：内容门户首页（Hero + 搜索、精选书单、主题入口、书库书籍、页脚）
- `PublicNotesView` / `PublicNoteDetailView`：笔记列表与详情（音频、倍速、续播、目录、原文分区、相关阅读）
- `BooklistsHubView`：主题书单中枢（THEME / BOOKLIST 两类保留）
- `PublicListView` / `PublicListDetailView`：兼容入口 `/themes`、`/lists` 与详情
- `FindView`：分组搜索（书籍 / 笔记 / 书单 / 主题）
- `ReaderHubView`：统一阅读入口（本机进度排序）
- 静态书籍索引与详情：`scripts/books-index.mjs` 生成到 `dist/books/`

管理工作台：`Dashboard`、`LibraryView`、`NotesView`、`CardsView`、`BookListsView`、`SearchView` 及既有组件，
入口统一在 `/workspace`，数据仍在 IndexedDB 八类 store。

## 阅读排版

- 正文最大宽度约 46rem（`note-article`），行高 1.9。
- 笔记详情按原文已有标题分组：原文摘录（赭色左边线 + 浅底）、个人理解（蓝）、延伸思考（绿）、来源元数据、其他。
- **只做展示分组，不改写原文**；未知标题归「其他」并显示原标题。
- 引文、列表、表格用 SafeMarkdown 的 React 节点渲染，无 `dangerouslySetInnerHTML`。

## 状态与可访问性

- 加载 / 空 / 出错 / 有内容四种状态必须可区分，错误提示带下一步动作。
- 控件有可访问名称；原生 `<button>` 显式 `type`；焦点轮廓可见。
- 搜索框用 `aria-label` 或 `label[for]`；动态提示用 `aria-live`。
- 支持键盘：阅读器 `←/→` 翻页、`?` 帮助；链接与按钮可 Tab 到达。
- 目标 WCAG 2.2 AA；不使用纯颜色传达状态。

## 响应式

- 桌面：内容宽度受限、书单/笔记卡片 2–3 列。
- 平板：减列、侧栏可折叠。
- 手机：单栏、触控目标 ≥44px、封面比例统一、底部操作不被遮挡。
- 具体验收清单见 `MULTI_DEVICE.md`；沙箱无浏览器，真机项由用户执行。
