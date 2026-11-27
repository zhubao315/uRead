---
type: docs
title: 媒体资产与视觉覆盖审计（2026-11-20）
description: "基于当前源码与真实构建产物的图片资源盘点、覆盖率、链路问题与实施顺序建议。"
---

> **历史快照（historical snapshot）**：本文只记录审计当时的状态，不代表当前实现；现状以 `README.md` 与 `docs/PROJECT-STATUS.md` 为准。


审计时间：2026-11-20
基准版本：`package.json` = **0.33.0**（README / CHANGELOG 一致）
数据来源：`public/notes/index.json`、`public/lists/*.json`、`dist/books/aggregate.json`、`dist/books/catalog.json`、`book-library/books/` 与前端源码实读；未采用历史文档中的统计数字。

> 边界：本报告只统计真实存在的资产与覆盖率，不评估未在仓库中的外部图片可用性，也不建议给全部书籍批量生成 AI 图片。

## 1. 真实内容基线

| 对象 | 数量 | 来源 |
| --- | --- | --- |
| 公开读书笔记 | 1595 | `public/notes/index.json` |
| 主题阅读栏目 | 10 | `public/lists/themes.json` |
| 公开推荐书单 | 39 | `public/lists/booklists.json`（全部 `kind=booklist`） |
| 书籍聚合记录 | 1868 | `dist/books/aggregate.json`（书单来源 725 / 笔记来源 1143） |
| 关联笔记条目 | 1745 | `summary.linked_notes` |
| 未关联笔记 | 1145 | `summary.unlinked_notes` |

首页编辑配置 `publishing/homepage.json` 的 `featured_booklist_ids`、`featured_theme_ids`、`featured_book_ids` 各 6 项，**全部命中真实 ID（6/6、6/6、6/6）**，可直接作为视觉编排入口，无需重建推荐逻辑。

## 2. 当前图片资产盘点

`public/` 下**没有 `media/` 目录**；全部图片仅为 8 个品牌资产：

| 目录 | 文件 | 数量 |
| --- | --- | --- |
| `public/brand/` | `logo-symbol.svg`、`logo-horizontal.svg`、`logo-stacked.svg`、`logo-dark.svg`、`logo-monochrome.svg`、`favicon.svg`、`icon-192.png`、`icon-512.png` | 8 |

另有构建期产物 `dist/books/covers/5a6e6a83b4b2.jpg`（1 张 EPUB 内嵌封面），只在电子书库与阅读器中使用。

### 覆盖率（真实计算）

| 内容类型 | 总数 | 有可用图片 | 覆盖率 |
| --- | --- | --- | --- |
| 书籍聚合记录 | 1868 | **0** | **0%** |
| 推荐书单 | 39 | 0 | 0% |
| 主题栏目 | 10 | 0 | 0% |
| 公开笔记 | 1595 | 0 | 0% |
| 电子书（真实文件） | 2 | 1 | 50% |

## 3. 图片链路审计

### 3.1 封面为什么是 0：三处断点

1. **电子书数量太少**：`book-library/books/` 只有 2 个文件（1 EPUB + 1 PDF）。理论上限就是 2/1868 ≈ 0.11%。
2. **唯一真实封面没进聚合索引**：`scripts/build-books-index.mjs` → `scripts/books-index.mjs` 的 `buildBookCatalog()` 只在「规范化书名 + 作者都吻合且候选唯一」时才把 `catalog.cover` 写入书籍记录。实际数据中 `《吾辈如神》` 与 `朱光潜作品集（共六册）` 在 1868 条聚合记录里**都没有标题前缀匹配**，因此 `aggregate.json` 的 `summary.with_cover = 0`。那张 EPUB 封面只留在 `library.html` / `reader.html`。
3. **PDF 不提取封面**：`book-library/build.py` 的 `pdf_meta()` 只读 `/Title`、`/Author` 与页数，不解析封面；EPUB 则通过 `META-INF/container.xml` → OPF 的 `cover-image` 提取。

### 3.2 前端只有 3 处业务图片，且实际都不渲染

`src/views/ContentHomeView.tsx` 有三处 `<img>`（Hero 封面组合、推荐书籍卡片、页脚 Logo 旁的封面），全部以 `book.cover` 为真值条件。由于聚合数据 `cover` 恒为空，这三处**实际全部走图标占位分支**。`Navbar.tsx` 与 `SafeMarkdown.tsx` 的 `<img>` 分别是品牌 Logo 与笔记正文图片，不属于内容封面体系。

### 3.3 静态页与 React 页路径规则一致，但都没有占位策略

- React：`${SITE_BASE}books/${book.cover}`。
- 静态 `scripts/books-index.mjs`：`book.cover ? <img .../> : ''`（无封面时**什么都不渲染**，没有空白块也没有占位图）。

两者都遵循 `/uRead/` 子路径，但都没有统一的 fallback。

### 3.4 书籍 ID 稳定性是媒体映射的前提

`scripts/books-index.mjs` 的 `sha12()` 用 `sha256(original_title + "\0" + original_author)` 生成 12 位 ID。书名或作者变化会改变 ID 与历史 URL。媒体清单必须用真实 ID 或经审核的迁移映射，不能靠模糊相似度自动继承封面。

### 3.5 缺失的关联映射

