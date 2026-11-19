---
type: docs
title: 功能矩阵（2026-11-19）
weight: 6
menus:
  main:
    parent: audit
    weight: 6
description: "按真实代码与测试判定的当前功能矩阵；与 2026-11-16 的 functionality-matrix.md 历史快照并存。"
---

| 模块 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- |
| 资料库 CRUD | IMPLEMENTED | `src/data/repository.ts` + `tests/data/repository.test.ts` | 八类 store 之一 |
| 笔记 CRUD / 来源锚点 | IMPLEMENTED | `src/data/types.ts` 的 `SourceRef`/`Anchor` | 锚点回跳只做公开产物路径 |
| 知识卡片 CRUD / 核验 | IMPLEMENTED | `src/views/CardsView.tsx` | 六种类型尚未实现 |
| 书单管理 | IMPLEMENTED | `src/views/BookListsView.tsx` | 本地书单与公开书单是两条数据 |
| 全站搜索 | IMPLEMENTED | `tests/components/search-and-state.test.tsx` | 多词 AND + URL 状态 |
| JSON 完整备份 / Markdown 导出 | IMPLEMENTED | `tests/data/repository.test.ts` | 八类全覆盖 |
| 公开笔记浏览 / 搜索 / 听 | IMPLEMENTED | `public/notes/`、`src/views/PublicNotesView.tsx` | 1634 篇 / 10 音频 |
| 主题阅读 / 书单推荐 | IMPLEMENTED | `public/lists/`、`src/views/PublicListView.tsx` | 10 主题 / 39 书单 |
| EPUB 阅读 | IMPLEMENTED | `book-library/reader.html` + foliate-js 1.0.1 | 位置记忆有，选区批注无 |
| PDF 阅读 | IMPLEMENTED | 浏览器原生 iframe | 页码定位/批注是 PLAIN 浏览器能力，不是自研 |
| 夜间模式 / 离线壳 / 深链 | IMPLEMENTED | `src/index.css`、`public/sw.js`、`scripts/make-fallback-pages.mjs` | 1691 条回退 |
| AI 摘要 / 抽取 / 推荐 | PLANNED | 仓库无 AI Provider / 提示词 / 模型调用 | README 明确标注 |
| 跨设备同步 | PLANNED | 无同步 store 或路由 | 本地优先，无服务端 |
| 知识复习 / 间隔重复 | PLANNED | 无 review 模块 | — |
| 知识图谱 / 关系网络 | PARTIAL | 只有 `KnowledgeRelation` 的 `derived_from` | 无图视图 |
| 公开发布权限治理 | PARTIAL | 全量同步脚本 | 无白名单 / 预览 / 撤回 |
| 真实浏览器 E2E | PLANNED | 仓库无 Playwright 配置 | 目前只有 vitest 页面层测试 |

历史快照：`functionality-matrix.md`（2026-11-16）记录的是更早代码状态，只读，不更新。
