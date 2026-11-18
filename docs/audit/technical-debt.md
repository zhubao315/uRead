---
type: docs
title: 技术债清单
weight: 60
menus:
  main:
    parent: audit
    weight: 60
description: "1. S0（1–2 天）：TD-01、TD-03、TD-04 → 让构建与子路径部署跑通（同时删除 client/ 与后端或隔离，解决 TD-05/TD-06 的构建面）。"
---

> 审计日期：2026-11-16
> 审计方式：静态代码审计 + 实际构建验证（`npm install --legacy-peer-deps`、`npm run build`、`npx vite build`、`npm run lint`、`npm audit` 均真实执行；GitHub API 复核提交历史）
> 未验证项：真实浏览器交互、线上 Pages 路由刷新、Actions 实跑、Storybook 命令执行、后端服务启动。
> 优先级定义：**P0** = 阻断构建/部署或产品完全不可用；**P1** = 核心能力缺失或存在实质安全/一致性风险；**P2** = 质量、可维护性与长期成本。

---

## 0. 优先级总表

| ID | 级别 | 债务 | 关键证据 |
|---|---|---|---|
| TD-01 | P0 | 构建失败：22 个 TS 错误，`dist/` 不产出 | `npm run build` 退出码 2；`src/views/CardsView.tsx:4`、`src/utils/response.ts:46` |
| TD-02 | P0 | 前端零 CRUD、零持久化，全部业务数据硬编码 | `src/views/*.tsx`；全库 `onClick` 仅 3 处且均为筛选 |
| TD-03 | P0 | Pages 子路径配置缺失（base/路由/资源路径） | `vite.config.ts:6-28`、`src/main.tsx:9`、`index.html:5` |
| TD-04 | P0 | 无 lockfile，安装/部署脚本三套并存且互相矛盾 | `deploy.sh:7` vs `package.json:10` vs `deploy.yml:21` |
| TD-05 | P1 | 后端死代码：依赖缺失、无启动脚本、路由用内存 mock、DB 只建表 | `src/index.ts:1-6`、`src/routes/notes.ts:9`、`src/services/DatabaseService.ts:48-142` |
| TD-06 | P1 | `client/` 分叉前端与根目录源码不一致 | `client/src/views/Dashboard.tsx:5-9`、`client/src/views/NotesView.tsx:5-26` |
| TD-07 | P1 | 样式管线未配置 + Tailwind 动态类名 + 非法 focus 样式 | 无 `postcss.config.*`；`src/index.css:5,77-81`；`Dashboard.tsx:72-73` |
| TD-08 | P1 | 安全配置纸面化：JWT 占位符、无签发端、错误泄露、无最小权限部署 | `.env.example:11`、`auth.ts:29-40`、`index.ts:74-82`、`deploy.yml:26-32` |
| TD-09 | P1 | 依赖漏洞与 EOL：15 漏洞（1 high）、Storybook/lint 配置缺失 | `npm audit`、`package.json:11,46-50`、`.storybook/main.ts:1` |
| TD-10 | P1 | 零测试，文档却宣称测试覆盖 | 无 `*test*`/`*spec*`；`FINAL_REPORT.md:274` |
| TD-11 | P1 | 死交互：多个按钮无 `onClick`，无障碍宣称不成立 | `Dashboard.tsx:55-59,94-96`、`CardsView.tsx:213-222` 等 |
| TD-12 | P2 | 文档系统性夸大且与代码/时间线矛盾 | `FINAL_REPORT.md:5,377`、`PROJECT_SUMMARY.md:264-283` |
| TD-13 | P2 | 无用依赖与架构层缺失（zustand/framer/lucide 未用、无 ErrorBoundary/配置层） | `package.json:30-32`、`src/App.tsx:9-23` |
| TD-14 | P2 | 阅读器/来源锚点/AI 等产品核心概念无任何代码 | `src/types/index.ts:36,74` 仅预留字段 |

---

## 1. P0 —— 必须立即处理（阻断交付）

### TD-01 构建完全失败

