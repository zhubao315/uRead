---
type: docs
title: 依赖审计
weight: 40
menus:
  main:
    parent: audit
    weight: 40
description: "退出码：0。真实输出（省略重复的弃用告警行后保留关键内容）："
---

> **历史时点快照（2026-11-16）**：本文件记录的是审计当天的代码状态，其中部分问题已修复。
> 当前状态以 `docs/PROJECT-STATUS.md` 与 `docs/audit/current-state.md` 为准；不要把这里当成待办清单。


> 审计日期：2026-11-16
> 审计方式：静态代码审计 + 实际构建验证（在本机真实执行依赖安装、构建、lint、审计命令；逐字记录输出）
> 未验证项：真实浏览器行为、Pages 部署后路由刷新、GitHub Actions 实跑结果、Storybook 构建（仅通过依赖存在性静态判定，未执行 `build-storybook`）。
> 重要说明：验证过程中 `npm install` 自动生成了 `package-lock.json`，`npx vite build` 未产生 `dist/`（构建失败）。为遵守"只新增 docs/audit/ 文件、不改动仓库既有内容"的要求，验证结束后已删除生成的 `package-lock.json`；仓库恢复到无 lockfile 的原始状态。

---

## 1. 验证环境

| 项 | 值 |
|---|---|
| 工作目录 | `/oc/upstream/uRead`（GitHub `zhubao315/uRead` main 分支解压，无 `.git`） |
| Node.js | `v26.13.0` |
| npm | `11.20.0` |
| 仓库锁文件 | 无 `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`（`ls` 三者均报 No such file or directory） |
| 上游提交 | GitHub API 复核：3 次提交，均 2026-04-03；最新 `ef1ae4e752b8d72d4863ae1993fa07dc461a4654` |

---

## 2. 真实命令输出（逐字记录）

### 2.1 `npm install --legacy-peer-deps`（workflow 同款命令）

退出码：`0`。真实输出（省略重复的弃用告警行后保留关键内容）：

```
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. ...
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities ...
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported. ...
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities ...
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support ...
npm warn deprecated glob@7.2.3: ...

added 622 packages, and audited 623 packages in 4m

161 packages are looking for funding
  run `npm fund` for details

15 vulnerabilities (14 moderate, 1 high)

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn install-scripts   esbuild@0.18.20 (postinstall: node install.js)
npm warn install-scripts
npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
```

结论：安装本身成功，但**带 15 个已知漏洞与多条 EOL 告警**；npm v11 还提示 `esbuild` 的安装脚本未被允许（与 `--legacy-peer-deps` 无关，属 npm 11 新行为）。

### 2.2 `npm run build`（等价于 `tsc && vite build`）

退出码：**2（失败）**。完整真实输出：

```
> uread@0.1.0 build
> tsc && vite build

src/App.tsx(1,1): error TS6133: 'React' is declared but its value is never read.
src/index.ts(2,18): error TS2307: Cannot find module 'cors' or its corresponding type declarations.
src/index.ts(3,20): error TS2307: Cannot find module 'helmet' or its corresponding type declarations.
src/index.ts(4,25): error TS2307: Cannot find module 'compression' or its corresponding type declarations.
src/index.ts(5,20): error TS2307: Cannot find module 'morgan' or its corresponding type declarations.
src/index.ts(66,24): error TS6133: 'req' is declared but its value is never read.
src/index.ts(74,31): error TS6133: 'req' is declared but its value is never read.
src/index.ts(74,76): error TS6133: 'next' is declared but its value is never read.
src/middleware/auth.ts(2,17): error TS2307: Cannot find module 'jsonwebtoken' or its corresponding type declarations.
src/middleware/auth.ts(52,3): error TS6133: 'res' is declared but its value is never read.
src/middleware/auth.ts(74,47): error TS18046: 'error' is of type 'unknown'.
src/routes/health.ts(6,18): error TS6133: 'req' is declared but its value is never read.
src/services/DatabaseService.ts(1,21): error TS2307: Cannot find module 'sqlite3' or its corresponding type declarations.
src/services/DatabaseService.ts(2,32): error TS2307: Cannot find module 'sqlite' or its corresponding type declarations.
src/utils/response.ts(46,9): error TS2353: Object literal may only specify known properties, and 'totalPages' does not exist in type '{ page: number; limit: number; total: number; hasMore: boolean; }'.
src/utils/response.ts(59,11): error TS6133: 'statusCode' is declared but its value is never read.
src/views/CardsView.tsx(4,8): error TS1192: Module '"/oc/upstream/uRead/src/components/Icon"' has no default export.
src/views/CardsView.tsx(4,8): error TS6133: 'Icon' is declared but its value is never read.
src/views/CardsView.tsx(4,51): error TS2305: Module '"../components/Icon"' has no exported member 'TagIcon'.
src/views/Dashboard.tsx(5,8): error TS1192: Module '"/oc/upstream/uRead/src/components/Icon"' has no default export.
src/views/NotesView.tsx(4,8): error TS1192: Module '"/oc/upstream/uRead/src/components/Icon"' has no default export.
src/views/NotesView.tsx(4,8): error TS6133: 'Icon' is declared but its value is never read.
```

