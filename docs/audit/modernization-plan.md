---
type: docs
title: 现代化方案
weight: 70
menus:
  main:
    parent: audit
    weight: 70
description: "1. vite.config.ts 增加 base: '/uRead/'（若仓库名可能变化，用 base: process.env.GITHUBREPOSITORY?.split('/')1 ? \\/${...}/\\ :"
---

> 审计日期：2026-11-16
> 审计方式：静态代码审计 + 实际构建验证（详见同目录其他报告）
> 未验证项：真实浏览器行为、线上 Pages 路由刷新、GitHub Actions 实际执行、后端服务真实启动。
> 原则：**先让一个垂直切片真正可用（数据可写、可查、可定位），再做技术栈升级与 AI**。任何未完成验收标准的项，不得在文档中标记为「已完成」。

---

## 0. 现状基线（所有方案的起点）

| 项 | 路径/代码 | 当前行为 |
|---|---|---|
| 入口 | `src/main.tsx:3,9` `BrowserRouter` | 子路径部署下路由无法直接访问/刷新 |
| 部署配置 | `vite.config.ts:6-28` 无 `base`；`index.html:5` `href="/vite.svg"` | 资源绝对路径，Pages `/uRead/` 下 404 |
| 数据 | `src/views/*.tsx` 全部函数体内硬编码数组；`src/types/index.ts` 仅类型无实现 | 刷新即丢失，无 CRUD |
| 后端 | `src/index.ts:1-6` + `src/routes/*.ts` 内存 mock + `src/services/DatabaseService.ts` 只建表 | 与前端零联通，依赖缺失，无启动脚本 |
| 构建 | `package.json:8` `tsc && vite build` | 当前失败（见 `dependency-review.md` 构建实测） |
| 测试 | 无 `*test*`/`*spec*` 文件；无配置 | 无回归保护 |

---

## 1. P0：先把构建与部署修到「可重复成功」

### 1.1 修复 GitHub Pages 子路径

- **文件路径/代码**：`vite.config.ts:6-28`；`src/main.tsx:3,9`；`index.html:5,12`；`.github/workflows/deploy.yml:26-32`；`deploy.sh:23`。
- **当前行为**：`vite.config.ts` 未设 `base`；Vite 默认 `base: '/'`，产物中 JS/CSS 以 `/assets/...` 引用。站点实际地址是 `https://zhubao315.github.io/uRead/`。`BrowserRouter` 依赖服务器把 `/uRead/notes` 重写到 `index.html`，GitHub Pages 无此能力。
- **风险**：部署后首页可能白屏（资源 404），刷新 `/notes` 等子路由返回 404，favicon 404。
- **建议修改方式**：
  1. `vite.config.ts` 增加 `base: '/uRead/'`（若仓库名可能变化，用 `base: process.env.GITHUB_REPOSITORY?.split('/')[1] ? \`/${...}/\` : '/'`）。
  2. `index.html:5` 改为 `href="./vite.svg"` 或把图标放进 `public/` 并用相对路径。
  3. `src/main.tsx:9` 改用 `HashRouter`（ Pages 无 rewrite 时最稳），或保留 `BrowserRouter` 但增加 `basename="/uRead"` 并在 `404.html` 做重定向脚本。
  4. workflow 改用官方 `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`，并显式声明 `permissions: contents: read; pages: write; id-token: write`；移除 `git push -f`。
- **验收标准**：访问 `https://zhubao315.github.io/uRead/` 首页正常；直接打开/刷新 `/uRead/#/notes`（或 `/uRead/notes`）正常；favicon 与所有 JS/CSS 返回 200；删除 `dist/` 后 CI 从零构建部署成功；无 force push。

### 1.2 统一依赖安装与 lockfile

- **文件路径/代码**：`package.json:6-51`；`deploy.sh:7` `npm ci`；`.github/workflows/deploy.yml:21` `npm install --legacy-peer-deps`；仓库根无 `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`。
- **当前行为**：三种安装方式互相矛盾；本地 `deploy.sh` 的 `npm ci` 因缺 lockfile 必然失败；CI 每次解析到不同版本的 `^` 依赖。
- **风险**：构建不可复现，依赖漂移可能随时打断部署；`--legacy-peer-deps` 掩盖 peer 冲突。
- **建议修改方式**：在 Node 26 环境执行 `npm install` 生成 `package-lock.json` 并提交；所有脚本与 workflow 统一 `npm ci`；删除 `--legacy-peer-deps`，用真实版本冲突修复代替。
- **验收标准**：删除 `node_modules` 后 `npm ci && npm run build` 成功两次且结果一致；`npm ci` 在 workflow 与本地脚本中一致。

