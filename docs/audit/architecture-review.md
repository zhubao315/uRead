---
type: docs
title: 架构评审
weight: 20
menus:
  main:
    parent: audit
    weight: 20
description: "实际运行时只有\"React 静态页面 + 硬编码数据\"这一条链路；后端、数据库、状态管理、动画、图标库全部是未接线的代码/依赖。"
---

> 审计日期：2026-11-16
> 审计方式：静态代码审计 + 实际构建验证（源码逐文件阅读；`npm install --legacy-peer-deps` + `npm run build` 实测；GitHub API 复核提交历史）
> 未验证项：真实浏览器渲染/路由行为、线上 Pages 站点表现、GitHub Actions 实跑结果、后端服务真实启动（缺少依赖，未安装后端依赖）。
> 说明：本文只描述代码中真实存在的结构；文档宣称（README/FINAL_REPORT 等）不作为实现证据，详见 `functionality-matrix.md`。构建实测输出见 `dependency-review.md`。

---

## 1. 架构现状总览

```
main 分支（3 次提交，均 2026-04-03；最新 ef1ae4e）
├── src/                       ← 被构建的"前端"（但混入了后端代码）
│   ├── main.tsx               BrowserRouter（无 basename）
│   ├── App.tsx                4 条静态路由
│   ├── views/*.tsx            4 个页面，数据全部硬编码在组件内
│   ├── components/*.tsx       UI 组件 + Storybook stories
│   ├── types/index.ts         实体类型（仅类型，无实现）
│   ├── utils/response.ts      API 响应帮助函数（属后端层）
│   ├── middleware/auth.ts     JWT 中间件（属后端层）
│   ├── routes/*.ts            Express Router（内存 mock）
│   ├── services/DatabaseService.ts  SQLite 建表（无 CRUD 调用）
│   └── index.ts               Express 入口（无依赖、无启动脚本）
├── client/                    ← 第二套分叉前端（无 tsconfig，无 CI 构建）
├── .storybook/                ← 配置引用未声明的依赖
├── vite.config.ts             ← 无 base、无 postcss 内联配置
├── package.json               ← 仅前端依赖；scripts 8 条
└── .github/workflows/deploy.yml ← npm install + git push -f 到 gh-pages
```

实际运行时只有"React 静态页面 + 硬编码数据"这一条链路；后端、数据库、状态管理、动画、图标库全部是未接线的代码/依赖。

---

## 2. 架构问题清单

### A1【P0】项目边界不清：前端与后端混在同一 `src/`，后端完全断开

- **文件路径/代码**：`src/index.ts:1-6`（`express`/`cors`/`helmet`/`compression`/`morgan`/`dotenv`）、`src/index.ts:51-62`（挂载 `/api`）、`src/routes/notes.ts:9`（`let mockNotes: any[] = [...]`）、`src/services/DatabaseService.ts:48-142`（建表 SQL）；`package.json:6-51` 无上述依赖，也无 server 启动脚本；`vite.config.ts:23-26` 的 alias `@` 指向同一 `src`。
- **当前行为**：`npm run dev` 只起 Vite；Express 入口从未执行。`tsconfig.json:23` `include: [\"src\"]` 却把后端文件纳入类型检查，导致构建在 `tsc` 阶段被后端缺失依赖阻断。
- **风险**：① 构建失败；② 读者误以为存在可用 API；③ 前端与后端职责混杂，无法独立演进；④ `src/index.ts:100-102` 在 ESM 项目里用 `require.main === module`，即便补了依赖也不会按预期启动。
- **建议修改方式**：二选一——(a) 2.0 初期删除后端相关文件与 `.env.example`，明确"纯本地 IndexedDB 静态应用"；(b) 拆为 `apps/web` 与 `apps/api` 两个 workspace，各自 `package.json`/`tsconfig`，API 补齐 express 等依赖与 `dev:api` 脚本，前端通过环境变量配置 API base。无论哪种，`tsconfig.json` 的 `include` 必须与构建目标一致。
- **验收标准**：`npm run build` 不再因后端代码报错；仓库结构使"前端/后端边界"一眼可辨；若有 API，`curl /api/health` 返回 200，否则文档不再宣称后端存在。

### A2【P0】部署架构与路由模型不匹配（base + BrowserRouter）

- **文件路径/代码**：`vite.config.ts:6-28`（无 `base` 字段）；`src/main.tsx:3,9`（`BrowserRouter` 无 `basename`）；`index.html:5`（`href="/vite.svg"` 绝对路径）；`.github/workflows/deploy.yml:26-32`（产物推送到 `gh-pages` 分支，路径 `https://zhubao315.github.io/uRead/`）；`deploy.sh:26` 同样写死该 URL。
- **当前行为**：Vite 默认 `base: '/'`，产物引用 `/assets/...`；GitHub Pages 在子路径 `/uRead/` 下不会把 `/uRead/assets/...` 映射到根目录（除非另有 rewrite）。`BrowserRouter` 依赖服务端 fallback，Pages 无此配置。
- **风险**：部署后白屏、JS/CSS 404、直接访问 `/notes` 或刷新子路由 404、favicon 404。文档却宣称"一键部署、GitHub Pages 可用"。
- **建议修改方式**：见 `modernization-plan.md` §1.1：`base: '/uRead/'` + `HashRouter`（或 BrowserRouter + `basename` + `404.html` 重定向）+ 资源相对路径 + 官方 Pages Action。
- **验收标准**：子路径首页、子路由直达与刷新、静态资源全部 200；CI 无需 force push 即可部署。