- **文件路径/代码**：`src/views/CardsView.tsx:4`（`import Icon, { ..., TagIcon }`，但 `src/components/Icon.tsx:153-160` 无默认导出、无 `TagIcon`）；`src/views/Dashboard.tsx:5`、`NotesView.tsx:4` 同样默认导入失败；`src/utils/response.ts:46` 返回 `totalPages`，`src/types/index.ts:86-91` 未定义；后端文件被 `tsconfig.json:23` 纳入检查。
- **当前行为**：`npm run build` 退出码 2，22 个错误；`npx vite build` 也因 Rollup 报 `"default" is not exported by "src/components/Icon.tsx"` 失败；`dist/` 不存在。
- **风险**：CI 在构建步骤中止，Pages 无新产物；`deploy.yml:30` 的 `git add -f dist/` 会失败。文档所称"CI/CD 完成"为假。
- **建议修改方式**：修好 `Icon.tsx` 导出；`ApiResponse.pagination` 增 `totalPages?: number`；后端从前端 tsconfig 剔除或独立 workspace；按错误清单清理未使用参数/导入。
- **验收标准**：Node 26 下 `npm run build` 退出码 0；`dist/index.html` 与 `dist/assets/*` 存在；CI 构建步骤通过。

### TD-02 无数据层、无 CRUD（产品不可用）

- **文件路径/代码**：`src/views/Dashboard.tsx:8-19`（统计/活动写死）、`NotesView.tsx:9-43`（3 条）、`BookListsView.tsx:5-24`（2 条）、`CardsView.tsx:9-46`（3 条）；`src/views/NotesView.tsx:75-78` 等创建按钮无 `onClick`；全库 `grep onClick` 只有 3 处（均为筛选）。
- **当前行为**：应用是"可读的静态原型"；刷新丢失筛选，数据永远不变；没有 localStorage/IndexedDB/fetch 任何持久化或网络代码。
- **风险**：产品无法承载用户数据；所有"管理/创建/追踪"宣称不成立；统计与列表不可能一致。
- **建议修改方式**：按 `modernization-plan.md` §2 建立 IndexedDB 仓储 + zustand + CRUD 表单闭环，视图删除硬编码数组。
- **验收标准**：三模块 CRUD 可用且刷新后保留；Dashboard 数字由数据派生；E2E 覆盖笔记 CRUD。

### TD-03 GitHub Pages 子路径部署配置缺失

- **文件路径/代码**：`vite.config.ts:6-28` 无 `base`；`src/main.tsx:9` `BrowserRouter` 无 `basename`；`index.html:5` `/vite.svg` 绝对路径；`.github/workflows/deploy.yml:26-32` 强推 gh-pages。
- **当前行为**：产物默认 `/assets/...`；Pages 站点在 `/uRead/` 子路径；`BrowserRouter` 需要服务端 fallback 而 Pages 没有。
- **风险**：首页白屏/资源 404、子路由刷新 404、favicon 404。
- **建议修改方式**：`base: '/uRead/'` + `HashRouter`（或 `basename` + `404.html` 重定向）+ 相对资源路径 + 官方 Pages Action。
- **验收标准**：子路径首页与子路由直达/刷新均正常，所有静态资源 200。

### TD-04 依赖与部署脚本不一致、无 lockfile

- **文件路径/代码**：`deploy.sh:7` `npm ci`；`package.json:10` `gh-pages -d dist`；`deploy.yml:21` `npm install --legacy-peer-deps`；无锁文件（实测）。
- **当前行为**：本地 `deploy.sh` 因无 lockfile 必失败；CI 使用可变依赖；强推覆盖 `gh-pages`。
- **风险**：不可复现、部署失败难定位、无回滚能力。
- **建议修改方式**：生成并提交 lockfile（验证后已按约定删除，正式整改时需重新生成）；统一 `npm ci`；统一部署方式并声明最小权限。
- **验收标准**：干净环境 `npm ci && npm run build && npm run deploy` 成功；CI 可重复部署且无 force push。

---

## 2. P1 —— 核心风险与能力缺口

### TD-05 后端死代码

- **文件路径/代码**：`src/index.ts:1-6,51-62,100-102`；`src/middleware/auth.ts`；`src/routes/{health,notes,booklists,cards}.ts`；`src/services/DatabaseService.ts:48-142`；`.env.example`。
- **当前行为**：依赖未声明（`express` 运行时包实测不存在）；无启动脚本；路由操作内存数组（如 `notes.ts:9` `let mockNotes`）；`DatabaseService` 只建表，没有任何查询/写入被调用；前端零 `fetch`。
- **风险**：误导架构认知；被纳入 tsc 造成构建失败；一旦启用则 JWT/错误处理/CORS 全部不合格（见 SEC 报告）。
- **建议修改方式**：删除后端（推荐）或拆 workspace 补齐依赖/脚本/Repository 与认证链路。
- **验收标准**：仓库结构清楚表达技术选型；若保留 API，`/api/health` 200 且数据重启后仍在。

