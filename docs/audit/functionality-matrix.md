---
type: docs
title: 功能矩阵
weight: 10
menus:
  main:
    parent: audit
    weight: 10
description: "本文件是 Stage 0 的审计快照：上面各表记录的是 2026-11-16 审计当时读到的代码，"
---

> **历史时点快照（2026-11-16）**：本文件记录的是审计当天的代码状态，其中部分问题已修复。
> 当前状态以 `docs/PROJECT-STATUS.md` 与 `docs/audit/current-state.md` 为准；不要把这里当成待办清单。


> 审计日期：2026-11-16
> 审计方式：静态代码审计 + 实际构建验证（源码逐文件阅读；`npm install --legacy-peer-deps` + `npm run build` 实测；GitHub API 复核提交历史）
> 未验证项：真实浏览器交互、线上部署页面的路由刷新行为、GitHub Actions 实际运行结果、后端服务真实启动（依赖缺失，未安装后端依赖）。
> 说明：本表只采信代码与配置事实。`README.md` / `FINAL_REPORT.md` / `PROJECT_SUMMARY.md` / `SHOWCASE.md` / `DEMO.md` 中的「✅ 已完成」「全部完成并可用」等措辞属于文档宣称，不等于已实现。

---

## 一、总览

| 宣称来源 | 宣称内容 | 真实实现状态 | 证据（文件:行号） |
|---|---|---|---|
| README.md:36-52 | 读书笔记：多格式导入（PDF/EPUB/Markdown）、智能标注高亮、标签分类与搜索、跨书籍关联 | **未实现**（仅静态展示 3 条中文示例笔记） | `src/views/NotesView.tsx:9-43`、`src/components/NoteCard.tsx` 无 file input、无 parser 依赖；全仓 `grep -rnE "localStorage|indexedDB|fetch\(|axios"` 无前端命中 |
| README.md:42-46 | 书单：个人书单管理、协同编辑、阅读进度跟踪、AI 推荐 | **未实现**（仅 2 条硬编码书单，无新增/编辑/删除，无协作者 UI，无 AI/推荐代码） | `src/views/BookListsView.tsx:5-24`、`src/components/BookListCard.tsx`；`onClick` 全仓仅 3 处且均为筛选 |
| README.md:48-52 | 知识卡片：原子化提取、智能生成、自动关联网络、多种导出 | **未实现**（3 张硬编码卡片，`connections` 为写死数字 3/5/2） | `src/views/CardsView.tsx:9-46`、`src/views/CardsView.tsx:102` |
| FINAL_REPORT.md:5,374 | 「全部完成并可用」「功能完整」 | **与代码不符** | 见本表各行；`src/App.tsx:14-19` 仅 4 条静态路由，无数据层 |
| FINAL_REPORT.md:274 | 「质量保障：类型安全 + 代码检查 + 测试覆盖」 | **类型检查当前失败**；无 ESLint 配置；零测试文件 | 构建实测见 `dependency-review.md`；`find` 无 `.eslintrc*`/`eslint.config.*`、无 `*test*`/`*spec*` 文件 |
| FINAL_REPORT.md:299 / SHOWCASE.md:299 等 | WCAG 2.1 AA 无障碍支持 | **未达标**（无 `aria-label`，图标按钮无可读名称；`focus-ring` CSS 属性非法且同时 `outline:none`） | `src/index.css:77-81`、`src/components/Button.tsx:18`、`src/components/Navbar.tsx:58-67`、`src/views/CardsView.tsx:213-222` |
| README.md:63-67 / FINAL_REPORT.md:172-189 | 后端 Express + SQLite REST API、CI/CD 自动部署 | 后端源码存在但**完全断开且不可运行**：依赖不在 package.json、无启动脚本、路由用内存 mock、前端零 fetch | `src/index.ts:1-6`, `src/index.ts:100-102`, `src/routes/notes.ts:9`, `package.json:6-51` |
| FINAL_REPORT.md:220 / SHOWCASE.md:220 | Storybook 组件文档系统 | **配置存在但依赖缺失**：`.storybook/main.ts:1,11` 依赖 `@storybook/react-vite`，`package.json` 未声明 | `.storybook/main.ts:1-14`、`package.json:46-50` |
| README.md:69-73 | GitHub Pages / Vercel / Netlify / Docker / 自托管 | 仅 GitHub Pages workflow 存在，且子路径部署配置缺失（见 `architecture-review.md`） | `vite.config.ts:6-28`（无 `base`）、`.github/workflows/deploy.yml` |

