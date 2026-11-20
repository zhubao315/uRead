---
type: docs
title: uRead Media System
description: "独立媒体清单、解析优先级、统一图片组件与构建脚本的唯一规范来源。"
---

视觉升级的媒体系统遵循一个原则：**图片资产与 Obsidian 原文、书单源文件和发布审批完全分离**。当前 1868 本书全部使用确定性 SVG 主题视觉，没有真实出版封面，也不冒充出版封面。

## 唯一来源与产物

| 角色 | 路径 | 说明 |
| --- | --- | --- |
| 策展清单（源文件） | `media/curated-manifest.json` | 只登记经人工审核的图片；当前 `assets` 为空 |
| 结构约束 | `media/manifest.schema.json` | Draft-07，约束类型、来源、审核态与官方封面标记 |
| 浏览器侧产物 | `dist/media/manifest.json` | 由 `media:build` 从源文件复制 |
| 生成封面 | `dist/media/books/<id>.svg` | 书籍 ID 作种子的确定性 SVG，2:3 |
| 生成栏目视觉 | `dist/media/collections/<kind>-<id>.svg` | 主题/书单的 16:9 抽象视觉，画面内不写文字 |
| 真实封面 | `dist/books/covers/*` | 仅来自有权分发的 EPUB 内嵌封面；PDF 不提取 |

媒体键统一为 `type:id`（`book:` / `booklist:` / `theme:` / `category:` / `note:` / `fallback:`），避免不同实体 ID 冲突。

## 解析优先级

`src/domain/media/resolveMedia.ts` 是唯一解析入口：

1. 清单中 `review_status === 'approved'` 的策展资产；
2. 调用方传入的 fallback（真实 EPUB 封面，或 `media/books/<id>.svg`）；
3. 组件层的统一占位/一次性回退（`MediaImage` 的 `onError`）。

未审核（`pending` / `rejected`）资产永不生效。AI 图必须 `is_ai_generated: true` 且 `is_official_cover: false`；只有确认的出版封面才能标记 `is_official_cover: true`，且必须记录 `source_url`。

## 组件

- `src/components/media/MediaImage.tsx`：显式 `width`/`height` + `aspect-ratio` 预留空间（防 CLS），`loading="lazy"` / `decoding="async"`；首屏 LCP 用 `eager` + `highPriority`（`fetchpriority="high"`），不 lazy。
- `src/components/media/BookCover.tsx`：策展 → 真实封面 → 生成 SVG，任何情况都有图。

图片比例约定：书籍封面 2:3，书单/主题 16:9，笔记缩略图 1:1 或 3:4。书名、作者和说明必须是 HTML 文本，不得烧进图片。

## 脚本与构建顺序

```
npm run media:validate   # 校验清单结构、审核态、实体 ID、来源标记、重复引用
npm run media:audit      # 输出各实体配图覆盖率与生成资源统计
npm run media:build      # 复制清单 + 生成 1868 张书籍封面 + 49 张栏目视觉 → dist/media/
```

`media:build` 已接入正式 `build` 链，位置在 `books:index` 之后、`build:fallbacks` 与 `build:discovery` 之前，因为书籍 SVG 依赖 `dist/books/aggregate.json`。它不覆盖 `dist/books/` 下的阅读器文件。

## 新增一张图片的步骤

1. 把图片放到 `public/media/` 对应子目录（最终随构建进入 `dist/media/`）；
2. 在 `media/curated-manifest.json` 增加 `type:id` 条目，填齐 `src` / `alt` / `source_type` / 审核态 / 来源信息；
3. 运行 `npm run media:validate` 与 `npm run media:audit`；
4. 确认实体 ID 来自真实产物，不得用模糊相似度把封面分配给其他书。

**不做**：批量抓取 Open Library / Google Books 封面、给 1868 本批量生成 AI 图片、修改书籍 ID 算法、把图片路径写进 Obsidian 原文。