### TD-06 `client/` 分叉前端

- **文件路径/代码**：`client/src/App.tsx:1-25` vs `src/App.tsx:1-25`；`client/src/views/Dashboard.tsx:5-9` 用 emoji、无 Card/Button/Icon；`client/src/views/NotesView.tsx:5-26` 仅 2 条笔记且无筛选；`client/package.json:16-20` 有 `tsc && vite build` 但 `client/` 无 `tsconfig.json`；`client/vite.config.ts:9-11` 有 `/api` 代理而根配置没有。
- **当前行为**：两套代码互不引用，CI 只构建根目录；`npm run lint` 实测还会扫描 `client/src`。
- **风险**：修改遗漏、认知负担、误导性 API 代理配置。
- **建议修改方式**：删除 `client/`；如需 API 代理迁移到根 `vite.config.ts`。
- **验收标准**：仓库仅一份前端源码；文档目录结构与实际一致。

### TD-07 样式管线问题

- **文件路径/代码**：无 `postcss.config.*`；`src/index.css:1-5`（`@import` 位置错误）、`:77-81`（`ring:` 非法 CSS 属性 + `outline:none`）；`src/views/Dashboard.tsx:72-73` 模板字符串类名；`tailwind.config.js:3-6` 不覆盖 `client/src`。
- **当前行为**：Vite 构建产生 `[vite:css] @import must precede all other statements` 告警；Tailwind 工具类的生成无法确认（构建中止前无 CSS 产物）；`Button` 使用的 `focus-ring` 实际上没有可见焦点轮廓。
- **风险**：生产样式与设计稿不符；键盘无障碍失效，直接反驳 WCAG 宣称。
- **建议修改方式**：补 `postcss.config.cjs`；`@import` 置顶；完整字符串类名映射；`:focus-visible { outline: ... }`。
- **验收标准**：构建产物含 Tailwind 生成规则；卡片配色正确；Tab 导航有可见焦点。

### TD-08 安全配置纸面化

- **文件路径/代码**：`.env.example:11` 占位 JWT_SECRET；`src/middleware/auth.ts:29-40`（无算法固定、不校验用户存在）；`src/index.ts:74-82`（返回原始 error.message）；`src/index.ts:27-30` CORS + credentials；`deploy.yml:26-32` force push 且无 permissions。
- **当前行为**：无 token 签发端 → 所有 API 401；错误可能泄露内部信息；部署权限未显式声明。
- **风险**：虚假安全感；启用后端后易被绕过/信息泄露。
- **建议修改方式**：见 `security-review.md` S1–S7：密钥强校验、认证闭环、安全错误响应、CORS 校验、最小权限部署。
- **验收标准**：示例密钥无法启动服务；无敏感信息回显；部署无强推且权限最小化。

### TD-09 依赖漏洞与质量工具缺失

- **文件路径/代码**：`package.json:26-51`；实测 `npm audit` 15 漏洞（high: vite；moderate: esbuild、react-router、uuid、glob、minimatch、Storybook 包）；`package.json:11` lint 脚本无配置（实测退出码 2）；`.storybook/main.ts:1,11` 缺 `@storybook/react-vite`（实测不存在）。
- **当前行为**：`npm run lint` 与 Storybook 均不可用；依赖含 EOL 与废弃包。
- **风险**：无静态检查兜底；开发服务器漏洞；升级债务累积。
- **建议修改方式**：补 ESLint 9 配置与 Storybook framework；升级依赖并锁版本；CI 增加 lint/audit。
- **验收标准**：lint/storybook build 退出码 0；无高危漏洞；CI 检查全绿。

### TD-10 零测试

- **文件路径/代码**：仓库无 `*test*`/`*spec*`、无 vitest/jest/playwright 配置、无 `test` 脚本；`PROJECT_SUMMARY.md:209-219` 自认"预留"，但 `FINAL_REPORT.md:274` 称"测试覆盖"。
- **当前行为**：任何改动无回归保护。
- **风险**：2.0 数据层与升级改造风险极高；文档可信度受损。
- **建议修改方式**：Vitest + RTL + fake-indexeddb + Playwright 三层；CI 强制运行。
- **验收标准**：三条黄金路径 E2E 通过；覆盖率有基线且不下降。

