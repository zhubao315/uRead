<div align="center">

# uRead · Personal Reading Library

**READ · REFLECT · REVISIT**

让读过的书，留下值得反复阅读的内容。

[![version](https://img.shields.io/badge/version-0.33.1-2457A6?style=flat-square)](CHANGELOG.md)
[![license](https://img.shields.io/badge/license-MIT-C58B42?style=flat-square)](LICENCE)
[![site](https://img.shields.io/badge/site-GitHub%20Pages-17243A?style=flat-square)](https://zhubao315.github.io/uRead/)
[![tests](https://img.shields.io/badge/tests-226%20passed-2E7D5B?style=flat-square)](#7-质量与门禁)

[中文](README.md) · [English](README.en.md)

</div>

---

## 目录

- [1. 这是什么](#1-这是什么)
- [2. 页面地图](#2-页面地图)
- [3. 公开阅读门户](#3-公开阅读门户)
- [4. 本地优先工作台](#4-本地优先工作台)
- [5. 数据从哪里来](#5-数据从哪里来)
- [6. 发布治理与自动同步](#6-发布治理与自动同步)
- [7. 质量与门禁](#7-质量与门禁)
- [8. 技术栈](#8-技术栈)
- [9. 快速开始](#9-快速开始)
- [10. 目录结构](#10-目录结构)
- [11. 部署](#11-部署)
- [12. 已知限制](#12-已知限制)
- [13. 许可](#13-许可)

---

## 1. 这是什么

uRead 有两块彼此独立、共用同一个站点的产品：

| | 公开阅读门户 | 本地优先工作台 |
| --- | --- | --- |
| 入口 | `/`、`/read`、`/booklists`、`/books/`、`/find` | `/workspace`、`/workspace/library`、`/workspace/notes`、`/workspace/cards`、`/workspace/booklists`、`/workspace/search` |
| 数据 | 构建期生成的只读 JSON 与静态 HTML | 浏览器 IndexedDB（八类数据） |
| 密钥 | 不含任何 token | 不含任何 token |
| 适合 | 分享给别人的阅读档案 | 自己的资料、笔记、卡片与阅读记录 |

> **当前版本：0.33.1**（变更记录见 [`CHANGELOG.md`](CHANGELOG.md)）。

**真实内容基线**（来自当前构建产物，不是规划数字）：

| 内容 | 数量 |
| --- | --- |
| 公开读书笔记 | 1595 篇 |
| 主题阅读栏目 | 10 个 |
| 公开推荐书单 | 39 份 |
| 书籍聚合记录 | 1818 条 |
| 有权分发的电子书（EPUB/PDF） | 2 本 |

**刻意不做的事**：AI 摘要、知识抽取、推荐模型、RAG / 向量检索、云端同步、浏览器直连私有仓库。这些不是「即将上线」，而是本项目的边界——私库 token 不进前端，检索与知识抽取由工作区的其它产品承担。

> 历史说明：早期脚手架文档里关于「AI 推荐 / AI 卡片生成 / PDF 解析」的描述并不存在，已移入 `_archive/legacy-docs/`。本 README 只描述当前源码中可复核的能力。

---

## 2. 页面地图

| 地址 | 内容 |
| --- | --- |
| `/uRead/` | 首页：品牌主张、精选书单、最新笔记、主题入口、推荐书籍 |
| `/uRead/read/` | 公开笔记列表与详情（只读，按分类浏览、搜索、听读） |
| `/uRead/booklists/` | 主题与书单统一入口（保留 `/themes`、`/lists` 兼容） |
| `/uRead/books/` | 书籍聚合索引、书籍档案、电子书库与阅读器（静态 HTML） |
| `/uRead/find/` | 全站搜索，结果按书籍 / 笔记 / 书单 / 主题分组 |
| `/uRead/workspace/` | 本地工作台：资料库、笔记、卡片、书单、搜索 |
| `/uRead/docs/` | 文档站（Hugo + OINK，与应用共用 Pages 产物） |

旧路径 `/library`、`/notes`、`/cards`、`/search` 会带查询参数重定向到 `/workspace/*`。

---

## 3. 公开阅读门户

### 3.1 首页与发现

首页是编辑式数字阅读杂志，不是数据库前台：Hero 展示来自 `publishing/homepage.json` 的精选书籍，精选书单与主题使用统一的 16:9 抽象视觉，最新笔记保持紧凑列表。首页的所有精选 ID 都能命中真实内容；ID 失效时会回退到真实数据的前若干项，不会显示空白。

### 3.2 笔记与听读

- 公开笔记只读渲染，正文按单篇 `detail/<content_hash>.json` 加载，列表只下载 1.5 MB 的轻量索引，不再拉取整份 22 MB 正文。
- 每篇笔记都有 **收听** 按钮：用浏览器的 `speechSynthesis` 即时朗读，**零文件、零网络、不上传正文**；没有原生语音时会明确提示浏览器兼容性，不用假播放器冒充。
- 已有 EPUB 内嵌封面时优先展示；没有时展示确定性生成的 SVG 主题视觉，并明确标注为 `uRead · THEME VISUAL`，不冒充出版封面。
- `[[wikilink]]` 只有在目标也在公开集合里时才可点，否则只显示文字；私有仓库的 blob URL 对访客是 404，因此只展示目录与 git sha 供核对。

### 3.3 主题、书单与书籍

- 39 份书单与 10 个主题都有 16:9 抽象视觉卡片，详情顶部有主题横幅；书目、作者、推荐理由与关联笔记入口保留为 HTML 文本，不被图片取代。
- 书籍索引提供 1868 条记录，每张卡片都有确定性 SVG 封面；有真实电子书时显示在线阅读入口，没有时不显示虚假按钮。
- 电子书库使用 **foliate-js v1.0.1**（MIT，vendor 已提交，构建不联网）：EPUB 由浏览器排版，PDF 交给浏览器自带阅读器。

### 3.4 媒体系统

图片资产与 Obsidian 原文、书单源文件、发布审批完全分离：

| 角色 | 路径 |
| --- | --- |
| 策展清单 | `media/curated-manifest.json` + `media/manifest.schema.json` |
| 书籍主题视觉 | `dist/media/books/<id>.svg`（2:3，按书籍 ID 种子确定） |
| 栏目视觉 | `dist/media/collections/<kind>-<id>.svg`（16:9） |
| 真实封面 | `dist/books/covers/*`（仅来自有权分发的 EPUB） |

统一组件 `MediaImage` / `BookCover` / `CollectionArtwork` 负责固定比例、`loading="lazy"`、`decoding="async"` 与一次性 fallback；首屏主视觉用 `fetchpriority="high"` 且不 lazy。规范见 [`docs/design/media-system.md`](docs/design/media-system.md)。

---

## 4. 本地优先工作台

工作台不写公开产物，公开笔记也不进 IndexedDB 的八类 store。

| 能力 | 状态 | 复核方式 |
| --- | --- | --- |
| 资料库：新建/删除图书、粘贴原文、维护阅读状态 | ✅ 已实现 | `npm test` |
| 读书笔记：创建/筛选/删除，携带页码与原文片段锚点 | ✅ 已实现 | `npm test` |
| **公开读书笔记**：从 Obsidian 同步到只读页面，按分类浏览、搜索、30 秒检查新版本 | ✅ 已实现 | `npm test -- tests/views/public-notes.test.tsx` |
| **听笔记**：设备原生语音「收听」，无 WAV 也能朗读；只有真实音频文件才显示播放器 | ✅ 已实现 | `npm test -- tests/views/public-notes.test.tsx` |
| **增量同步**：GitHub 树 + blob 缓存，只下载变化文件；token 只从环境变量读 | ✅ 已实现 | `npm test -- tests/data/public-notes-format.test.ts` |
| 知识卡片：创建/删除/标记已核验，可关联来源笔记 | ✅ 已实现 | `npm test` |
| 书单：创建/删除，可将资料库里的资料加入或移出书单 | ✅ 已实现 | `npm test -- tests/views/pages.test.tsx` |
| 书单卡片直接列出书名与阅读状态，超过 5 本折叠但说清还有几本 | ✅ 已实现 | `npm test -- tests/views/booklist-books.test.tsx` |
| 指向已删除资料的笔记：说明原因、可按「未归属」筛出、可改挂 | ✅ 已实现 | `npm test -- tests/views/orphan-notes.test.tsx` |
| 知识关系：卡片↔笔记 `derived_from` 等 | ✅ 已实现 | `npm test` |
| 本地持久化：IndexedDB，含版本迁移与索引 | ✅ 已实现 | `tests/data/repository.test.ts` |
| 导入导出：JSON 备份（八类全覆盖）/ Markdown（仅笔记与卡片），导入可回滚 | ✅ 已实现 | `npm test -- tests/data/repository.test.ts` |
| Markdown 导入报告无法解析的区块数（部分恢复不说成完整恢复） | ✅ 已实现 | `npm test -- tests/data/repository.test.ts` |
| 全站搜索（`/search?q=`）与列表内过滤（多词 AND、200 ms 防抖、Esc 清空） | ✅ 已实现 | `npm test -- tests/components/search-and-state.test.tsx` |
| 过滤词与新建入口写在 URL 上，搜索结果跳转仍带关键词 | ✅ 已实现 | `npm test -- tests/views/pages.test.tsx` |
| 加载 / 空 / 出错三种界面互不混淆，出错可重试 | ✅ 已实现 | `npm test -- tests/components/state-and-feedback.test.tsx` |
| 每个写盘动作都有成功或失败提示，不再静默 | ✅ 已实现 | `tests/store/errors.test.ts` |
| 删除类操作两步确认，并先说明级联后果 | ✅ 已实现 | `npm test -- tests/components/state-and-feedback.test.tsx` |
| 键盘可达：焦点轮廓、可访问名称、动态提示 `aria-live` | ✅ 已实现 | `npm run lint`（jsx-a11y）+ 组件测试 |
| 合成示例库：一键加载/清除演示数据 | ✅ 已实现 | `tests/data/sample.test.ts` |
| 与共享契约的枚举对齐（`AssetType` / `RelationType` / `Anchor.kind` / `source_type`） | ✅ 已实现（测试锁住） | `npm test -- tests/data/contract-alignment.test.ts` |
| 未提交内容本机暂存，恢复时明说「尚未保存」 | ✅ 已实现 | `npm test -- tests/views/drafts.test.tsx` |
| 质量闸门：类型 + Lint + 单测 + 构建 + 文档自检 | ✅ 已接入 | `npm run typecheck && npm run lint && npm test && npm run build && npm run docs:check` |
| AI 摘要、知识抽取、推荐 | ⛔ 未实现（规划见 `docs/audit/modernization-plan.md`） | — |
| PDF/EPUB 解析与渲染（工作台内） | ⛔ 未实现；站点的书库由 foliate-js 独立提供 | — |
| 浏览器直连私有 GitHub 仓库 / 云端自动同步 | ⛔ 刻意不做：私库 token 不能进前端 | — |
| 检索 / RAG / 向量库 | ⛔ 本仓库不做（由 uAI Core 承担） | — |
| 撤销 / 回收站 | ⛔ 未实现（删除永久生效，因此两步确认） | — |

### 4.1 备份的真实范围

| 方式 | 覆盖的数据 | 用途 |
| --- | --- | --- |
| 导出 JSON 备份（`uread-library` v2） | 资料、笔记、知识卡片、书单、阅读记录、划线、批注、知识关系（全部 8 类） | **唯一可完整恢复的备份** |
| 导出 Markdown | 仅笔记与知识卡片 | 人工审阅、版本管理，**不能当备份** |

历史教训（0.5.0 修复）：v1 备份只装前 4 类，而「清空本地数据」提示先导出备份——照做会永久失去阅读记录等四类数据。现在 v2 八类全入包；导入 v1 会点名缺失类别；清空前的确认列出真实条数。

### 4.2 未提交内容与页面状态

四个表单页的字段由 `useDraft()` 暂存到 `localStorage`（键前缀 `uread:draft:v1:`）：草稿不进 IndexedDB、不进 JSON 备份、不进 Markdown 导出；恢复时明确显示「已恢复上次未提交的内容（本机暂存，尚未保存）」；存储被禁用时标为 `blocked` 并说明风险。

四个列表页的过滤词与创建表单展开状态写在 URL 上（`/notes?q=认知`、`/search?q=认知`、`/library?new=1`），一处实现、四处生效。

### 4.3 合成示例库

空库时可一键加载明确标注的演示数据：

| 内容 | 数量 | 说明 |
| --- | --- | --- |
| 示例图书 | 3 | 正文可摘录，覆盖待读/在读/已读 |
| 读书笔记 | 6 | 每条带 `text_quote` 锚点与逐字引用 |
| 知识卡片 | 5 | 类型与重要度有区分，核验状态混合 |
| 知识关系 | 5 | 卡片 → 笔记的 `derived_from` |
| 书单 | 1 | 收录全部示例图书 |

这些内容**不是真实阅读记录**，全部带 `synthetic-demo` 标签；「清除示例数据」只删带标签的条目。

---

## 5. 数据从哪里来

公开内容由本机脚本从私有 Obsidian 仓库同步，**浏览器不接触任何 token**。

```bash
# 预览同步计划（不写文件）
npm run notes:sync:dry
npm run lists:sync:dry

# 真实同步（GitHub 模式，token 只从环境变量读）
GITHUB_TOKEN=... npm run notes:sync -- --no-audio
GITHUB_TOKEN=... npm run lists:sync

# 本机目录模式（离线校准解析器）
node scripts/sync-notes.mjs --local=/path/to/07-SOURCES/71-书籍 --no-audio

# 构建把 public/ 产物带进 dist/
npm run build
```

| 环境变量 / 参数 | 作用 | 默认值 |
| --- | --- | --- |
| `GITHUB_TOKEN` | 私有仓库只读 PAT；**只从环境变量读**，不进代码/产物/日志 | GitHub 模式必填 |
| `NOTES_REPO` / `NOTES_BRANCH` / `NOTES_PATH` | 仓库、分支、笔记目录 | `zhubao315/obsidian-vault` / `main` / `07-SOURCES/71-书籍` |
| `TTS_BASE_URL` / `TTS_MODEL` / `TTS_VOICE` | 预生成音频的端点与音色 | 本机 `192.168.1.3:40000/v1` |
| `--audio-limit=N` / `AUDIO_LIMIT` | 每次最多新生成多少篇音频（按内容哈希缓存） | `10` |
| `--no-audio` / `--dry-run` | 不生成音频 / 只看计划不写文件 | 关闭 |

> **公开范围警告（务必先读完）**：当前配置是**整个 `07-SOURCES/71-书籍` 目录全量公开**，包含这 1595 篇笔记的正文。一旦随 Pages 发布，搜索引擎与他人缓存**无法保证收回**。同步产物只有 `public/notes/` 与 `public/lists/`；`.notes-cache/`、`.lists-cache/` 存的是私有正文，已加入 `.gitignore`，不会随构建或 push 出去。

> 音频说明：TTS 服务仍停机，所有自动同步使用 `--no-audio`。任何笔记都能用「收听」按钮朗读；极少数已有 WAV 作为可选缓存保留，不伪造音频。

---

## 6. 发布治理与自动同步

### 6.1 发布审批

```bash
npm run publish:preview            # 只看与已批准基线的差异，不写文件
npm run publish:check -- --strict  # 未批准变更 / 新敏感命中 / 新孤儿音频即失败
APPROVE=1 npm run publish:approve  # 人工确认后更新批准基线
```

`require_approval` 真实生效；`deploy.yml` 在构建后执行内容对账与严格发布检查，失败直接阻止 Pages 部署。`publish:approve` 只在人工确认后运行，不在任何 CI 中调用。策略在 `publishing/policy.json`，当前为 `allow_all_legacy`（全量公开），这是已确认的临时状态；治理工具不会删除或修改 `public/` 下任何文件。

### 6.2 GitHub Actions

| 工作流 | 周期 | 职责 |
| --- | --- | --- |
| `auto-sync.yml` | 每天 UTC 02:00（北京 10:00） | 同步笔记（`--no-audio`） |
| `lists-sync.yml` | 每周一 UTC 03:00（北京 11:00） | 同步主题与书单 |
| `ci.yml` | push | 类型 + Lint + 单测 + 构建 + 文档自检 |
| `deploy.yml` | push / 派发 | 对账 + 严格发布检查 + Pages 部署 |

两个同步工作流都支持手动 `Run workflow`，共用 `content-sync` 并发组，且在提交前比对 manifest 版本——版本未变时只有生成时间戳变化，会跳过提交与部署，不制造空提交。所需 Secret：`OBSIDIAN_TOKEN`（对私库只读的 PAT）。

---

## 7. 质量与门禁

单元测试：**npm test 报 226 passed / 1 跳过，共 227 个用例**（32 个测试文件）。唯一会跳过的是工作区共享契约文件不在时的那组契约核对——那种环境下报 **215 passed / 12 跳过，共 227 个用例**（两组数字的 passed + skipped 都等于总数，由 `tests/data/ui-invariants.test.ts` 验算）。这些断言本身也被核对：`python3 ../scripts/mutation_check.py` 会把已修复的行为逐个改回缺陷形态，要求对应测试必须变红——**不会失败的测试等于没有测试**。

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint 9 + jsx-a11y
npm test                 # Vitest（单元 + 页面 + 静态不变量）
npm run build            # 生产构建 + 书库 + 书籍索引 + 媒体产物 + sitemap/RSS
npm run docs:build       # Hugo Extended 0.168 + OINK
npm run docs:check       # 文档站自检（死链 / 两跳可达 / 回应用路径）
npm run media:validate   # 媒体清单校验
npm run media:audit      # 媒体覆盖率报告
npm run verify:release   # 内容对账（基线 / manifest / 路由 / 书籍索引）
npm run publish:check -- --strict
npx playwright test      # 端到端（桌面 + 移动）
```

全仓统一门禁：`ROUND=<n> bash ../scripts/quality_round.sh`（最近一次 **37/37**）。

---

## 8. 技术栈

| 层次 | 方案 |
| --- | --- |
| 框架 | React 19.3 + TypeScript 5.9 |
| 构建 | Vite 8.3（Rolldown） |
| 路由 | React Router 7（`basename=/uRead`） |
| 状态 | Zustand 5（UI）+ 仓储层（持久化） |
| 样式 | Tailwind CSS 3.4 + PostCSS，Design Tokens |
| 存储 | IndexedDB（`fake-indexeddb` 用于测试） |
| 测试 | Vitest 5 + ESLint 9 + `tsc --noEmit` + Playwright |
| 阅读器 | foliate-js v1.0.1（MIT，本地 vendor） |
| 文档站 | Hugo Extended 0.168 + OINK（本地 vendor，零 CDN） |
| 部署 | GitHub Pages（官方 Actions，`base=/uRead/`，含 `404.html`） |

---

## 9. 快速开始

```bash
npm ci
npm run dev        # 本地开发 http://localhost:3000
npm run typecheck
npm run lint
npm test
npm run build      # 产物在 dist/，含 404.html、books/、media/
npm run docs:build # 需要 Hugo Extended 0.168+
npm run docs:check
```

---

## 10. 目录结构

```
uRead/
├── src/
│   ├── data/                 # 领域类型 / IndexedDB / 仓储 / 示例库 / 公开数据加载
│   ├── domain/               # 笔记分区、朗读分段、媒体解析等纯逻辑
│   ├── services/speech/      # 设备原生语音引擎
│   ├── hooks/                # useDraft / useUrlSync / useSpeechPlayer
│   ├── components/           # 展示组件与 media/ 图片组件
│   └── views/                # 公开门户 + 工作台页面
├── public/
│   ├── notes/                # 公开笔记（索引 / 单篇详情 / manifest）
│   ├── lists/                # 主题与书单
│   ├── audio/                # 极少数可选 WAV 缓存
│   ├── brand/                # Logo 与图标
│   └── media/                # （构建产物）书籍与栏目视觉
├── media/                    # 策展媒体清单与 Schema
├── publishing/               # 发布策略、批准基线、首页编辑配置
├── scripts/                  # 同步 / 构建 / 审计 / 发布检查脚本
├── book-library/             # EPUB/PDF 书库构建器与 foliate-js
├── docs/                     # 文档站内容（Hugo contentDir）
├── tests/                    # Vitest + Playwright
├── .github/workflows/        # ci / deploy / auto-sync / lists-sync
└── _archive/                 # 历史脚手架与旧文档（不参与构建）
```

---

## 11. 部署

站点部署在 **https://zhubao315.github.io/uRead/**，`vite.config.ts` 的 `base` 与路由 `basename` 一致；构建产物含 `404.html`，深层路由刷新不会 404。文档站构建到 `docs-site/`，由同一条 `deploy.yml` 复制进 `dist/docs/`，因此应用与文档共用同一个 Pages 产物。Hugo 的构建警告一律视为失败（主题 libsass 弃用提示除外）。

---

## 12. 已知限制

- **公开范围无法回收**：当前是全量公开，已发布内容可能被搜索引擎或他人缓存。
- **TTS 服务停机**：没有新音频；朗读依赖设备原生语音，音色与断句由浏览器决定。
- **没有真实设备回归**：E2E 使用 Chromium 桌面/移动视口，没有真实手机浏览器验证。
- **文档时点快照**：`docs/audit/` 下的审计报告是历史快照；现状以本 README 与 `docs/PROJECT-STATUS.md` 为准。
- **书籍封面不是出版封面**：1868 本书全部使用 uRead 主题视觉，不冒充真实出版封面；只有 1 本 EPUB 有真实内嵌封面且未匹配进聚合索引。

---

## 13. 许可

MIT，见 [`LICENCE`](LICENCE)。第三方组件（foliate-js、OINK 等）保留各自许可。
