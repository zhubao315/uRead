---
type: docs
title: 路由地图
description: "公开站与管理工作台的兼容路由、静态目录边界。"
---

生成时间：2026-11-24T12:17:19.707Z

## 真实路由盘点

| 路径 | 状态 |
| --- | --- |
| `/` | 公开内容门户（Phase 1 待建，当前为管理工作台） |
| `/notes` | 公开笔记列表（历史路径，保留） |
| `/notes/:slug` | 公开笔记详情 |
| `/reader` | 统一阅读入口 |
| `/themes` | 主题阅读（兼容入口，保留） |
| `/lists` | 书单推荐（兼容入口，保留） |
| `/booklists` | 整合后的书单入口（Phase 1 待建） |
| `/books/` | 静态 EPUB/PDF 书库（原样保留，不可覆盖） |
| `/books/:slug` | 书籍信息详情（Phase 1 待建，须避开静态 /books/ 目录） |
| `/docs/` | Hugo + OINK 文档站 |
| `/library /cards /booklists /search` | 本地 IndexedDB 管理工作台（保留） |

## 兼容硬约束

- `base=/uRead/`、`basename=/uRead`、`404.html` 回退三者必须一致。
- `/books/` 是**真实静态目录**（书库阅读器与书文件），新书籍详情不得直接覆盖它。
- 深链回退脚本为 1691 条路由生成 `index.html`；新增路由必须同步扩充。
- 旧路径 `/read /notes /themes /lists /books/ /docs/` 继续有效，不得 404。