共 **22 个 TypeScript 错误**；`tsc` 失败后 `vite build` 根本未执行，`dist/` 未生成。按类别归类：

| 类别 | 数量 | 典型错误 |
|---|---|---|
| 后端依赖未声明（TS2307） | 6 | `cors`/`helmet`/`compression`/`morgan`/`jsonwebtoken`/`sqlite3`/`sqlite` 缺失 |
| `noUnusedLocals`/`noUnusedParameters`（TS6133） | 9 | 未使用的 `React` 导入、未使用的 `req`/`next`/`res`、`statusCode` |
| 前端模块导出不匹配（TS1192/TS2305） | 4 | `Icon.tsx` 无默认导出、无 `TagIcon` |
| 类型定义不一致（TS2353） | 1 | `totalPages` 不在 `ApiResponse.pagination` 中 |
| strict catch 类型（TS18046） | 1 | `error.message`（unknown） |

注意：`express` 本身没有报 TS2307，是因为 `@types/express@4.17.25` 被 Storybook 等**传递依赖**带入；但运行时包 `express` 在 `node_modules` 中**不存在**（已核实），后端依旧无法启动。这属于"偶然可编译"，不能视为依赖声明正确。

### 2.3 `npx vite build`（绕过 tsc 的补充验证）

退出码：**1（失败）**。关键真实输出：

```
vite v4.5.14 building for production...
[vite:css] @import must precede all other statements (besides @charset or empty @layer)
3  |  @tailwind utilities;
4  |
5  |  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
   |   ^
6  |
7  |  .font-inter {
✓ 43 modules transformed.
✓ built in 236ms
"default" is not exported by "src/components/Icon.tsx", imported by "src/views/Dashboard.tsx".
error during build:
RollupError: "default" is not exported by "src/components/Icon.tsx", imported by "src/views/Dashboard.tsx".
```

即使跳过 `tsc`，Rollup 仍因同一个 `Icon` 默认导出错误失败；`dist/` 未生成。同时暴露 CSS 问题：`src/index.css:5` 的 `@import` 位于 `@tailwind` 指令之后，违反 CSS 语法规则。由于构建未产出 CSS，无法直接检查 Tailwind 工具类是否生成；但仓库确认无 `postcss.config.*`，Vite 不会自动加载 Tailwind 插件，属于高置信度静态推断（见 D4）。

### 2.4 `npm run lint`

退出码：**2（失败）**。真实输出：

```
> uread@0.1.0 lint
> eslint . --ext .ts,.tsx

Oops! Something went wrong! :(

ESLint: 8.57.1

ESLint couldn't find a configuration file. To set up a configuration file for this project, please run:

    npm init @eslint/config

ESLint looked for configuration files in /oc/upstream/uRead/client/src and its ancestors. ...
```

即 `package.json:11` 的 lint 脚本从未可用；顺带证明 ESLint 会扫描到 `client/` 分叉目录。

### 2.5 `npm audit --json`（摘要）

```
metadata.vulnerabilities = { "info":0, "low":0, "moderate":14, "high":1, "critical":0, "total":15 }
```

