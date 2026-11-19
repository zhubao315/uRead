---
type: docs
title: 安全评审
weight: 50
menus:
  main:
    parent: audit
    weight: 50
description: "src/index.ts:10 仅 dotenv.config()，无启动配置校验。"
---

> **历史时点快照（2026-11-16）**：本文件记录的是审计当天的代码状态，其中部分问题已修复。
> 当前状态以 `docs/PROJECT-STATUS.md` 与 `docs/audit/current-state.md` 为准；不要把这里当成待办清单。


> 审计日期：2026-11-16
> 审计方式：静态代码审计 + 实际构建验证（逐文件阅读源码/配置/workflow；`npm install --legacy-peer-deps` + `npm run build` 实测）
> 未验证项：线上站点实际响应头/CSP、GitHub Actions 权限实际生效情况、后端服务真实启动与渗透测试。
> 已实测补充：`npm run lint` 退出码 2（缺配置）；`npm audit` 报告 15 个漏洞（14 moderate / 1 high，high 项为 vite）；`npm install` 安装 622 包并出现多条弃用告警。
> 范围说明：当前真正运行的只有静态前端，因此"前端无用户输入、无网络请求、无持久化"反而意味着**攻击面极小**；下述后端安全问题针对的是"存在但不可运行"的代码，一旦 2.0 启用后端或 AI 功能即会生效。

---

## 1. 安全面现状

| 面 | 状态 | 证据 |
|---|---|---|
| 用户输入 | 无表单、无 file input、无 `fetch` | `grep -rnE "fetch\(|axios|localStorage|indexedDB" src client/src` 无前端命中 |
| 认证 | 有 JWT 中间件，但无签发端、无 secret 强校验 | `src/middleware/auth.ts`、`src/routes/*.ts` |
| 密钥 | `.env.example` 含占位符 JWT_SECRET；前端无 secret | `.env.example:11`、`src/middleware/auth.ts:29` |
| 第三方资源 | Google Fonts 外链（无 SRI、无 CSP） | `src/index.css:5`、`ui-ux-design-system.md:71-74` |
| 部署 | workflow 使用 force push，未声明最小权限 | `.github/workflows/deploy.yml:26-32` |
| 依赖 | 无 lockfile、多个已废弃包、安装过程出现废弃告警 | `package.json`、本次 `npm install` 真实输出 |

---

## 2. 问题清单

### S1【P1，后端启用前必须修】JWT 密钥使用占位符且无启动期强校验

- **文件路径/代码**：`.env.example:11` `JWT_SECRET=your-jwt-secret-key-change-in-production`；`src/middleware/auth.ts:29-32`：
  ```ts
  const secret = process.env.JWT_SECRET;
  if (!secret) { throw new Error('JWT secret not configured'); }
  const decoded = jwt.verify(token, secret) as {...};
  ```
  `src/index.ts:10` 仅 `dotenv.config()`，无启动配置校验。
- **当前行为**：只要环境变量里存在任意非空字符串（包括示例占位符），`jwt.verify` 就会接受用它签名的 token；不存在时才在每次请求返回 403。未固定 `algorithms`，verify 默认接受 HS256/384/512。
- **风险**：生产若误用示例密钥，攻击者可自行签发 token 绕过全部 `/api` 鉴权；后端当前不可运行掩盖了问题。
- **建议修改方式**：启动时校验 `JWT_SECRET` 长度（≥32 字节）且拒绝等于示例值；`jwt.verify(token, secret, { algorithms: ['HS256'] })`；密钥仅通过 CI/部署环境注入，`.env.example` 改为空值 + 说明；提供轮换策略（kid/多密钥）。
- **验收标准**：以示例密钥启动服务直接失败退出；伪造 token 返回 403；密钥不在仓库/日志中出现。

### S2【P1】认证链路不存在：有校验中间件，无签发/注册/密码学

