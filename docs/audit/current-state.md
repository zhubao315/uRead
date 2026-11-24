---
type: docs
title: 现状审计（2026-11-19）
weight: 5
menus:
  main:
    parent: audit
    weight: 5
description: "按真实命令与源码路径审计的当前能力清单；与 2026-11-16 的历史快照区分。"
---

> **历史快照（historical snapshot）**：本文只记录审计当时的状态，不代表当前实现；现状以 `README.md` 与 `docs/PROJECT-STATUS.md` 为准。


> 审计方式：本地真实命令输出 + 源码路径抽查 + 线上 HTTP 复核。
> 不采信 README 自述的功能「已完成」，只采信测试、产物与可运行命令。

## 1. 工程基线（实测）

- `npm test`：176 passed / 1 skipped / 177 用例，19 个测试文件。
- `npm run typecheck`、`npm run lint`、`npm run build`、`npm run docs:build`、`npm run docs:check`：全绿。
- 工作区全量门禁 `ROUND=56`：PASS=37 FAIL=0；`release_check.py`：35/35。
- 变异：81 处 / 18 套件（含 `uread-public-lists` 2 处）。
- 线上：`/uRead/`、`/uRead/read/`、`/uRead/themes/`、`/uRead/lists/`、`/uRead/books/`、`/uRead/docs/` 跟随 301 后均 200。

## 2. 数据链路

| 链路 | 源 | 产物 | 复核 |
| --- | --- | --- | --- |
| 私人工作台 | 浏览器 IndexedDB（8 store） | 无服务端 | `src/data/db.ts`、`tests/data/*` |
| 公开笔记 | 私库 `07-SOURCES/71-书籍` | `public/notes/{notes,manifest}.json` + 10 wav | `npm run notes:sync -- --dry-run` |
| 主题 / 书单 | 私库 `02-BUILD/21-uRead/Lists` | `public/lists/{themes,booklists,manifest}.json` | `npm run lists:sync:dry` |
| 书库 | 本机 `book-library/books/` | `dist/books/` | `npm run books:build` |

## 3. 能力判定

- IMPLEMENTED：CRUD、搜索、备份、公开笔记、听笔记、主题/书单、书库、深链、夜间模式、离线壳。
- PARTIAL：原文锚点（只记阅读位置，没有选区→批注→回跳）、发布治理（当前全量公开）。
- PLANNED：AI 阅读助手、AI 知识抽取、知识复习、知识图谱、跨设备同步。
- BROKEN：未发现会导致构建或核心页面不可用的故障。
- DEPRECATED：`_archive/backend-stub/*`（被 tsconfig 与 eslint 排除，死代码）。

## 4. 最高风险

1. **公开边界**：私库仍然私有，但公开产物包含 1595 篇正文 + 2 篇仍匹配音频 + 2 本书；上线后无法保证撤回。
2. **文档漂移**：历史审计与现代化方案写于 0.x 早期，若被当成现状会导致重复实现；以 `docs/PROJECT-STATUS.md` 为准。
3. **阅读闭环**：选段 / 高亮 / 批注 / 知识卡片 / 回到原文尚未串起来。