---

## 二、按模块逐项核对

### 2.1 Dashboard（`src/views/Dashboard.tsx`）

| 宣称功能 | 真实状态 | 证据 | 当前行为 | 风险 | 建议修改方式 | 验收标准 |
|---|---|---|---|---|---|---|
| 学习概览统计（笔记 23 / 卡片 45 / 书单 8 / 阅读 127h） | 仅静态数字 | `Dashboard.tsx:8-13` | 每次渲染都显示同样数值，与用户数据无关；`trend` +5/+12/+2/+15h 同样写死 | 用户产生任何数据后数字不变，属于误导性 UI | 接入统一数据仓库（2.0 用 IndexedDB），以派生 selector 计算 `notes.length` 等；空数据态显示 0 或引导 | 新建一条笔记后，仪表板「读书笔记」计数 +1；删除后 -1；有 E2E 用例覆盖 |
| 最近活动 | 仅静态 3 条 | `Dashboard.tsx:15-19` | 写死标题/时间（"2小时前"） | 与真实行为脱节 | 由实体 `updatedAt` 排序生成 | 操作后最近活动首项变为刚编辑的实体 |
| 快速操作「新建笔记/创建卡片/管理书单」 | 仅路由跳转（`<Link>`），不创建任何东西 | `Dashboard.tsx:21-25,126-145` | 点击 "新建笔记" 只是跳到 `/notes` 列表页，没有打开表单 | 文案与行为不符；用户无法完成创建 | 跳转到带 `?new=1` 的路由或直接打开创建抽屉/表单 | 点击后可见可提交的表单；提交后列表与统计更新 |
| Hero 区播放按钮 / 「查看全部」按钮 | 无 `onClick` | `Dashboard.tsx:55-59,94-96` | 点击无反应 | 死交互，降低信任度 | 绑定真实动作或移除/禁用 | 所有可见按钮均有可观察行为或被明确禁用 |
| 学习路径 | 静态 4 步 | `Dashboard.tsx:160-174` | 纯展示 | 低（展示型内容可接受） | 可保留为引导内容，但标注为介绍性内容 | — |
| 统计卡片颜色 `bg-${stat.color}-100` | Tailwind 无法静态提取 | `Dashboard.tsx:72-73` | 生产 CSS 中这些动态拼接的 class 不会被生成，卡片图标底色/文字色丢失 | 视觉与设计稿不一致 | 改为完整 class 字符串映射表（`color: 'bg-blue-100 text-blue-600'`） | 构建产物 CSS 中包含对应颜色规则 |

### 2.2 NotesView（`src/views/NotesView.tsx`）

| 宣称功能 | 真实状态 | 证据 | 当前行为 | 风险 | 建议修改方式 | 验收标准 |
|---|---|---|---|---|---|---|
| 多类型筛选（全部/高亮/笔记/总结） | **部分实现**：仅对本地 mock 数组做 `filter` | `NotesView.tsx:7,45-52,85-95` | 切换标签会改变列表，但数据集永远是初始 3 条；刷新后回到默认 | 被误认为支持真实数据检索 | 让 filter 作用于仓库数据，并持久化筛选条件（URL query） | 新建一条 `highlight` 后切到「高亮」可见该条 |
| 阅读进度可视化 | 静态字符串 | `NotesView.tsx:19,30,41,133-137` | 进度条宽度来自写死的 `'85%'` 字符串 | 无真实阅读跟踪 | 由阅读器事件计算 `position / totalPositions` | 阅读进度变化后进度条同步变化 |
| 标签分类 | 静态渲染 | `NotesView.tsx:142-148` | 标签仅展示，点击无筛选/跳转 | 不可交互的「标签系统」 | 标签点击触发 `setFilter` 或路由过滤 | 点击标签后列表收窄 |
| 「新建笔记」按钮 / 空态「创建笔记」 | **无 onClick** | `NotesView.tsx:75-78,178-181` | 点击无反应；由于 mock 永远有 3 条，空态实际不可达 | 核心 CRUD 缺失 | 打开表单 → 写入 IndexedDB → 刷新列表 | 可新建/编辑/删除并持久化，刷新后仍存在 |
| 编辑（铅笔图标）按钮 | 无 `onClick` | `NotesView.tsx:160-164` | 无反应 | 死交互 | 绑定编辑表单 | 编辑后内容更新且 `updatedAt` 变化 |
| 跨书籍关联 / 高亮锚点 | 无 | `Note` 类型有 `position?: number`（`src/types/index.ts:36`）但 UI 仅显示「第 N 页」，无点击定位、无来源锚点 | 无法实现「从笔记回到原文」 | 产品核心价值缺失 | 2.0 引入 sourceRef（bookId + locator + quote），阅读器支持锚点跳转 | 点击笔记来源可定位到原文位置 |

