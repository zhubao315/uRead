---
type: docs
title: uRead Media System
description: "独立媒体清单、解析优先级、统一图片组件与构建脚本的唯一规范来源。"
---

视觉升级的媒体系统遵循一个原则：**图片资产与 Obsidian 原文、书单源文件和发布审批完全分离**。当前 1807 条书籍记录中有 1489 条已配上来自 Obsidian 读书笔记的豆瓣出版封面；其余 318 条没有可用笔记封面，继续使用确定性 SVG 主题视觉，不冒充出版封面。

## 唯一来源与产物

| 角色 | 路径 | 说明 |
| --- | --- | --- |
| 策展清单（源文件） | `media/curated-manifest.json` | 只登记经审核的图片：1489 条书籍封面，按笔记 wikilink 精确对应 |
| 结构约束 | `media/manifest.schema.json` | Draft-07，约束类型、来源、审核态与官方封面标记 |
| 静态书页映射 | `media/book-covers.json` | `books:covers` 产物：书籍 ID → 图片路径 / 笔记 stem / 豆瓣条目 |
| 正文图片映射 | `media/wiki-images.json` → `dist/media/wiki-images.json` | 笔记 `![[文件.jpg]]` 的文件名 → 本地静态路径；缺失会让 `media:validate` 失败 |
| 列表封面映射 | `media/note-covers.json` → `dist/media/note-covers.json` | 笔记 slug → 正文图片封面路径，供公开笔记列表 `/read` 显示缩略图 |
| 笔记封面源文件 | `obsidian-vault/07-SOURCES/71-书籍/assets/covers/` | 豆瓣 subject 页 `og:image` 下载到本地的 1372 张 JPG |
| 浏览器侧产物 | `dist/media/manifest.json` | 由 `media:build` 从源文件复制 |
| 本地书籍封面 | `public/media/books/<id>.jpg` → `dist/media/books/<id>.jpg` | 经审核的出版封面，2:3 |
| 生成封面 | `dist/media/books/<id>.svg` | 无笔记封面时的确定性 SVG 主题视觉，2:3 |
| 生成栏目视觉 | `dist/media/collections/<kind>-<id>.svg` | 主题/书单的 16:9 抽象视觉，画面内不写文字 |
| 真实封面 | `dist/books/covers/*` | 仅来自有权分发的 EPUB 内嵌封面；PDF 不提取 |

媒体键统一为 `type:id`（`book:` / `booklist:` / `theme:` / `category:` / `note:` / `fallback:`），避免不同实体 ID 冲突。

## 解析优先级

`src/domain/media/resolveMedia.ts` 是唯一解析入口：

1. 清单中 `review_status === 'approved'` 的策展资产（当前为 1489 条豆瓣出版封面）；
2. 调用方传入的 fallback（真实 EPUB 封面，或 `media/books/<id>.svg`）；
3. 组件层的统一占位/一次性回退（`MediaImage` 的 `onError`）。

静态书页（`dist/books/`）不加载清单，改用 `media/book-covers.json`：真实 EPUB 封面 → 已审核笔记封面 → SVG 主题视觉，与前端保持同一回退顺序。

未审核（`pending` / `rejected`）资产永不生效。AI 图必须 `is_ai_generated: true` 且 `is_official_cover: false`；只有确认的出版封面才能标记 `is_official_cover: true`，且必须记录 `source_url`。

## 组件

- `src/components/media/MediaImage.tsx`：显式 `width`/`height` + `aspect-ratio` 预留空间（防 CLS），`loading="lazy"` / `decoding="async"`；首屏 LCP 用 `eager` + `highPriority`（`fetchpriority="high"`），不 lazy。
- `src/components/media/BookCover.tsx`：策展 → 真实封面 → 生成 SVG，任何情况都有图。
- `src/components/SafeMarkdown.tsx`：正文里的 `![[图片.jpg]]` 按图片映射渲染成真正的 `<img>`；没有映射时显示 `[图片：文件名]` 占位，绝不把 Obsidian 标记语法漏给读者。普通 `[[wikilink]]` 仍按笔记 slug 解析。