### TD-11 死交互与无障碍缺失

- **文件路径/代码**：`src/views/Dashboard.tsx:55-59,94-96`（播放/查看全部按钮）；`NotesView.tsx:160-164`（编辑）、`:75-78`（新建）；`BookListsView.tsx:30-32` + `BookListCard.tsx:52`；`CardsView.tsx:83-86,213-222,240-252`；`Navbar.tsx:58-67`（搜索/通知图标按钮无名称）；`src/index.css:77-81`。
- **当前行为**：这些按钮点击无反应；图标按钮无 `aria-label`；`focus-ring` 失效。
- **风险**：核心操作不可用；WCAG 2.1 AA 宣称不成立。
- **建议修改方式**：绑定真实动作或移除；补 `aria-label` 与可见 focus 样式。
- **验收标准**：所有可见控件有可观察行为；键盘可达且焦点可见。

---

## 3. P2 —— 长期质量与文档债务

### TD-12 文档与实现严重脱节

- **文件路径/代码**：`README.md:36-73`（PDF/EPUB 导入、AI 推荐、协作、Docker 等）；`FINAL_REPORT.md:5,274,299,374`（全部完成/测试覆盖/最后更新 2024-03-06）；`SHOWCASE.md:25-65` 的组件 props 与真实组件接口不符（如 `NoteCard` 的 `readingProgress`、`KnowledgeCard` 的 `importance`/`connections` 在 `src/components/*.tsx` 中不存在）；`PROJECT_SUMMARY.md:264-283` 又把 CRUD/持久化列为未完成。
- **当前行为**：文档之间自相矛盾，且与实际提交历史（3 次，2026-04-03）不符。
- **风险**：升级决策基于错误基线；用户/贡献者被误导。
- **建议修改方式**：以 `functionality-matrix.md` 为唯一事实源重写 README；每个 ✅ 附可运行验证命令；删除过期"完成报告"或改标为历史文档。
- **验收标准**：README 状态与代码一致；无无法验证的完成声明。

### TD-13 无用依赖与缺失的架构层

- **文件路径/代码**：`package.json:30-32` zustand/lucide-react/framer-motion 全仓无 import（`Icon.tsx:7` 注释明确走自绘 SVG）；`package.json:43` gh-pages 与 workflow 重复；`src/App.tsx:9-23` 无 ErrorBoundary/懒加载；`src/main.tsx` 无全局错误处理；前端无 `import.meta.env` 配置层。
- **当前行为**：安装负担与漏洞面增加；异常直接白屏；未来接 API/AI 无配置入口。
- **风险**：升级成本、故障体验差。
- **建议修改方式**：清理或落地依赖；加 ErrorBoundary、路由懒加载、`src/config.ts` 环境配置层。
- **验收标准**：无未使用依赖；人为抛错显示回退 UI；配置集中管理。

### TD-14 产品核心概念无代码载体

- **文件路径/代码**：`src/types/index.ts:36` 仅 `position?: number`；`:74` 仅 `confidence?: number`；`src/views/NotesView.tsx:159` 只显示"第 N 页"；`CardsView.tsx:184` `sourceBook` 为字符串。
- **当前行为**：阅读器、来源锚点、AI Studio、知识网络均不存在。
- **风险**：2.0 愿景若无数据模型先行，容易再次沦为空壳页面。
- **建议修改方式**：在 S1/S2 先定义 `SourceRef` 与 `suggestions` 数据模型（见 `modernization-plan.md` §3–§5），再实现 UI。
- **验收标准**：类型定义落地且有对应仓储与 E2E；AI 建议可溯源且需人工确认。

---

## 4. 偿还顺序建议

1. **S0（1–2 天）**：TD-01、TD-03、TD-04 → 让构建与子路径部署跑通（同时删除 `client/` 与后端或隔离，解决 TD-05/TD-06 的构建面）。
2. **S1（2–4 周）**：TD-02、TD-11 → 数据层 + CRUD + 真实统计 + 无障碍交互。
3. **S2（持续）**：TD-07、TD-09、TD-10 → 样式、lint/storybook、测试体系与依赖升级。
4. **S3**：TD-08、TD-14 → 安全闭环与阅读器/锚点、AI 数据模型。
5. **S4**：TD-12、TD-13 → 文档重写与架构清理，随 React 19/Vite 8/Node 26 升级收尾。