高风险项为 `vite`（`<=5.4.19` 系列公告：中间件提供与 public 目录同名文件、`server.fs` 未作用于 HTML、Windows 反斜杠绕过、优化依赖 `.map` 路径遍历、launch-editor 命令注入等）。中风险包括 `esbuild`（开发服务器可被任意站点读取响应）、`react-router`/`react-router-dom`（`<Link>`/`useNavigate` 开放重定向、SSR 反序列化注入）、`uuid`（v3/v5/v6 缓冲区边界）、`glob`/`minimatch`，以及 8 个 Storybook 相关包。

---

## 3. 依赖问题清单

### D1【P0】构建被 22 个 TS 错误阻断，`npm run build` 与 CI 均不可用

- **文件路径/代码**：见 §2.2 完整错误列表；关键位置 `src/components/Icon.tsx:153-160`、`src/views/CardsView.tsx:4`、`src/utils/response.ts:46`、`src/types/index.ts:86-91`。
- **当前行为**：`tsc` 失败 → `vite build` 不执行 → 无 `dist/` → workflow 的 `git add -f dist/`（`deploy.yml:30`）会因找不到路径失败。
- **风险**：任何 push 都无法产出可部署页面；README/报告中的"构建优化、CI/CD 完成"全部失效。
- **建议修改方式**：按错误列表逐项修复；把后端文件移出前端 `tsconfig.json` 的 `include`；给 `ApiResponse.pagination` 增加 `totalPages?: number`；给 `Icon.tsx` 增加默认导出和 `TagIcon`；用 `_req`/`_next` 命名未使用参数或关闭对应严格检查（不推荐关闭）。
- **验收标准**：`npm run build` 退出码 0，`dist/index.html` 与 `dist/assets/*` 存在；CI 构建步骤通过。

### D2【P0】后端运行时依赖完全未声明

- **文件路径/代码**：`src/index.ts:1-6` 需要 `express, cors, helmet, compression, morgan, dotenv`；`src/middleware/auth.ts:2` 需要 `jsonwebtoken`；`src/routes/*.ts:4` 需要 `uuid`；`src/services/DatabaseService.ts:1-2` 需要 `sqlite3, sqlite`；`package.json:26-51` 一项都没有。
- **当前行为**：实测 `node_modules/express` 不存在；`dotenv@16.6.1`、`uuid@9.0.1`、`@types/express@4.17.25` 只是 Storybook 等的传递依赖。`src/index.ts:100-102` 还用 CJS 的 `require.main === module` 与 ESM 配置冲突。
- **风险**：后端无法启动；依赖版本完全由其他包的传递关系决定，随时可能消失；类型检查靠运气通过。
- **建议修改方式**：删除后端（推荐，2.0 用本地 IndexedDB）或独立 workspace 并显式声明全部运行/类型依赖 + 启动脚本；`tsconfig` 分离。
- **验收标准**：`node_modules` 中每个被 import 的包都由本包直接声明；后端可启动并返回 `/api/health` 200（若保留）。

### D3【P0】无 lockfile 且安装方式三套并存

- **文件路径/代码**：根无锁文件；`package.json:10` 用 gh-pages CLI；`deploy.sh:7` 用 `npm ci`；`.github/workflows/deploy.yml:21` 用 `npm install --legacy-peer-deps`。
- **当前行为**：本地 `deploy.sh` 的 `npm ci` 在无 lockfile 时必然失败；CI 每次解析 `^` 到不同版本（本次安装得到 Vite `4.5.14`、ESLint `8.57.1` 等）。
- **风险**：不可复现；无法锁定漏洞修复版本；部署脚本自相矛盾。
- **建议修改方式**：在目标 Node（26）下生成并提交 `package-lock.json`，全部改用 `npm ci`；删除 `--legacy-peer-deps`，用显式版本解决 peer 冲突。
- **验收标准**：两次 `rm -rf node_modules && npm ci && npm run build` 结果一致；脚本中不再出现 `npm install`/`--legacy-peer-deps`。

### D4【P1】样式工具链未配置，CSS 规则可能不生成