图片比例约定：书籍封面 2:3，书单/主题 16:9，笔记缩略图 1:1 或 3:4。书名、作者和说明必须是 HTML 文本，不得烧进图片。

## 脚本与构建顺序

```
npm run books:covers     # 从 Obsidian 笔记已下载的豆瓣封面同步到 public/media/books/（+ 映射表与清单 + 正文图片映射）
npm run notes:excerpts   # 按正文重建 index.json 摘要，清掉 ![[...]] 等标记语法
npm run media:validate   # 校验清单结构、审核态、实体 ID、来源标记、重复引用、正文图片映射完整性
npm run media:audit      # 输出各实体配图覆盖率与生成资源统计
npm run media:build      # 复制清单 + 生成 1807 张书籍 SVG + 49 张栏目视觉 → dist/media/
```

`books:covers` 必须在 `vite build` 之前运行（图片放在 `public/`，由 Vite 复制到 `dist/`）；`media:build` 在 `books:index` 之后、`build:fallbacks` 与 `build:discovery` 之前，因为书籍 SVG 依赖 `dist/books/aggregate.json`。它不覆盖 `dist/books/` 下的阅读器文件。

### 批量同步笔记封面（2026-11-26）

Obsidian 书库里已按豆瓣 subject 页下载好的封面，可用一条命令同步到 uRead：

```bash
npm run books:covers -- --from /path/to/obsidian-vault/07-SOURCES/71-书籍/assets/covers
# 先看影响面：加 --dry-run
```

- 只认笔记正文的 `![[<stem>.jpg]]`，按 `book.id` 精确落盘；没有笔记封面 / 豆瓣标 `cover: "none"` 的书保留 SVG，不用书名相似度猜图。
- 同一条笔记被多个书单聚合时复用同一张图，清单里以书籍 ID 为键，因此 `src` 唯一（校验器的重复路径约束）。
- 默认源目录是本仓同级的 `../obsidian-vault/...`；不存在时构建跳过同步，保留已有映射，不阻断发布。
- 图片属于出版封面，`source_type: official_cover` + `source_url` 指向对应豆瓣条目；发布前应确认本个人档案的使用边界，不能当成自有版权素材。

### 正文更新后的渲染保障

1. 正文仍以 `public/notes/notes.json` 的 `body` 为唯一来源。`books:covers` 扫描所有 `![[文件]]`；任何找不到本地资源的图片都会让命令失败并列出文件名，不会静默显示裸语法。
2. `media:validate` 再做一次交叉校验：每篇正文的嵌入图片都必须有映射，且 `dist/` 下文件真实存在。
3. `notes:excerpts` 从正文重建 `index.json` 摘要，首页 / 搜索 / RSS / 书籍详情 meta 不会残留 `![[...]]` 或 `[[...]]`。
4. `SafeMarkdown` 的回归测试覆盖「有映射」「无映射」「与普通 wikilink 混排」三种情况，防止后续改动把图片重新变成纯文字。

## 新增一张图片的步骤

1. 把图片放到 `public/media/` 对应子目录（最终随构建进入 `dist/media/`）；
2. 在 `media/curated-manifest.json` 增加 `type:id` 条目，填齐 `src` / `alt` / `source_type` / 审核态 / 来源信息；
3. 运行 `npm run media:validate` 与 `npm run media:audit`；
4. 确认实体 ID 来自真实产物，不得用模糊相似度把封面分配给其他书。

**不做**：从 Open Library / Google Books 批量抓取封面、给全部书批量生成 AI 图片、按书名相似度把某本书的封面分配给另一本、修改书籍 ID 算法、把图片路径写进 Obsidian 原文。豆瓣封面只从本地已核验的 Obsidian 书库同步，不重新爬豆瓣。
