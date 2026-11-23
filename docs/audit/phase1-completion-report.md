---
title: Phase 1 工程优化完成报告
description: "首页轻量快照、搜索防抖、Service Worker 真实预缓存、离线验收与 CI 门禁的实测前后对比。"
---

日期：2026-11-23
仓库：`zhubao315/uRead`（本地 `/oc/upstream/uRead`）

## 一、证据边界

- 所有体积数字来自本地生产构建产物的 gzip 实测，不是 Lighthouse 分数。
- 本环境没有 Lighthouse CLI / 真实用户数据，LCP/INP/CLS/FCP/TTFB **未实测**，不做推测。
- 离线能力由 Playwright 真实浏览器验收（桌面 + 移动），不是模拟推断。

## 二、本次完成项

### 1. 首页专用轻量快照（最高收益）

新增 `scripts/build-homepage-snapshot.mjs`，在 `books:index` 之后生成
`dist/publishing/homepage-snapshot.json`：6 本精选书 + 6 份精选清单 + 6 篇最新笔记
（摘要截断 120 字）+ 10 个主题入口 + 真实计数。

| 指标 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 首页首屏关键 JSON | 笔记索引 1.5 MB + 书籍聚合 361 KB | **8.25 KB** 快照 |
| 首页请求数（关键数据） | 4 | 1（快照失败才回退旧路径） |

`ContentHomeView` 优先读快照；快照失效时回退原有完整索引，不展示虚构数据。
计数改用快照提供的真实值，避免用 6 条最新笔记冒充总数。

### 2. 搜索输入防抖

`FindView` 增加 200ms 防抖：输入框先本地响应，停打字后才写回 `?q=` 并触发筛选；
提交与清空即时生效。检索字符串仍在索引加载时预计算一次，避免每键重复 `join+toLowerCase`。

### 3. Service Worker 预缓存与离线启动

- 新增 `scripts/build-sw-precache.mjs`：构建期从 `dist/index.html` 提取真实的
  `<script type="module">`、`modulepreload`、`stylesheet` 地址，注入 `sw.js` 的 `PRECACHE`。
- 缓存版本升级 v3；预缓存 5 个首屏资源（HTML + JS/CSS + React + Router）。
- 修复离线资源查找错误：预缓存写入 `SHELL_CACHE`，但资源请求原先只查 `ASSET_CACHE`，
  导致断网刷新后 JS 全部 `ERR_FAILED`；现在两个缓存都查。
- 首页从 `React.lazy` 改为静态导入：它是默认落地页，必须进入预缓存外壳（仅约 +4 KB gzip）。
- 加载态不再是一行文字：渲染静态主视觉 + “若当前离线，联网后将自动恢复”。
- 新增 `tests/e2e/offline.spec.ts`：安装 SW 后断网刷新，断言仍能看到主视觉与提示。

### 4. CI 门禁

`.github/workflows/ci.yml` 新增：构建体积门禁（`budget:check`）、Playwright Chromium 安装、
关键路径 E2E（桌面 + 移动 + 离线）。

### 5. 文档与描述同步

- README 书籍计数 1868 → 1818（与构建产物一致）。
- `design-system.md` / `ui-ux-design-system.md` 版本 0.21.0 → 0.33.1。
- `package.json` 描述改为「本地优先的个人深度阅读与结构化笔记工作台」，
  不再宣称当前已实现 AI 摘要/萃取。

## 三、验证结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过 |
| `npm test` | 226 passed / 1 skipped |
| `npm run build` | 通过 |
| `npm run budget:check` | 通过（初始 JS 90.4 KB / CSS 7.6 KB，预算 200/50 KB） |
| `npm run verify:release` | 通过（内容对账一致） |
| `npm run test:e2e` | **27 passed / 1 skipped**（含新增离线用例，桌面 + 移动） |

`npm run docs:check` 的 `404.html` 缺失仍是改造前存在的文档站问题，未改动。

## 四、尚未完成（需产品决策或外部条件）

1. **真实性能测量**：Lighthouse CI / RUM 未接入，Core Web Vitals 未实测。
2. **Phase 2 选书系统**：阅读意图/问题库需要确定是复用现有 `BookList`/`Book`/`KnowledgeRelation`，
   还是新增 IndexedDB Store（涉及版本升级、迁移、备份兼容），本轮未擅自改动数据契约。
3. **Phase 3/4 AI 伴读与费曼输出**：涉及内容来源标识（HUMAN_WRITTEN / AI_GENERATED /
   AI_ASSISTED / HUMAN_VERIFIED）与新的输出数据结构，同样需要产品决策。本轮未接入任何 AI API，
   也未把密钥放进前端。
4. **人工安全核对**：公开笔记范围、历史 PAT 轮换记录——这两项只能由人确认。

## 五、后续追加：阅读闭环（0.34.0）

按「复用现有 Note 结构」的决策实现，未新增 IndexedDB Store：

- `note_kind` 新增 `intent`（阅读意图/问题）与 `feynman`（费曼输出）；
- `metadata.provenance` 标记 `HUMAN_WRITTEN` / `AI_GENERATED` / `AI_ASSISTED` / `HUMAN_VERIFIED`；
- 工作台新路由 `/workspace/loop` 与 Dashboard、移动端底栏入口；
- 关联使用现有 `book_id` 与 `KnowledgeRelation`（`related_to` / `derived_from`）；
- AI 仅提供可复制 Prompt 模板，不调用 API、不自动回填、不标记已读；
- 八类备份契约、v2 JSON 格式、导入导出与清空逻辑均未改动；
- E2E：`tests/e2e/reading-loop.spec.ts`（桌面 + 移动，含刷新后持久化）。

**仍未实现**：真实的 AI 伴读服务、知识图谱大屏、按问题自动推荐书籍、阅读与应用效果量化统计。