### 1.3 清理阻断构建的源码问题

- **文件路径/代码**：`src/components/Icon.tsx:153-160`（无默认导出，也没有 `TagIcon`）；`src/views/Dashboard.tsx:5`、`NotesView.tsx:4`、`CardsView.tsx:4`（均 `import Icon ...` 且 CardsView 导入不存在的 `TagIcon`）；`src/utils/response.ts:36,46` vs `src/types/index.ts:86-91`（`totalPages` 不在类型中）；`src/index.ts:53-56,100`（ESM 中使用 `require`/`module`）；`src/middleware/auth.ts:74`（`error.message`，unknown 类型）。
- **当前行为**：`tsc` 阶段即失败，`vite build` 根本不会执行。
- **风险**：CI 的 `npm run build` 失败 → 无新产物；文档却称「构建优化、CI/CD 完成」。
- **建议修改方式**：补齐 `Icon.tsx` 默认导出与 `TagIcon`；把 `ApiResponse.pagination` 增加 `totalPages?: number`；后端文件移出 `tsconfig.json` 的 `include`（或独立 workspace）；`catch (error)` 改为类型守卫后读取 message。
- **验收标准**：`npm run build` 退出码 0；`dist/index.html` 与 `dist/assets/*` 存在；构建日志无 TS 错误。

---

## 2. P0/P1：数据层（IndexedDB + CRUD）—— 2.0 的地基

### 2.1 建立单一数据源

- **文件路径/代码**：`src/views/Dashboard.tsx:8-19`（23/45/8/127h 与 3 条活动写死）；`NotesView.tsx:9-43`（3 条笔记）；`BookListsView.tsx:5-24`（2 条书单）；`CardsView.tsx:9-46`（3 张卡片）。`src/types/index.ts:3-79` 已有实体类型可复用。
- **当前行为**：每个页面在 render 中重建数组；`NotesView`/`CardsView` 的筛选只作用于这些局部数组；刷新恢复初始状态。
- **风险**：产品无法承载任何用户数据；统计与列表不可能一致；无法做搜索、关联、导出。
- **建议修改方式**：
  1. 新增 `src/data/db.ts`：用 `idb`（或原生 `indexedDB`）建立库 `uread`，object stores：`notes`、`books`、`booklists`、`cards`、`settings`，主键 `id`，索引 `updatedAt` / `bookId` / `tags`。
  2. 新增 `src/data/repository.ts`：`create/update/delete/get/list` 泛型仓储，所有写入自动补 `createdAt`/`updatedAt`/`id`（`crypto.randomUUID()`）。
  3. 删除各 view 内的硬编码数组；改用 `useLiveQuery`（idb 生态）或 zustand store 订阅仓储（`zustand` 已在 `package.json:30` 但从未被 import）。
  4. 模块边界：`src/data`（持久化）→ `src/stores`（状态）→ `src/views`（渲染），禁止 view 直接写 IndexedDB。
- **验收标准**：
  - 新建/编辑/删除笔记、书单、卡片后刷新页面数据仍在；
  - Dashboard 数字由仓储派生，与列表条数一致；
  - 关闭浏览器再打开数据不丢；
  - 单测覆盖仓储 CRUD 与索引查询。

### 2.2 完整 CRUD 交互闭环

- **文件路径/代码**：`NotesView.tsx:75-78,160-164,178-181`；`BookListsView.tsx:30-32` + `src/components/BookListCard.tsx:52`；`CardsView.tsx:83-86,213-222,240-252`；`Dashboard.tsx:55-59,94-96`。这些按钮均无 `onClick`。
- **当前行为**：全库 `onClick` 仅 3 处，全是筛选（`NotesView.tsx:87`、`CardsView.tsx:117,131`）。
- **风险**：宣称的「创建/编辑/管理」全部不可用；按钮是死交互。
- **建议修改方式**：统一 `<EntityForm>` + 路由 `/notes/new`、`/notes/:id/edit`（或 drawer 模式）；所有操作走 2.1 仓储；删除加二次确认；空态按钮打开同一表单。给所有图标按钮加 `aria-label` 与 `focus-visible` 样式（修复 `src/index.css:77-81` 中非法的 `ring:` 属性）。
- **验收标准**：三个模块均能完成创建→读取→更新→删除全流程；空态显式可见；键盘可完成全程操作。