- **文件路径/代码**：无 `postcss.config.*`；`src/index.css:1-5` 有 `@tailwind` 与位置错误的 `@import`；`tailwind.config.js:3-6` 只覆盖 `./src`；`src/views/Dashboard.tsx:72-73` 动态拼接类名。
- **当前行为**：Vite 直接构建时输出 CSS 语法告警（§2.3），且构建因 Icon 错误中止，无法验证产物 CSS；Tailwind 插件未配置属高置信度推断。
- **风险**：生产页面失去所有 Tailwind 工具类，只剩自定义 CSS → 与设计稿完全不同；动态类名无论如何都不会生成。
- **建议修改方式**：`postcss.config.cjs` = `{ plugins: { tailwindcss: {}, autoprefixer: {} } }`；`@import` 移到文件最顶部；动态类名改完整字符串映射。
- **验收标准**：`dist/assets/*.css` 中存在 `.bg-blue-600`、`.grid` 等生成规则；统计卡片有正确配色；构建无 CSS 告警。

### D5【P1】依赖版本陈旧且存在已知漏洞

- **文件路径/代码**：`package.json:26-51`；`npm audit` 实测 15 个漏洞（1 high / 14 moderate）。
- **当前行为**：React 18.2、Vite 4.5.14、TS 5.1、Tailwind 3.3、Storybook 7.4、ESLint 8.57（EOL）、`@storybook/testing-library@0.2`（废弃）、`@chromatic-com/storybook@1.0`。
- **风险**：high 项 vite 涉及开发服务器文件泄露与路径遍历；react-router 的开放重定向影响现有 `<Link>`；开发工具链 EOL 无安全更新。
- **建议修改方式**：按 `modernization-plan.md` §6 分两批升级；先升到各主版本内最新补丁并用 lockfile 固定，再迁移 React 19/Vite 8/Node 26；CI 加 `npm audit --audit-level=high`。
- **验收标准**：`npm audit --omit=dev` 无高危；Node 26 下构建与测试全绿；依赖清单无 EOL/废弃包。

### D6【P1】Storybook 依赖缺失，lint 配置缺失

- **文件路径/代码**：`.storybook/main.ts:1,11` 引用 `@storybook/react-vite`，`package.json` 未声明（实测 `node_modules/@storybook/react-vite` 不存在）；`package.json:11` 声明 lint 但仓库无 `.eslintrc*`/`eslint.config.*`（实测 lint 退出码 2）。
- **当前行为**：`npm run storybook`/`build-storybook` 预期报找不到 framework（未实测）；`npm run lint` 确认失败。
- **风险**：文档宣称的组件文档系统与代码检查均不成立；无静态检查兜底。
- **建议修改方式**：补齐 `@storybook/react-vite` 并升级 Storybook；新增 ESLint 9 扁平配置 + typescript-eslint；CI 增加 lint 步骤。
- **验收标准**：`npm run lint` 与 `npm run build-storybook` 均退出码 0；CI 两步均运行。

### D7【P1】声明但未使用的依赖与分叉包

- **文件路径/代码**：`package.json:30` `zustand`、`:31` `lucide-react`、`:32` `framer-motion` 全仓无 import（已 grep）；`package.json:43` `gh-pages` 与 workflow 的 git push 方案重复；`client/package.json:1-25` 是第二套依赖清单，`client/` 无 `tsconfig.json` 却写 `tsc && vite build`。
- **当前行为**：安装成本与漏洞面被无谓放大；贡献者不知道该维护哪份包清单；`Icon.tsx:7` 甚至注释"no external dependencies"说明自定义 SVG 已替代 lucide-react。
- **风险**：依赖审计噪声、升级负担、架构混乱。
- **建议修改方式**：删除未使用依赖或按 `modernization-plan.md` §2 真正使用 zustand；删除 `client/`；`deploy` 脚本与 workflow 二选一。
- **验收标准**：`package.json` 中每个运行时依赖都有对应 import；仓库只有一份前端包清单。

---

## 4. 构建验证结论

**真实结果：`npm install --legacy-peer-deps` 成功（622 包，15 漏洞）；`npm run build` 失败（退出码 2，22 个 TS 错误，Vite 阶段从未执行）；`npx vite build` 亦失败（Rollup: Icon 无默认导出）；`npm run lint` 失败（无配置）。因此当前 main 分支不存在可部署产物，GitHub Pages 部署链路在 `npm run build` 处即中断。**