当前**没有** `note_slug → book_id` 映射。`buildBookCatalog()` 在内存里持有 `book.notes[].slug`，但只用于生成静态 HTML，没有落成可复用产物。要做「笔记复用书籍封面」，应在构建阶段输出该映射，而不是在前端猜测书名。

## 4. 页面视觉差异

| 页面 | 当前视觉 | 问题 |
| --- | --- | --- |
| `/` 首页 | Hero + 精选书单 + 最新笔记 + 主题标签 + 推荐书籍 | Hero 图片区仅 `lg` 以上显示；`state.books.slice(0,4)` 与编辑精选 ID 不是同一份数据；书单/主题卡无图 |
| `/booklists` 等栏目 | 文字 + CSS 样式 | 39 份书单无视觉区分 |
| 书单详情 | 书名、作者、推荐理由长列表 | 缺封面网格与视觉层次 |
| `/books/` 索引 | 文字列表，有封面才显示图片 | 0% 覆盖，视觉不完整，无网格/筛选 |
| 书籍详情 | 有封面才显示 | 0% 覆盖，档案感弱 |
| 笔记列表/详情 | 标题、分类、摘要 | 无所属书籍缩略图 |
| 搜索 | 分组文字结果 | 无缩略图辅助识别 |

静态书页导航已在本轮统一为与主站相同的品牌栏（见 ledger 125），但**内容卡片视觉仍未统一**。

## 5. 加载性能现状

- 已有：`loading="lazy"` 与 `decoding="async"`（仅 ContentHomeView 的 3 处 `<img>`）。
- 缺失：`aspect-ratio` / 固定宽高、`srcset` / `sizes`、`<picture>`、AVIF/WebP/JPEG 回退、onError 一次性 fallback。
- 风险：图片无尺寸约束会带来 CLS；首屏主视觉目前也没有独立的加载优先级策略。
- 正面因素：首屏已不下载 22MB `notes.json`（改用 1.5MB 索引，实测 226ms / 2.79MB），为图片留出预算。

## 6. 版权与来源风险

- 唯一真实封面来自本地有权分发的 EPUB，来源清晰。
- 未使用 Open Library / Google Books 等外部封面服务；**不建议**对 1868 条记录无差别批量抓取（Open Library 明确不鼓励爬取 Covers API）。
- 若后续引入 AI 图，必须标记为「主题视觉封面」，`is_official_cover: false`，不得冒充出版封面，不得在图中写入书名/作者/出版社/ISBN。

## 7. 文档版本漂移（本次审计发现）

| 文件 | 声明版本 | 实际版本 |
| --- | --- | --- |
| `README.md` | 0.33.0 | 0.33.0 ✅ |
| `CHANGELOG.md` | 0.33.0 | 0.33.0 ✅ |
| `docs/PROJECT-STATUS.md` | **0.23.0** | 0.33.0 ❌ |
| `design-system.md` | **0.21.0** | 0.33.0 ❌ |
| `ui-ux-design-system.md` | **0.21.0** | 0.33.0 ❌ |

这些是历史时点文档，后续阶段需同步到实际版本，避免把已修复问题当待办重新实现。

## 8. 建议实施顺序

严格按任务书分阶段，先基础设施后页面：

| 优先级 | 阶段 | 交付 | 理由 |
| --- | --- | --- | --- |
| P0 | 本报告 | 真实覆盖率与断点清单（已完成） | 先审计，避免按错误假设改代码 |
| P1 | Media System | `media/curated-manifest.json`、类型 + Schema、`resolveMedia`、`MediaImage`/`BookCover`、`media:audit/validate/build` | 解决长期维护问题，所有页面共用一套 fallback |
| P1 | 书籍动态封面 | 基于书籍 ID 的确定性 SVG 文字封面 + 真实封面映射；书籍 ID 不变 | 一次性解决 1868 本 0% 覆盖 |
| P1 | 首页/书单视觉 | Hero 与精选统一用 `homepage.json`；书单/主题图卡 | 最直接的视觉提升 |
| P2 | 搜索与笔记关联 | 构建期 `note_slug → book_id → media` 映射 | 完善发现路径 |
| P2 | 主题/书单插画 | 按真实 ID 生成系列化主题视觉，明确非官方 | 提升品牌识别 |
| P3 | 治理 | 文档版本同步、媒体审核、覆盖率持续监控 | 长期运营 |

**不建议**：给全部 1868 本书批量生成 AI 图片；把远程图片链接写进所有页面；为图片改动书籍 ID 计算方式或发布审批边界。

---

## 9. 后续更新（2026-11-26）

上表是 2026-11-20 的历史快照。当前版本（0.34.5）的实际状态：

| 内容类型 | 总数 | 有可用图片 | 覆盖率 |
| --- | --- | --- | --- |
| 书籍聚合记录 | 1807 | **1489**（豆瓣笔记封面）+ 1（EPUB 封面） | **82.5%** |
| 推荐书单 / 主题栏目 / 公开笔记 | 39 / 10 / 1599 | 0 | 0% |

新增 `npm run books:covers`：从 Obsidian 笔记已下载的 1372 张豆瓣封面按 `![[<stem>.jpg]]` 精确映射到书籍 ID，产物为 `public/media/books/<id>.jpg`、`media/book-covers.json` 与 1489 条 `official_cover` 清单资产；没有笔记封面的 318 条仍用 SVG 主题视觉。规范见 [`../design/media-system.md`](../design/media-system.md)。