### 2.3 BookListsView（`src/views/BookListsView.tsx`）

| 宣称功能 | 真实状态 | 证据 | 当前行为 | 风险 | 建议修改方式 | 验收标准 |
|---|---|---|---|---|---|---|
| 书单列表 | 2 条硬编码 | `BookListsView.tsx:5-24` | 使用 `useState` 初始化但无任何 setter 调用，数据不可变 | 与真实数据无关 | 接入仓库 | 新建书单后列表出现 |
| 新建书单 | **无 onClick** | `BookListsView.tsx:30-32` | 点击无反应 | 核心功能缺失 | 表单 + 仓库写入 | 可创建并持久化 |
| 查看详情（BookListCard） | **无 onClick** | `src/components/BookListCard.tsx:52` | 无反应 | 死交互 | 路由到 `/booklists/:id` 详情 | 点击后显示该书单内书籍 |
| 协同编辑 / 协作者头像 | 无 | 仅后端 mock 有 `collaborators: []`（`src/routes/booklists.ts:19`），前端无 | 未实现 | 文档过度宣称 | 2.0 若做需后端与权限模型；否则从文档移除 | — |

### 2.4 CardsView（`src/views/CardsView.tsx`）

| 宣称功能 | 真实状态 | 证据 | 当前行为 | 风险 | 建议修改方式 | 验收标准 |
|---|---|---|---|---|---|---|
| 标签过滤 | **部分实现** | `CardsView.tsx:7,48-49,116-141` | 对 3 条 mock 卡片生效 | 同上 | 作用于真实数据 | 新建卡片后标签计数变化 |
| 统计（总数/标签/关联） | 从 mock 派生 | `CardsView.tsx:93-104` | 数字随 mock 固定为 3 / N / 10 | 误导性统计 | 派生自仓库 | 增删卡片后统计同步 |
| 「创建卡片」按钮 / FAB / 空态按钮 | **无 onClick** | `CardsView.tsx:83-86,240-243,248-252` | 全部无反应；FAB 甚至没有可访问名称 | 核心功能缺失 + 无障碍问题 | 打开创建表单；给 FAB 加 `aria-label` | 可创建卡片并持久化 |
| 卡片关联（connections 3/5/2）与关联按钮 | 数字写死；关联图标按钮无 onClick | `CardsView.tsx:19,31,44,206-222` | 无法建立/查看真实关联 | 「知识网络」不存在 | 用 `relatedCards: string[]` 存储，提供关联选择器与力导向图（2.0） | 两张卡片可互相关联并在详情中查看 |
| 来源书籍追踪 | 仅字符串展示 | `CardsView.tsx:184` | `sourceBook` 是写死文本，无来源跳转/锚点 | 与产品「来源锚点」愿景不符 | 2.0 存 `sourceRef` 并可跳转 | 点击来源可回到原文段落 |
| 导入 `TagIcon` | **该导出不存在** | `CardsView.tsx:4` 引用 `TagIcon`；`src/components/Icon.tsx:153-160` 仅导出 6 个图标 | 直接导致 TS 编译错误（见构建验证） | 阻断构建 | 在 Icon.tsx 增加 TagIcon 导出或改用现有图标 | `npm run build` 通过 |