- **文件路径/代码**：`src/routes/notes.ts:27,38,70,97` 等所有路由均挂 `authenticateToken`；全仓无 login/register 路由；`src/middleware/auth.ts` 只 verify；`src/services/DatabaseService.ts:50-57` 建了 `users` 表但无任何读写；`.env.example:12` 提到 `BCRYPT_ROUNDS` 但 `package.json` 无 bcrypt。
- **当前行为**：没有途径获得合法 token → 所有业务 API 返回 401；`req.user.id` 来自 token payload，未与数据库用户核对（`auth.ts:34-40`）。
- **风险**：安全机制是"纸面存在"；即便伪造 token 通过（见 S1），已删除用户仍可访问到 token 过期；文档宣称的用户认证系统实际不可用。
- **建议修改方式**：若 2.0 采用纯本地 IndexedDB，则删除后端 auth 代码与 `.env.example` 中的服务端密钥项，避免误导；若保留 API，则补齐注册/登录（密码哈希如 argon2/bcrypt）、用户存在性校验、token 撤销名单与限流。
- **验收标准**：接口文档中列出的认证流程可用且可测；不存在"只有中间件没有签发端"的半成品；已删除用户的 token 立即失效。

### S3【P1】错误信息泄露与不可控的错误响应

- **文件路径/代码**：`src/index.ts:74-82`：
  ```ts
  this.app.use((error: any, req, res, next) => {
    console.error('Error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  });
  ```
  `src/utils/response.ts:54-65` `standardError()` 也把 `error.stack` 放进响应（dev 环境）。
- **当前行为**：任意内部错误的原始 `message` 都会回给客户端；生产环境虽不返回 stack，但 `message` 可能含 SQL/路径/密钥片段。
- **风险**：信息泄露，辅助攻击者测绘后端结构。
- **建议修改方式**：5xx 统一返回 "Internal server error" + 关联 ID，详细错误只进服务端结构化日志；4xx 才返回可预期的业务消息；使用 `standardError` 的 `getStatusCode` 做映射（当前未被任何路由使用）。
- **验收标准**：构造一个抛异常的接口，响应体不含堆栈/文件路径/SQL；服务端日志含可关联的请求 ID。

### S4【P2】CORS 配置可由环境变量放大，且缺少校验

- **文件路径/代码**：`src/index.ts:27-30` `origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'], credentials: true`；`.env.example:23` `CORS_ORIGIN=http://localhost:3000,http://localhost:3001`。
- **当前行为**：允许来源完全来自环境变量；若运维填入 `*` 并配合 `credentials: true`，浏览器将拒绝该组合或形成过宽跨域策略；环境变量格式错误（空格、尾斜杠）会静默失效。
- **风险**：跨域数据暴露、配置错误难排查。
- **建议修改方式**：启动时解析并校验 origin 列表（URL 格式、禁止 `*` 与 `credentials` 共存）；对静态站点尽量不开放 CORS；如需本地开发用固定白名单。
- **验收标准**：配置 `*` 时服务拒绝启动；非白名单 Origin 请求被浏览器/CORS 中间件拒绝。

### S5【P2】请求体与日志配置不可靠

- **文件路径/代码**：`src/index.ts:34` `morgan(process.env.LOG_LEVEL as string || 'info')`；`src/index.ts:37` `express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' })`；`.env.example:16,19` `MAX_FILE_SIZE=10485760`、`LOG_LEVEL=info`。
- **当前行为**：`LOG_LEVEL=info` 不是 morgan 的格式名，会被当作字面量格式（每条请求只打印 "info"），与"日志级别"语义不符；`MAX_FILE_SIZE` 数值无单位，虽可被字节解析，但语义与上传大小限制混淆。
- **风险**：缺少有效访问日志与合理的请求体上限，遇到滥用（大 payload、刷接口）时难以发现/缓解；无速率限制依赖。
- **建议修改方式**：morgan 使用 `'combined'`/`'tiny'` 等真实格式，日志级别交给独立日志库；请求体限制写成 `'10mb'` 并与文件上传配置拆分；若启用 API，增加 `express-rate-limit`。
- **验收标准**：访问日志含方法/路径/状态/耗时；超限请求返回 413；短时高频请求触发 429。

### S6【P2】依赖供应链：无 lockfile、废弃包、无审计基线

- **文件路径/代码**：`package.json:26-51`；仓库根无 lockfile；本次 `npm install --legacy-peer-deps` 真实输出出现多条弃用告警：
  - `inflight@1.0.6`（内存泄漏）、`rimraf@3.0.2`、`glob@7.2.3`/`glob@10.5.0`（含已修复安全漏洞）、`uuid@9.0.1`、`eslint@8.57.1`（均已 EOL）；
  - `@storybook/testing-library@^0.2.0`（`package.json:50`，已废弃且 Storybook 8+ 不再使用）。
