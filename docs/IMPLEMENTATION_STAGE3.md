---
type: docs
title: 实施记录 · Stage 3
weight: 40
menus:
  main:
    parent: implementation
    weight: 40
description: "移除的死依赖：framer-motion、lucide-react（全仓无引用）、gh-pages（改用官方 Pages 流程）。"
---

- **日期**：2026-11-16
- **目标**：按 Stage 0 审计结论重建真实业务闭环，并按总计划技术基线升级前端栈。
- **状态**：构建通过、20 个单元测试通过、typecheck/lint 全绿；改动仅在工作区，未推送。

---

## 1. 修复的历史问题（对照 Stage 0 审计）

| Stage 0 发现 | 本次处理 |
| --- | --- |
| `npm run build` 失败，22 个 TS 错误，`dist/` 无法生成 | ✅ 构建通过（`tsc && vite build` 退出码 0） |
| `Icon.tsx` 无默认导出、无 `TagIcon` | ✅ 补齐组件与默认导出 |
| `ApiResponse.pagination` 缺 `totalPages` | ✅ 类型补齐（`src/types/index.ts`） |
| 幽灵后端（Express/SQLite，依赖未声明、无启动脚本） | ✅ 整体移出 `src/`，归档至 `_archive/backend-stub/`，不再参与类型检查与构建 |
| `client/` 重复前端分叉 | ✅ 归档至 `_archive/client-duplicate/` |
| Storybook 配置引用未安装的 `@storybook/react-vite` | ✅ 连同两个 stories 文件归档至 `_archive/storybook/`；主链路不再被其 peer 依赖阻塞 |
| 四个视图全是硬编码数据、按钮无事件 | ✅ 全部改为真实 CRUD + IndexedDB 持久化 |
| 无 lockfile、`npm install --legacy-peer-deps` | ✅ 生成 `package-lock.json`（316 包），CI 改用 `npm ci` |
| 无 `base`、BrowserRouter 无 basename、无 404 回退 | ✅ `base: '/uRead/'` + `basename` + 构建生成 `404.html` |
| Node 18 + `git push -f` 强推 gh-pages | ✅ Node 26 + 官方 Pages Actions（`configure-pages`/`upload-pages-artifact`/`deploy-pages`），不再强推 |
| `npm run lint` 无配置不可用 | ✅ ESLint 9 扁平配置，`npm run lint` 通过 |
| 无 PostCSS 配置导致 Tailwind 未生效（产物 CSS 仅 1.4kB） | ✅ 新增 `postcss.config.js`，产物 CSS 20.3kB |
| 文档宣称 PDF/EPUB 解析、AI 推荐、AI 卡片生成（实际不存在） | ✅ README 改为真实能力矩阵；旧文档归档至 `_archive/legacy-docs/` 并加说明 |

---

## 2. 新增的数据层（本地优先）

```
src/data/
├── types.ts        # 与 schemas/knowledge-asset.schema.json 对齐的领域类型
├── db.ts           # IndexedDB 封装：版本迁移表、索引定义、通用 CRUD
└── repository.ts   # 仓储层：实体 CRUD、级联删除、导入导出
src/store/libraryStore.ts   # Zustand 状态与命令派发
```

- **8 张表**：books、readingSessions、highlights、annotations、notes、booklists、knowledgeCards、knowledgeRelations。
- **版本化迁移**：`MIGRATIONS` 表登记每个版本的变更，升级路径可追溯（当前 v1）。
- **索引**：notes/highlights/annotations/cards 的 `by_book`，relations 的 `by_source`。
- **知识资产基类字段**：每条 Book / Note / KnowledgeCard 都带 `source_refs`、`relations`、`metadata`、`version`、`status`、`created_at`、`updated_at`。
- **来源锚点**：`Anchor` 支持 `pdf_page` / `text_quote` / `epub_cfi` / `content_anchor` / `char_offset`，笔记可回溯原文位置。
- **级联删除**：删除图书同时清理其笔记、卡片与高亮，避免孤儿资产。
- **导入导出**：JSON 备份（含 format/version 校验）与 Markdown 知识资产（frontmatter + 正文，可再导入）。
- **离线可用**：全部操作在本地 IndexedDB 完成，不依赖网络。

## 3. 真实业务闭环（UI）

