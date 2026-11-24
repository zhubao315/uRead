---
type: docs
title: 2026-11-20 当前状态审计
description: "按真实源码与构建产物复核的当前状态，基于 v0.29.0。"
---

> **历史快照（historical snapshot）**：本文只记录审计当时的状态，不代表当前实现；现状以 `README.md` 与 `docs/PROJECT-STATUS.md` 为准。


审计时间：2026-11-20
基准版本：`package.json` = 0.29.0（执行时重新读取，不写死）

## 真实基线（本次重扫）

| 对象 | 数量 | 来源 |
| --- | ---: | --- |
| 公开读书笔记 | 1595 | `public/notes/manifest.json` |
| 主题 | 10 | `public/lists/manifest.json` |
| 书单 | 39 | `public/lists/manifest.json` |
| 书单书目条目 | 814 | content-inventory |
| 聚合书籍条目 | 1868 | `dist/books/aggregate.json` |
| 本地 EPUB/PDF | 2 | `dist/books/catalog.json` |
| 匹配音频 | 2 | notes manifest（TTS 停机） |
| 孤儿音频 | 8 | 文件存在但无对应笔记 |
| vitest | 212 passed / 1 skipped / 213 | 本地复跑 |
| Playwright | 21 passed / 1 skipped | desktop + mobile |
| 全量门禁 | PASS=37 FAIL=0 | ROUND=76 |

## 已确认的工程事实

1. `npm run build` 顺序为 `books:build` → `books:index`，两者都写 `dist/books/index.html`。
2. `book-library/build.py` 以**文件名** sha256 前 12 位作为 EPUB/PDF 的 `id`；
   `scripts/books-index.mjs` 以**书名+作者** sha256 前 12 位作为聚合 `book.id`。两套 ID 不同。
3. 书籍详情页的在线阅读链接使用 `book.id`，但 `reader.html?id=` 需匹配 `catalog.json` 的真实 ID → 链接可能失效。
4. `publishing/policy.json` 中的 `require_approval` 未在 `publish-policy.mjs` 中作为阻断条件使用。
5. deploy 工作流未执行 `npm run publish:check -- --strict`，也未提供独立的审批基线更新流程。
6. App 中 `isWorkspace` 仅判断 `/workspace` 前缀，但 `/library`、`/notes`、`/cards`、`/search` 仍为根级路由，未获得工作台样式。
7. 移动端 Navbar 顶部网格与 MobileBottomNav 底部导航重复，且工作台页也显示公开站底栏。
8. `PublicNotesView` 以 `watchPublicNotes('', ...)` 启动，初始版本为空字符串，首次轮询可能误报更新。
9. 首页与搜索都调用 `loadPublicNotes()` 拉取完整 `notes.json`（约 16 MB），未按索引/分片加载。
10. `--theme-text` 的 light-dark 两个值相同（均是浅色），浅色模式下部分文字对比度不足。

## 边界

本审计只读取源码、构建产物与本地命令输出；未做用户行为统计，不冒充真人浏览器逐页验收。