### 2.5 后端与数据层（"可选后端"宣称）

| 宣称功能 | 真实状态 | 证据 | 当前行为 | 风险 | 建议修改方式 | 验收标准 |
|---|---|---|---|---|---|---|
| Express REST API | 源码存在但**无法启动** | `src/index.ts:1-6` 引入 express/cors/helmet/compression/morgan/dotenv；`package.json:26-51` 无这些依赖；无 `start:server` 脚本 | `npm run dev` 只启动 Vite 前端；后端从未运行 | 死代码，维护误导 | 删除后端或拆为独立 workspace 并补齐依赖/脚本 | 有可执行的启动脚本与健康检查返回 200 |
| JWT 认证中间件 | 代码存在但无签发端 | `src/middleware/auth.ts`；`src/routes/*.ts` 全部套 `authenticateToken`；无 login/register 路由 | 任何请求都拿不到 token → 所有 API 路由返回 401 | 功能不可用 | 补 auth 路由与用户表读写，或改为纯本地方案 | 可注册/登录并访问受保护接口 |
| SQLite 持久化 | **只建表，不读写** | `src/services/DatabaseService.ts:48-142` 有 5 张表 + 索引；`src/routes/notes.ts:9` 等使用内存数组，`DatabaseService` 仅被 `src/index.ts:18,43` 初始化 | 服务重启后所有 API 数据丢失 | 数据不可信 | 路由改为调用 Repository（参数化查询） | 重启后数据仍在 |
| 前后端联通 | **零联通** | 前端无 `fetch`/axios；`client/vite.config.ts:9-11` 才有 `/api` 代理但根目录 `vite.config.ts` 没有 | 前端完全离线 mock | 「全栈应用」宣称不成立 | 2.0 明确选型：纯本地 IndexedDB 或真正前后端分离 | 前端能读到后端返回的数据 |
| users 表与认证 | 表存在但无注册逻辑 | `DatabaseService.ts:50-57`；无 users 路由 | — | — | 同上 | — |

### 2.6 工程与质量宣称

| 宣称功能 | 真实状态 | 证据 | 风险 | 建议修改方式 | 验收标准 |
|---|---|---|---|---|---|
| `npm run lint` 可用 | 脚本存在但**无 ESLint 配置文件** | `package.json:11`；`find` 未发现 `.eslintrc*`/`eslint.config.*` | ESLint 8 无配置会报错退出；CI 未运行 lint | 补 `eslint.config.js`（或 `.eslintrc.cjs`）与 typescript-eslint；CI 增加 lint 步骤 | `npm run lint` 退出码 0 |
| 单元测试 / E2E | **零测试文件零配置** | `find` 无 `*test*`/`*spec*`；`package.json` 无 vitest/jest/playwright；`PROJECT_SUMMARY.md:209-219` 标注「预留」 | 无回归保护 | 建立 Vitest + RTL + Playwright 三层测试 | CI 运行测试并生成覆盖率 |
| Storybook | 缺依赖 | `.storybook/main.ts:1,11` 需 `@storybook/react-vite`，`package.json:46-50` 未列；另有 `@storybook/testing-library@^0.2.0`（已废弃行） | `npm run storybook` 预期失败（未实测） | 补齐并升级至与 React 19/Vite 8 兼容的 Storybook 版本 | `npm run build-storybook` 成功 |
| `npm run deploy` / `deploy.sh` | 不一致且不可靠 | `package.json:10` 用 gh-pages；`deploy.sh:7` 用 `npm ci` 但无 lockfile；workflow 用 `npm install` + 强推 | 本地一键部署必然失败；CI 部署无锁文件不可复现 | 统一为 lockfile + `npm ci` + 官方 `actions/deploy-pages` | 本地与 CI 均可重复部署成功 |
| 代码重复/分叉 | `client/` 与根目录 `src/` 是两套分叉前端 | `client/src/views/Dashboard.tsx:5-9` 用 emoji 图标且无 Card/Button/Icon；`client/src/views/NotesView.tsx:5-26` 仅 2 条笔记（根目录 3 条），且无筛选；`client/package.json` 为独立包 | 修改易漏改一处；`client/` 无 `tsconfig.json` | 删除 `client/` 或合并为 workspace 单一来源 | 仓库内只有一份前端源码 |
| 提交历史 | 3 次提交，均 2026-04-03 | GitHub API 复核：`26513ca` Initial、`1aee8c8` Trigger deployment、`ef1ae4e` Fix deployment；分支 `main` + `gh-pages` | 迭代痕迹极浅，文档所称「多年迭代」无依据 | — | — |