### A3【P0】部署流程三套并存且互相矛盾

- **文件路径/代码**：`package.json:10` `\"deploy\": \"gh-pages -d dist\"`；`deploy.sh:7` `npm ci` + `:19-23` `git add -f dist/`/`git commit`/`git push -f origin main:gh-pages`；`.github/workflows/deploy.yml:21` `npm install --legacy-peer-deps` + `:30-32` `git add -f dist/`/`git push -f origin HEAD:gh-pages`；仓库无 lockfile。
- **当前行为**：本地脚本的 `npm ci` 因缺 `package-lock.json` 必然失败；workflow 使用可变版本安装；force push 覆盖 `gh-pages` 历史；workflow 未声明 `permissions`，在默认只读权限的仓库中 push 可能 403。
- **风险**：构建不可复现、部署可能失败且难以回滚、误覆盖他人提交。
- **建议修改方式**：提交 lockfile；统一 `npm ci`；改用 `peaceiris/actions-gh-pages@v3`（与文档一致）或 `actions/deploy-pages@v4`，并显式配置权限；删除 `deploy.sh` 中的 force push。
- **验收标准**：从干净环境执行 `npm ci && npm run build && npm run deploy` 成功；CI 部署可审计且可回滚；`dist/` 部署内容与应用实际路径一致。

### A4【P1】数据层缺失：视图即数据源，无状态管理落地

- **文件路径/代码**：`src/views/Dashboard.tsx:8-19`（stats/recentActivity 写死）、`NotesView.tsx:9-43`、`BookListsView.tsx:5-24`（`useState` 只有初值无 setter）、`CardsView.tsx:9-46`；`package.json:30` 声明 `zustand`，但全仓 `grep` 无任何 `from 'zustand'`。
- **当前行为**：每个页面在渲染函数内重建数据；筛选状态仅存在于 `NotesView:7` 与 `CardsView:7` 的局部 `useState`；刷新后一切复原。
- **风险**：无法持久化、无法跨组件共享、统计与列表可能不一致、无法做撤销/离线。
- **建议修改方式**：见 `modernization-plan.md` §2：建立 `src/data`（IndexedDB 仓储）→ `src/stores`（zustand）→ `src/views`（渲染）的单向依赖；把 zustand 真正用起来或移除依赖。
- **验收标准**：任一实体 CRUD 后，所有相关视图同步更新且刷新后保留；`grep` 显示视图内不再出现硬编码业务数组。

### A5【P1】重复/分叉的前端代码（`client/`）

- **文件路径/代码**：`client/src/App.tsx:1-25` 与 `src/App.tsx:1-25` 路由表完全相同但属于两套包；`client/package.json:1-25` 声明独立依赖；`client/vite.config.ts:9-11` 才有 `/api` 代理（根 `vite.config.ts` 没有）；`client/src/views/Dashboard.tsx:5-9` 用 emoji 图标且无 `Card`/`Button`/`Icon`（与根目录 `Dashboard.tsx:5` 的 SVG 图标版本分叉）；`client/src/views/NotesView.tsx:5-26` 只有 2 条笔记且无筛选（根目录 3 条且有筛选）；`client/` 下无 `tsconfig.json`，且其 `package.json:18` 仍写 `tsc && vite build`。
- **当前行为**：CI 只构建根目录；`client/` 是无人维护的死代码，但包含 `/api` 代理这一"看似前后端联通"的误导性配置。
- **风险**：修改只改一处导致行为不一致；贡献者不知道哪份是真实代码；`client` 的 build 脚本因无 tsconfig 不可靠。
- **建议修改方式**：删除 `client/` 整个目录；若确有 API 代理需求，迁移到根 `vite.config.ts` 的 `server.proxy` 并由环境变量开关。
- **验收标准**：仓库中只有一份前端源码；`find . -name App.tsx` 只有一个结果（除 node_modules）；文档中的项目结构与实际一致。

### A6【P1】样式管线未接线 + Tailwind 动态类名