---

## 3. P1：阅读器与来源锚点（产品差异化）

- **文件路径/代码**：无阅读器文件；现有「位置」概念仅 `src/types/index.ts:36` `position?: number` 与 `NotesView.tsx:159`「第 N 页」文本；`CardsView.tsx:184` `sourceBook` 为字符串。
- **当前行为**：用户无法导入或阅读文档，笔记/卡片与原文没有可点击的关联。
- **风险**：「阅读输入 → 结构化沉淀 → 原子化复用 → 体系化联动」闭环（`README.md:7`）在产品中不存在；笔记是孤儿文本。
- **建议修改方式**：
  1. 新增 `src/reader/`：支持 EPUB（epub.js）与 Markdown/TXT（解析为章节），PDF 可用 pdfjs-dist；导入文件存 IndexedDB Blob。
  2. 定义 `SourceRef { bookId; locator: { type: 'epub-cfi'|'page'|'offset'; value: string }; quote: string }`，写入 `Note.sourceRef` 与 `Card.sourceRef`（扩展 `src/types/index.ts`）。
  3. 阅读器监听选区 → 弹出「高亮/记笔记/生成卡片」工具条；点击笔记/卡片来源跳回阅读器并滚动到锚点。
  4. 阅读进度由 `locator` 计算，替换 `NotesView.tsx:19,30,41` 的写死百分比。
- **验收标准**：导入一本 EPUB/Markdown → 选中文字生成高亮笔记 → 从笔记列表点击来源 → 阅读器定位到同一段且高亮显示；进度条随阅读推进变化；刷新后锚点仍在。

---

## 4. P1：知识卡片与关联网络

- **文件路径/代码**：`src/views/CardsView.tsx:19,31,44`（`connections: 3/5/2` 写死）、`206-222`（关联按钮无 handler）；`src/types/index.ts:69` 已有 `relatedCards: string[]`。
- **当前行为**：卡片仅展示文本与写死关联数；无法创建、无法关联、无法从笔记提取。
- **风险**：「原子化知识提取 / 自动关联网络 / 多维度检索」宣称无实现（`README.md:48-52`）。
- **建议修改方式**：
  1. 卡片表单支持从选中的笔记一键生成（预填 `content`/`sourceRef`/`tags`）。
  2. 关联关系存 `relatedCards`，提供多选关联 UI；关联数改为 `relatedCards.length` 派生。
  3. 增加标签多维过滤（现有 `CardsView.tsx:48-49` 单标签过滤可扩展为多标签 AND/OR）与全文搜索（基于仓储内存索引）。
  4. 可视化：先用简单关系列表，再考虑 SVG 力导向图；避免为此单独引入重型依赖前先确认包体预算。
- **验收标准**：可从笔记生成卡片；两张卡片可互相关联且在详情中列出；关联数为真实值；搜索/多标签过滤结果正确且可持久化筛选条件到 URL。

---

## 5. P2：AI Studio（在地基完成后再做）

- **文件路径/代码**：无 AI 相关代码；`src/types/index.ts:74` 仅预留 `confidence?: number`；`README.md:46,50` 宣称 AI 推荐 / 智能生成但未实现。
- **当前行为**：无。
- **风险**：若在 CRUD/锚点未完成前先接 AI，生成结果无处存储、无法溯源、无法验证，必然变成演示假功能。
- **建议修改方式**：
  1. 定义清晰的"人工确认"流程：AI 建议写入 `suggestions` 暂存区，用户确认后才进入 `notes`/`cards`，保留 `sourceRef` 与模型/提示版本元数据。
  2. Provider 可插拔：本地模型（WebLLM/Ollama）优先，云端 API 需用户自带 Key，Key 只存内存、不进仓库/日志。
  3. 能力顺序：摘要 → 标签建议 → 卡片候选 → 跨书关联建议 → 问答（最后做，需引用锚点）。
  4. 所有 AI 输出需标注置信度与来源，并支持一键拒绝/编辑。
- **验收标准**：断网时本地摘要可用；每次 AI 生成都能追溯到源笔记/原文锚点；拒绝的建议不污染主数据；无密钥泄露到前端日志/仓库。

---

## 6. P2：技术栈升级 React 19 / Vite 8 / Node 26