- **当前行为**：`^` 版本 + 无 lockfile + `--legacy-peer-deps` 使每次安装可能得到不同依赖树，且会掩盖 peer 冲突；CI（`.github/workflows/deploy.yml:21`）正是这样安装的。本次实测安装 622 个包，`npm audit` 报 **15 个漏洞（14 moderate / 1 high）**；high 为 `vite`（含 `<=5.4.19` 的路径遍历/文件泄露等多项公告），moderate 含 `esbuild`（开发服务器任意站点可读响应）、`react-router`/`react-router-dom`（开放重定向、SSR 反序列化注入）、`uuid`（缓冲区边界）、`glob`/`minimatch`（DoS/路径问题）及多个 Storybook 包。
- **风险**：不可复现构建；已废弃/含已知漏洞的传递依赖进入产物或开发工具链；无法回答"某次部署用了哪些版本"；`react-router` 漏洞直接影响现有 4 条路由的 `<Link>`。
- **建议修改方式**：生成并提交 `package-lock.json`；统一 `npm ci`；在 CI 增加 `npm audit --omit=dev --audit-level=high` 与 `npm outdated` 报告；升级 ESLint 9、Storybook 至维护版本、移除废弃包；升级 Node 到 26 后复核原生模块兼容性。
- **验收标准**：lockfile 入库；`npm ci` 可重复安装；`npm audit --omit=dev` 无高危；CI 有依赖检查步骤。

### S7【P2】部署凭据与流程安全

- **文件路径/代码**：`.github/workflows/deploy.yml:26-32`（`git push -f origin HEAD:gh-pages`；无 `permissions:` 块；无环境保护规则）；`deploy.sh:15-23`（硬编码提交者邮箱/名称 + force push）。
- **当前行为**：CI 用 GITHUB_TOKEN 强推 `gh-pages`；默认 token 权限取决于仓库设置，若为只读则 push 失败；强推会覆盖分支历史且无法审计差异。
- **风险**：凭据权限过宽或过窄都出问题；部署不可追溯、不可回滚；若将来引入第三方 Action，缺少固定 SHA 固定版本会扩大供应链风险。
- **建议修改方式**：改用 `actions/deploy-pages@v4`（`pages: write`、`id-token: write`，contents 只读），或 `peaceiris/actions-gh-pages@v3` 且不使用 force（或仅对专用部署分支使用）；第三方 Action 固定 SHA；分支保护 + 环境审批。
- **验收标准**：部署不再 force push；workflow 显式声明最小权限；每次部署有可追溯的 artifact 与提交关联。

### S8【P2】前端第三方资源与未来本地数据保护

- **文件路径/代码**：`src/index.css:5` `@import url('https://fonts.googleapis.com/css2?family=Inter...')`；`ui-ux-design-system.md:71-74` 同样建议外链；`index.html:1-14` 无 CSP meta；`src/types/index.ts:30-43` 的笔记含 `quote`/`content`。
- **当前行为**：字体从外部 CDN 加载（无 SRI、无离线回退声明）；站点无内容安全策略；当前没有本地存储，但 2.0 计划把笔记/高亮存入 IndexedDB（`modernization-plan.md` §2）。
- **风险**：第三方请求带来隐私与可用性问题；未来笔记明文存浏览器，共享设备上有泄露风险；无 CSP 时任何注入脚本可读取全部本地数据。
- **建议修改方式**：自托管 Inter 字体或退回系统字体栈；加入 `Content-Security-Policy`（Pages 可通过 meta 或 `_headers`，视托管方式）；在文档中明确"IndexedDB 为明文本地存储"，敏感数据由用户自行控制；AI 功能绝不把笔记悄悄发往第三方（见 `modernization-plan.md` §5 的确认流程）。
- **验收标准**：离线时页面字体正常回退且功能可用；CSP 生效且无违规报告；有明确的隐私说明；AI 发送任何内容前有显式确认与可见提示。

---

## 3. 结论

- 当前静态前端几乎没有可利用的服务端攻击面，但**安全相关的宣称（认证、后端、密钥）均无可用实现**。
- 最高优先级不是"加更多安全措施"，而是**消除虚假安全感**：要么彻底移除不可运行的后端/密钥配置，要么补齐完整链路（签发、校验、错误处理、限流、锁文件与审计）。
- 2.0 引入 IndexedDB 与 AI 后，攻击面会从"零"跃迁到"本地数据 + 外部模型调用"，必须在 S1 阶段同步落地 CSP、确认式 AI 流程与最小权限部署。