| 模块 | 路由 | 实现 |
| --- | --- | --- |
| 仪表板 | `/` | 统计全部来自真实数据；提供 JSON/Markdown 导出、导入恢复、清空数据 |
| 资料库 | `/library` | 图书新建/删除/状态切换、原文粘贴、统计本书笔记与卡片数 |
| 读书笔记 | `/notes` | 创建/筛选/删除，关联书籍，录入页码与原文片段，自动生成 source_refs |
| 精选书单 | `/booklists` | 创建/删除、标签、书籍计数 |
| 知识卡片 | `/cards` | 创建/删除/标记已核验，关联来源笔记并自动生成 `derived_from` 关系 |

## 4. 技术栈升级（对齐总计划基线）

| 项 | 升级前 | 升级后 |
| --- | --- | --- |
| React | 18.2 | **19.3.1** |
| Vite | 4.4 | **8.3.8**（Rolldown；`manualChunks` 改为函数形式，`__dirname` → `import.meta.dirname`） |
| TypeScript | 5.1 | **5.9** |
| React Router | 6.15 | **7.18** |
| Zustand | 4.4 | **5.1** |
| Tailwind | 3.3 | **3.4.19**（保持 v3 配置形态，未引入 v4 的 CSS-first 迁移风险） |
| 测试 | 无 | **Vitest 5 + fake-indexeddb**（20 用例） |
| Lint | ESLint 8 无配置 | **ESLint 9 扁平配置**（通过） |
| 运行时 | Node 18 | **Node 26**（`engines` + CI） |
| 依赖漏洞 | 15（14 moderate / 1 high） | **7 moderate，全部位于 ESLint/typescript-eslint 开发工具链，不进入产物** |

移除的死依赖：`framer-motion`、`lucide-react`（全仓无引用）、`gh-pages`（改用官方 Pages 流程）。

---

## 5. 实际验证结果

> 下表是 **Stage 3 完成当时**的快照（历史记录，不随后续改动更新）。
> **当前**测试数量与能力清单以 `README.md`「现状」一节为准——那里的一致性由
> `tests/data/docs-consistency.test.ts` 自动核对。

| 命令 | 结果（Stage 3 快照） |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过（0 problems） |
| `npm test` | **20 passed**（2 个测试文件） |
| `npm run build` | 通过，产物含 `index.html`、`404.html`、`assets/*`（CSS 20.3kB、Tailwind 已生效） |
| `npm ci` | 316 包，使用 lockfile 可复现 |

测试覆盖：IndexedDB 基础操作、图书/笔记 CRUD、级联删除、锚点与来源、知识卡片与关系、JSON 导出导入、Markdown 往返、非法格式拒绝、Store 同步与统计计算。

## 6. 未解决问题与风险

1. **未推送上游**：环境无 GitHub 写凭证，改动仅在工作区。
2. **Storybook 已归档**：如需恢复，应升级到 Storybook 10 并重写 `.storybook/main.ts`（v7+ 框架配置格式已变）。
3. **PDF/EPUB 解析仍未实现**：当前只支持粘贴 Markdown/纯文本；真正的渲染器需要 pdf.js / epub.js，属后续阶段。
4. **前端测试仅覆盖数据层与 Store**：组件级测试（jsdom + Testing Library）已装好依赖但未编写，E2E（Playwright）未引入。
5. **TypeScript 未声明 `noUncheckedIndexedAccess` 等更严格选项**，后续可逐步收紧。
6. **CI 使用 Node 26 与 `actions/upload-pages-artifact@v3`**：需在真实仓库验证一次 Pages 发布链路。

## 7. 验收对照（uRead 专项执行指令）

| 验收项 | 状态 |
| --- | --- |
| 真实图书和笔记 CRUD | ✅ |
| IndexedDB 持久化 | ✅（含版本迁移、索引） |
| 读书标注与来源锚点 | ✅（页码/原文片段，生成 source_refs） |
| 知识卡片 CRUD | ✅（含核验状态与关系） |
| 导入、导出和备份 | ✅（JSON + Markdown 双向） |
| GitHub Pages 路由修复 | ✅（base + basename + 404 回退 + 官方 Pages 流程） |
| 新增笔记 → 刷新 → 重开浏览器数据仍在 | ✅（IndexedDB 持久化，测试覆盖） |
| 能定位到原文 | ✅（Anchor + 来源引用） |