---

## 三·补 复核与销账（滚动更新）

本文件是 **Stage 0 的审计快照**：上面各表记录的是 2026-11-16 审计当时读到的代码，
不会因为后续修复而改写——否则就看不出「当初到底错在哪」。已闭环的条目在这里登记，
每条都给了能当场跑的复核命令。

| 审计条目 | 现状 | 版本 | 复核方式 |
| --- | --- | --- | --- |
| 仪表板统计是写死的数字 | 已改为从 IndexedDB 派生（`computeStats`），空库显示 0 与引导 | 0.4.0 | `npm test -- tests/data/repository.test.ts` |
| 「最近活动」写死 3 条 | 已改为按真实笔记排序取前 5 条 | 0.4.0 | `src/views/Dashboard.tsx`（`recentNotes`） |
| 快速操作「新建笔记/创建卡片/管理书单」只跳转不创建 | 已满足：`?new=1` 落地即展开可提交表单 | 0.6.0 | `npm test -- tests/views/pages.test.tsx` |
| Hero 播放按钮 / 「查看全部」无 `onClick` | 两处死按钮已删除；新增**全站**不变量：按钮没有 `onClick` 又不是提交按钮即红灯 | 0.4.0 删除，0.6.0 加护栏 | `npm test -- tests/data/ui-invariants.test.ts` |
| 统计卡片颜色 `bg-${color}-100` 无法被 Tailwind 提取 | 已改为完整 class 字符串 | 0.4.0 | `grep -rn 'bg-\${' src/` 无结果 |
| 书单列表硬编码、新建书单无 `onClick` | 已接入仓储，可创建并持久化 | 0.3.0 | `npm test -- tests/views/pages.test.tsx` |
| 书单「查看详情」无 `onClick`，应显示该书单内书籍 | **部分满足**：卡片上新增「管理书目」，可勾选资料库内容并持久化，数量随写盘变化；**没有** `/booklists/:id` 详情路由 | 0.6.0 | `npm test -- tests/views/pages.test.tsx` |
| 全站搜索缺失 | 已实现 `/search?q=`，且结果跳转带词、四个列表页同认 `?q=` | 0.4.0 / 0.6.0 | `npm test -- tests/views/pages.test.tsx` |
| 本地无持久化、无 CRUD、无导出 | 已实现 IndexedDB 仓储、CRUD、JSON/Markdown 导出导入 | 0.3.0 / 0.5.0 | `npm test -- tests/data/repository.test.ts` |
| 认证 / 登录 | 本仓库不做认证（本地优先、无后端，数据只存在本机浏览器）；模型与检索凭据一律留在 uAI Core 服务端 | — | `README.md` 现状表的 ⛔ 行 |

**仍然未实现**（不要当作可用能力）：PDF/EPUB 解析与渲染、云端同步、撤销与回收站、
表单草稿保留（切换页面即丢失）、AI 摘要与推荐、`/booklists/:id` 详情路由。

---

## 三、矩阵结论

1. **真实可工作的功能**仅：4 个静态路由与导航、Notes/Cards 的客户端筛选、静态卡片/统计展示。
2. **无任何持久化、无 CRUD、无阅读器、无来源锚点、无 AI、无导出、无协作、无搜索、无认证可用链路**。
3. 文档（尤其 `FINAL_REPORT.md`、`README.md`、`SHOWCASE.md`、`DEMO.md`）系统性夸大完成度；`PROJECT_SUMMARY.md:264-283` 反而把 CRUD、持久化、认证列为 v1.0 未完成项，文档之间自相矛盾。
4. 2.0 升级应从「建立可工作的垂直切片」（数据层 CRUD + 阅读器锚点 + 卡片）开始，而不是继续补文档或堆砌依赖。