- **文件路径/代码**：仓库无 `postcss.config.js`（`find` 确认）；`package.json:37-38` 声明 `postcss`/`autoprefixer`；`src/index.css:1-3` 使用 `@tailwind base/components/utilities`；`tailwind.config.js:3-6` 的 `content` 仅覆盖 `./src/**`（不覆盖 `client/src`）；`src/views/Dashboard.tsx:72-73` 使用模板字符串 `` `bg-${stat.color}-100` `` / `` `text-${stat.color}-600` ``；`src/index.css:77-81` 的 `.focus-ring:focus` 使用了不存在的 CSS 属性 `ring:` 和 `ring-offset:` 并同时 `outline: none`。
- **当前行为**：Vite 无 PostCSS 配置时不会加载 Tailwind 插件（除非 Storybook 或其他工具隐式提供），`@tailwind` 指令可能原样进入产物，工具类不生成；动态拼接的 `bg-blue-100` 等类名即使配置了 Tailwind 也无法被 JIT 扫描；`focus-ring` 实际上移除了焦点轮廓而没有替代，键盘用户失去焦点指示。
- **风险**：生产页面样式与设计稿严重不符；无障碍宣称（WCAG）被直接证伪。
- **建议修改方式**：新增 `postcss.config.cjs` 配置 `tailwindcss` + `autoprefixer`；把动态 class 改为完整字符串映射（如 `{ blue: 'bg-blue-100 text-blue-600' }`）；`focus-ring` 改用 `:focus-visible { outline: 2px solid #3B82F6; outline-offset: 2px; }`；若保留 `client/`，扩展 content 覆盖它（更推荐删除）。
- **验收标准**：`dist/assets/*.css` 中可见生成后的 Tailwind 工具类（如 `.bg-blue-600`）；统计卡片有正确底色；Tab 导航时每个可聚焦元素有可见轮廓。

### A7【P1】Storybook 子系统设计未闭环

- **文件路径/代码**：`.storybook/main.ts:1,11` 引用 `@storybook/react-vite`；`package.json:46-50` 声明 `@storybook/react`、`addon-essentials`、`addon-interactions`、`@chromatic-com/storybook@^1.0.0`、`@storybook/testing-library@^0.2.0`（已废弃），**未声明** `@storybook/react-vite`；`src/components/Button.stories.tsx`、`Card.stories.tsx` 仅覆盖 2 个基础组件；`src/components/NoteCard.tsx`/`BookListCard.tsx`/`KnowledgeCard.tsx` 无 stories。
- **当前行为**：`npm run storybook` / `build-storybook` 预期因缺少 framework 包失败（本次未实测 storybook 命令）；文档却称"完整组件文档系统"。
- **风险**：设计系统无法作为协作契约；组件变更无可视化回归。
- **建议修改方式**：补齐 `@storybook/react-vite` 并使版本与 React/Vite 主版本匹配；为 5 个业务/UI 组件补 stories；把 storybook 构建加入 CI（可选但推荐）。
- **验收标准**：`npm run build-storybook` 成功；所有组件在 Storybook 中可交互查看；docs 中 Storybook 宣称与实际一致。

### A8【P2】无错误边界、无路由级代码分割、无环境配置层

- **文件路径/代码**：`src/App.tsx:9-23`（无 `<ErrorBoundary>`、无 `React.lazy`/`Suspense`）；`src/main.tsx:7-13`（无全局错误监听）；`src/index.ts:10`（仅后端 `dotenv.config()`）；前端无 `import.meta.env` 使用。
- **当前行为**：任一渲染异常会导致整页白屏；4 个视图与全部组件打进同一 chunk（`vite.config.ts:17-19` 只分了 `vendor`）；前端没有可配置的环境变量入口（即便 2.0 要接 API 也无处配置）。
- **风险**：故障体验差、首屏包体偏大、未来接后端/AI 时被迫临时改造架构。
- **建议修改方式**：增加顶层 `ErrorBoundary` 与友好回退 UI；`React.lazy` 拆分 4 个 view；在 `src/config.ts` 统一读取 `import.meta.env`（`VITE_API_BASE`、`VITE_AI_PROVIDER` 等），并按环境提供 `.env.example`（前端部分）。
- **验收标准**：人为抛错时显示回退 UI 而非白屏；产物中出现按路由拆分的多个 chunk；配置集中管理且无硬编码 URL。

### A9【P2】提交历史与文档时间线不一致

- **文件路径/代码**：GitHub API 复核 `zhubao315/uRead`：`main` 仅 3 次提交，均 2026-04-03——`26513ca3` Initial、`1aee8c8a` Trigger deployment、`ef1ae4e7` Fix deployment；分支仅 `main` + `gh-pages`。`FINAL_REPORT.md:377`、`SHOWCASE.md:465`、`DEMO.md:373` 标注"最后更新 2024年3月6日"。
- **当前行为**：文档日期与实际提交日期矛盾；不存在文档所描述的渐进迭代过程。
- **风险**：基于文档判断项目成熟度会严重误判；升级规划若以"已有系统"为前提会低估工作量。
- **建议修改方式**：以本审计报告为基线，重写 README 的状态章节；删除"全部完成"类措辞，改为明确的 2.0 路线图（见 `modernization-plan.md`）。
- **验收标准**：README 中的功能状态与 `functionality-matrix.md` 一致；任何 ✅ 都能指向可运行的验证命令或测试。