- **文件路径/代码**：`package.json:26-51`（React 18.2、Vite 4.4、TS 5.1、Tailwind 3.3、Storybook 7.4）；`.github/workflows/deploy.yml:18` `node-version: '18'`；本地实测 Node v26.13.0 / npm 11.20.0。
- **当前行为**：workflow 固定 Node 18，与本地 Node 26 不一致；Vite 4 与 Node 26 组合未经项目验证；当前构建已失败（与 Node 版本无关的源码错误在先）。
- **风险**：停留在 Vite 4/React 18 会持续累积安全与兼容成本；但一次性大版本跳跃会放大回归面。
- **建议修改方式（分两批）**：
  1. **先修现状**：在 Node 26 下让现有栈 `npm run build` 通过，补 lockfile；workflow Node 改为 26；升级 TypeScript 到 5.x 最新、Tailwind 3.4、ESLint 9。
  2. **再升级**：React 19 + react-dom 19 + react-router-dom v7；Vite 8 + `@vitejs/plugin-react` 最新版；Storybook 升到与 React 19/Vite 8 兼容的版本（含 `@storybook/react-vite`，见 `.storybook/main.ts:1`）；删除已废弃的 `@storybook/testing-library@0.2`。
  3. 升级顺序：先在单独分支升级依赖 → 跑通构建与全部测试 → 再迁移路由/API 变更（React 19 的 `use`、ref as prop；Router v7 的 loader/route 对象可选，先保持兼容用法）。
  4. 清理重复代码：删除 `client/`（`client/src/views/Dashboard.tsx:5-9` 与根目录分叉）或改为 workspace 单一来源；删除/拆分 `src/index.ts` 后端为独立服务，前端保持纯静态。
- **验收标准**：Node 26 下 `npm ci && npm run build && npm run test && npm run lint` 全绿；CI 使用 Node 26；`npm audit --omit=dev` 无高危；产物体积有前后对比记录。

---

## 7. P1：测试体系

- **文件路径/代码**：仓库无任何 `*test*`/`*spec*`、`vitest.config.*`、`playwright.config.*`；`package.json` 无 `test` 脚本。
- **当前行为**：`PROJECT_SUMMARY.md:209-219` 将测试标注为「预留」，`FINAL_REPORT.md:274` 却宣称「测试覆盖」。
- **风险**：任何重构（尤其数据层与升级）无回归保护。
- **建议修改方式**：
  1. **单元**：Vitest + React Testing Library；优先覆盖 `src/data/repository.ts` CRUD、筛选逻辑、`Button`/`Card` 组件状态。
  2. **集成**：msw 或 fake-indexeddb 模拟持久化，测「新建笔记 → 列表更新 → 统计更新」。
  3. **E2E**：Playwright 覆盖三条黄金路径：笔记 CRUD、卡片从笔记生成并关联、阅读器锚点跳转。
  4. **CI**：workflow 在 build 前运行 `npm run test -- --run` 与 `npm run lint`；部署步骤依赖这两步成功。
  5. 删除 `FINAL_REPORT.md` / `SHOWCASE.md` / `DEMO.md` 中无法验证的 ✅ 清单，改为「状态：未实现/进行中/已验证（附测试链接）」。
- **验收标准**：CI 每次 PR 运行测试；覆盖率有基线且不再下降；三条 E2E 黄金路径在 Pages 部署后仍通过（含子路径路由）。

---

## 8. 分阶段路线图（建议顺序）

| 阶段 | 内容 | 退出条件 |
|---|---|---|
| S0（本审计） | 修构建阻断（`Icon.tsx`、`totalPages`、后端 ESM）、lockfile、base + HashRouter | `npm run build` 绿；子路径可访问 |
| S1 | IndexedDB 仓储 + 三模块 CRUD + 真实统计 | 刷新不丢数据；E2E 笔记 CRUD 通过 |
| S2 | 阅读器 + 来源锚点 + 进度 | 笔记可跳回原文；锚点持久化 |
| S3 | 卡片生成/关联/搜索 + 测试体系完善 | 卡片关联 E2E 通过；CI 覆盖率基线建立 |
| S4 | AI Studio（建议→确认→落库） | 生成内容可溯源且需人工确认 |
| S5 | React 19 / Vite 8 / Node 26 / Storybook 升级、删 `client/` 与死后端 | 全绿且文档与实现一致 |

> 重要：在 S1 完成前，不要在 README/报告中宣称「功能完整」；在 S5 完成前，不要宣称「现代技术栈已升级」。
