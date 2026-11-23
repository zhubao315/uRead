---
title: 性能优化实施报告
description: "路由级代码拆分、工作台 IndexedDB 延迟初始化、构建分块、Service Worker 缓存治理与搜索热路径优化的实测前后对比。"
---

日期：2026-11-20
仓库：`zhubao315/uRead`（本地工作副本 `/oc/upstream/uRead`）
构建：`vite 8.3` / `rolldown`，生产构建（`vite build`）

## 一、原则与证据边界

- 未改动任何内容 ID、路由、IndexedDB Schema、发布契约与笔记正文。
- 未删除任何内容、笔记或工作台数据。
- 所有性能数字来自**本地生产构建产物**的 gzip 实测，不是 Lighthouse 分数。
- 本环境没有 Lighthouse CLI / 真实用户数据，因此 **LCP/INP/CLS/FCP/TTFB 未给出实测值**；这些指标需在有 CrUX/RUM 或 Playwright + Lighthouse 的环境中补测。
- 浏览器侧验证使用 Playwright（桌面 1440×1000、移动 Pixel 7），25 项 E2E 通过。

## 二、基线（改造前，同一 gzip 测量方法）

| 指标 | 改造前 |
| --- | ---: |
| 初始 JS（gzip） | 125,640 B（≈122.7 KB） |
| 初始 CSS（gzip） | 7,604 B（≈7.4 KB） |
| 初始 JS 文件数 | 3（`index` + `vendor` + `rolldown-runtime`） |
| 总 chunk 数 | 4 |
| 路由级拆分 | 无，全部视图打进入口 |
| 公开门户是否含 IndexedDB 代码 | 是（入口静态导入 `libraryStore` → `repository` → `db`） |
| 生产 Source Map | 已关闭（`sourcemap: mode !== 'production'`） |

注：用户审计材料中「sourcemap=true」一项与当前源码不符；当前源码在生产模式下已经关闭。

## 三、改造后

| 指标 | 改造后 | 变化 |
| --- | ---: | ---: |
| 初始 JS（gzip） | 88,203 B（≈86.1 KB） | **−29.8%** |
| 初始 CSS（gzip） | 7,556 B（≈7.4 KB） | 基本持平 |
| 初始 JS 文件数 | 4（`index` / `react` / `router` / `rolldown-runtime`） | +1，可独立缓存 |
| 总 chunk 数 | 31 | 路由/功能按需下载 |
| 公开门户是否含 IndexedDB 代码 | 否（已用 `grep` 验证初始 chunk 无 `indexedDB` / `objectStore`） | ✅ |
| 生产 Source Map | 关闭，且门禁会拒绝产物中出现 `.map` | ✅ |

初始请求（来自 `dist/index.html`）：

```
index-*.js              19.5 KB raw / 6.4 KB gzip   ← 应用入口
rolldown-runtime-*.js    0.6 KB raw / 0.4 KB gzip
react-*.js             218.7 KB raw / 67.5 KB gzip  ← React + ReactDOM
router-*.js             39.1 KB raw / 13.9 KB gzip
index-*.css             34.1 KB raw / 7.4 KB gzip
```

按需 chunk（节选）：`ContentHomeView` 3.5 KB、`PublicNotesView` 2.5 KB、
`PublicNoteDetailView` 5.5 KB、`FindView` 2.1 KB、`Dashboard` 4.1 KB、
`libraryStore` 8.3 KB、`WorkspaceGate` 独立成块。

## 四、具体修改

### 1. 路由级代码拆分（`src/App.tsx`）

- 15 个页面全部改为 `React.lazy(() => import(...))`，`BooklistDetailRedirect`
  以命名导出的 `.then()` 形式懒加载。
- 用单个 `<Suspense fallback={<PageSkeleton />}>` 包裹 `<Routes>`，骨架屏为
  `role="status"` 的中文提示，无额外依赖。
- `LegacyRedirect` 与 `NotFound` 保持静态（体积极小，且被单测断言为文件内字面量）。

### 2. 公开门户与工作台解耦（`src/App.tsx` + 新增 `src/components/WorkspaceGate.tsx`）

- 删除根组件里的 `useLibraryStore` 导入与 `load()` 调用。
- 所有 `/workspace/*` 路由挂到懒加载的 `WorkspaceGate` layout 下；只有它调用
  `load()`，并把读取失败 banner 一并迁到这里。
- `initialized` 保证只初始化一次；`load()` 内部已有错误时也置 `initialized`，不会死循环重试。
- 验证：初始 4 个 JS chunk 中不含 `indexedDB` / `objectStore` 字符串；
  `libraryStore` 与 `WorkspaceGate` 均为独立懒加载 chunk。
- 附带收益：EPUB/PDF 在本项目中本就是静态文件链接（`ReaderHubView`），没有
  foliate-js 之类的重型引擎依赖，因此不存在阅读器引擎进入首屏包的问题。

### 3. 构建分块（`vite.config.ts`）

- `manualChunks` 由「所有 `node_modules` → 一个 vendor」改为按职责拆分：
  `react`（react / react-dom / scheduler）、`router`（react-router*）、
  `state`（zustand），其余交给动态 import 自动生成 chunk。
- 保持生产 `sourcemap: false`。
- 未制造大量微小请求：31 个 chunk 中绝大多数是路由按需加载，首屏只取 4 个 JS + 1 个 CSS。

### 4. Service Worker 缓存治理（`public/sw.js`）

改造前的问题：`/uRead/notes/` 前缀会连 22 MB 的 `notes.json` 和上千个
`detail/*.json` 一起写进 Cache Storage，且 manifest 的 `?t=` 时间戳让每次轮询
都生成新缓存 key，缓存无容量上限。

改造后：

- 缓存版本升级到 `v2`，激活时清理旧的 `uread-*` 缓存。
- 目录 JSON 白名单（manifest / index / slugs / aggregate / lists / 配置），
  体积上限 2 MB，条目上限 24，Stale While Revalidate。
- `/uRead/assets/` 带 hash 资源 Cache First，条目上限 60。
- 导航请求网络优先，断网回落到缓存首页。
- 正文、详情、音频、EPUB/PDF 一律直连。
- 缓存 key 统一去掉 query 串，避免 cache-busting 参数造成缓存膨胀。
- `eslint.config.js` 为 `public/**/*.js` 补了 `Request` / `Response` 全局声明。

### 5. 搜索热路径（`src/views/FindView.tsx`）

- 1595 篇笔记的小写检索串只在索引加载后计算一次（`haystacks` useMemo），
  每次按键只做 `includes`，避免逐键 `join + toLowerCase` 形成长任务，改善 INP。

### 6. 体积门禁（`scripts/check-bundle-budget.mjs` + `package.json`）

- 新增 `npm run budget:check`：解析 `dist/index.html` 得到真实首屏资源集合，
  按 gzip 统计并与预算比较（初始 JS ≤ 200 KB、初始 CSS ≤ 50 KB、
  单 chunk ≤ 150 KB、生产产物不得出现 `.map`）。
- 报告写入 `docs/audit/bundle-report.json`。
- `verify:release` 前置该检查，发布对账不会被绕过。

## 五、验证结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过 |
| `npm test` | 226 passed / 1 skipped（共 227） |
| `npm run build` | 通过 |
| `npm run budget:check` | 通过（初始 JS 85.9 KB / CSS 7.4 KB） |
| `npm run verify:release` | 通过（含体积门禁 + 内容对账） |
| `npm run publish:check` | 通过（1595 篇 / 允许 1593 / 拦截 2，无新增审批差异） |
| `npm run media:validate` | 通过 |
| `npm run test:e2e` | 25 passed / 1 skipped（桌面 + 移动） |
| `npm run docs:check` | **失败（改造前已存在）**：`docs-site` 缺 `404.html`，只有 `40x.html` 且无 `<h1>`。与本次改动无关，未改动文档站产物。 |

## 六、未解决 / 后续建议（按优先级）

1. **P0 · 真实 CWV 测量**：在有 Lighthouse CI / RUM 的环境补测 LCP、INP、CLS、
   FCP、TTFB。本次只能给出 Bundle 与请求层面的工程指标。
2. **P0 · 首页数据请求**：`ContentHomeView` 仍为取 6 本精选书籍而下载整份
   `books/aggregate.json`（361 KB raw / 76 KB gzip），并下载 1.5 MB 的笔记索引
   （gzip ≈ 375 KB）。建议构建期产出 `books/featured.json` 与 `notes/latest.json`
   两个小文件。此项会新增发布产物，需在 `publish:check` / `verify:release`
   白名单同步后再做，本轮为避免改变发布契约而暂缓。
3. **P1 · 笔记索引体积**：1.5 MB 索引是所有公开页面的共同入口，可考虑按主题
   分片或进一步精简 `excerpt` 字段。
4. **P1 · 长列表虚拟化**：`/read` 列表目前一次性渲染全部索引条目，建议引入
   虚拟列表或分页。
5. **P1 · docs:check 预存在的 404.html 问题**：需在 Hugo 配置/模板补 `404.html`
   并重建 `docs-site`，属于文档站问题，不在本次性能改造范围。
6. **P2 · Service Worker 上线后观察**：关注 v2 安装率、旧缓存清理情况与离线
   回退是否正确；如有异常可把缓存版本回退到 v1 的键名策略。
