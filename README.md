# uRead · AI 阅读与知识萃取工作台

> 让每一次阅读，都留下可生长的沉淀。

uRead 是一个**本地优先**的阅读与知识沉淀工具：导入资料 → 记录笔记与原文定位 → 萃取原子知识卡片 → 导出为可迁移的知识资产。

> 本仓库已于 2026-11-16 完成 Stage 0 审计与 Stage 3 数据层重建。此前 README / FINAL_REPORT / SHOWCASE 等文档中关于「PDF/EPUB 解析、AI 推荐、AI 卡片生成」的描述**并不存在**，相关历史文档已移入 `_archive/legacy-docs/`。

## 现状（真实能力）

> 当前版本：**0.30.0**（变更记录见 `CHANGELOG.md`）。

> 本表只列**已实现且可复核**的能力。「复核方式」列出的命令都能在本仓库直接运行；
> 未实现的能力一并列出，避免把规划当成功能。

| 能力 | 状态 | 复核方式 |
| --- | --- | --- |
| 资料库：新建/删除图书、粘贴原文、维护阅读状态 | ✅ 已实现 | `npm test` |
| 读书笔记：创建/筛选/删除，携带页码与原文片段锚点 | ✅ 已实现 | `npm test` |
| **公开读书笔记**：从 Obsidian 仓库同步到只读页面（`/read`），按分类浏览、全文搜索、30 秒检查新版本 | ✅ 已实现 | `npm test -- tests/views/public-notes.test.tsx` |
| **听笔记**：同步时按内容哈希预生成音频；只有文件确实存在才显示播放器 | ✅ 已实现 | `npm test -- tests/views/public-notes.test.tsx` |
| **增量同步**：GitHub 树 + blob 缓存，只下载变化的文件；token 只从环境变量读 | ✅ 已实现 | `npm test -- tests/data/public-notes-format.test.ts` |
| 知识卡片：创建/删除/标记已核验，可关联来源笔记 | ✅ 已实现 | `npm test` |
| 书单：创建/删除，并可将资料库里的资料加入或移出书单 | ✅ 已实现 | `npm test -- tests/views/pages.test.tsx` |
| 书单卡片直接列出书名与阅读状态：点书名回资料库定位原文，超过 5 本折叠但说清还有几本 | ✅ 已实现 | `npm test -- tests/views/booklist-books.test.tsx` |
| 指向已删除资料的笔记：说明原因、可按「未归属」单独筛出、可改挂到现有资料 | ✅ 已实现 | `npm test -- tests/views/orphan-notes.test.tsx` |
| 知识关系：卡片↔笔记 `derived_from` 等关系 | ✅ 已实现 | `npm test` |
| 本地持久化：IndexedDB，含版本迁移与索引 | ✅ 已实现 | `tests/data/repository.test.ts` |
| 导入导出：JSON 备份（八类数据全覆盖）/ Markdown 知识资产（仅笔记与卡片），导入可回滚恢复 | ✅ 已实现 | `npm test -- tests/data/repository.test.ts` |
| Markdown 导入报告**无法解析的区块数**（部分恢复不会被说成完整恢复） | ✅ 已实现 | `npm test -- tests/data/repository.test.ts` |
| 全站搜索（`/search?q=`）与列表内过滤（多词 AND、200ms 防抖、Esc 清空） | ✅ 已实现 | `npm test -- tests/components/search-and-state.test.tsx` |
| 过滤词与新建入口写在 URL 上：搜索结果跳过去仍带关键词，四个列表页口径一致 | ✅ 已实现 | `npm test -- tests/views/pages.test.tsx` |
| 「导入资料」「写第一条笔记」等承诺新建的入口，落地即可提交（`?new=1` 直接展开表单） | ✅ 已实现 | `npm test -- tests/views/pages.test.tsx` |
| 页面层交互测试：真实渲染整棵路由树，点击后断言可见结果 | ✅ 已实现 | `npm test -- tests/views/pages.test.tsx` |
| 加载 / 空 / 出错三种界面互不混淆，出错可重试 | ✅ 已实现 | `npm test -- tests/components/state-and-feedback.test.tsx` |
| 每个写盘动作都有成功或失败提示（含下一步动作），不再静默 | ✅ 已实现 | `tests/store/errors.test.ts` |
| 删除类操作两步确认，并先说明级联后果（删书会连带删笔记与卡片） | ✅ 已实现 | `npm test -- tests/components/state-and-feedback.test.tsx` |
| 键盘可达：焦点轮廓可见、控件有可访问名称、动态提示带 `aria-live` | ✅ 已实现 | `npm run lint`（`jsx-a11y`）+ 组件测试 |
| 合成示例库：一键加载/清除演示数据（带 `synthetic-demo` 标签） | ✅ 已实现 | `tests/data/sample.test.ts` |
| 与共享契约的枚举对齐（`AssetType` / `RelationType` / `Anchor.kind` / `source_type`） | ✅ 已实现（测试锁住） | `npm test -- tests/data/contract-alignment.test.ts` |
| 未提交内容本机暂存：切页面、刷新、导航都不丢，恢复时明说「尚未保存」 | ✅ 已实现 | `npm test -- tests/views/drafts.test.tsx` |
| 质量闸门：类型检查 + ESLint + 单元测试 + 构建 + 文档站自检 | ✅ 已接入 | `npm run typecheck && npm run lint && npm test && npm run build && npm run docs:check` |
| AI 摘要、知识抽取、推荐 | ⛔ 未实现（规划见 `docs/audit/modernization-plan.md`） | — |
| PDF/EPUB 解析与渲染 | ⛔ 未实现（当前支持粘贴 Markdown / 纯文本原文） | — |
| 浏览器直连私有 GitHub 仓库 / 云端自动同步 | ⛔ 未实现（刻意不做：私库 token 不能进前端。同步在本机脚本完成，再发布只读产物） | — |
| 检索 / RAG / 向量库 | ⛔ 本仓库不做（检索由工作区 SAG + uAI Core 承担） | — |
| 撤销 / 回收站 | ⛔ 未实现（删除是永久性的，因此必须两步确认） | — |

单元测试：**npm test 报 214 passed / 1 跳过，共 215 个用例**（29 个测试文件）。唯一会跳过的是工作区共享契约文件不在时的那组契约核对——那种环境下报 **203 passed / 12 跳过，共 215 个用例**（两组数字的 passed + skipped 都等于总数，由 `tests/data/ui-invariants.test.ts` 验算）。这些断言本身也被核对：`python3 ../scripts/mutation_check.py` 会把已修复的行为逐个改回缺陷形态，要求对应测试必须变红——**不会失败的测试等于没有测试**。
空库时的演示数据见下一节。

## 公开笔记：从私有仓库到只读页面（0.11.0）

`/read` 是**只读的公开视图**，和本地优先的 IndexedDB 数据完全分开：不写八类 store、不进备份包。
同步在**本机**完成，浏览器只拿到生成好的 `public/notes/notes.json` 与音频文件。

```sh
# 1) 先看会同步多少篇，不写任何文件
npm run notes:sync:dry

# 2) 真同步：从 GitHub 拉变化的文件，生成只读产物（音频默认最多 10 篇）
GITHUB_TOKEN=... npm run notes:sync

# 3) 本机目录模式（离线也能校准解析器）
node scripts/sync-notes.mjs --local=/path/to/07-SOURCES/71-书籍 --no-audio

# 4) 构建时 Vite 把 public/ 下的产物带进 dist/，随 Pages 一起发布
npm run build
```

**让它自动同步**：同步脚本本身只跑一次就退出。要「实时」，用 cron / systemd timer 定时调用，
例如每 10 分钟拉一次（token 仍只在环境变量里）：

```cron
*/10 * * * * . /tmp/opencode/obsidian.env; cd /oc/upstream/uRead && /usr/bin/npm run notes:sync -- --no-audio >> /tmp/uread-sync.log 2>&1
```

页面每 30 秒检查一次 manifest 版本；版本变化才重读笔记，所以「仓库变了」到「页面看到」之间
最短 30 秒、最长约 10 分钟（取决于上面的同步周期）。**这不是 webhook 推送**，没有常驻服务。

| 环境变量 / 参数 | 作用 | 默认值 |
| --- | --- | --- |
| `GITHUB_TOKEN` | 私有仓库只读 PAT；**只从环境变量读**，不写进 `.git/config`、产物、日志 | 必填（GitHub 模式） |
| `NOTES_REPO` / `NOTES_BRANCH` / `NOTES_PATH` | 仓库、分支、笔记目录 | `zhubao315/obsidian-vault` / `main` / `07-SOURCES/71-书籍` |
| `TTS_BASE_URL` / `TTS_MODEL` / `TTS_VOICE` | 预生成音频的 VoiceDesign 端点与音色 | 本机 `192.168.1.3:40000/v1` / `Qwen3-TTS-VoiceDesign-copy` |
| `--audio-limit=N` / `AUDIO_LIMIT` | 每次最多新生成多少篇音频（按内容哈希缓存，重跑不重复） | `10` |
| `--no-audio` / `--dry-run` | 不生成音频 / 只看计划不写文件 | 关闭 |

**发布边界（务必读完再跑第 2 步）**：当前配置是**整个 `07-SOURCES/71-书籍` 目录全量公开**。
仓库本身仍是私有的，但公开产物会包含这 1595 篇笔记的正文（2026-11-20 实测；以 `content-inventory.json` 为准）。
一旦随 Pages 发布，搜索引擎与他人缓存**无法保证收回**。
只想发一部分时，在 `scripts/sync-notes.mjs` 里加过滤条件后再生成。

**本地缓存不发布**：`.notes-cache/blobs/` 存的是私有仓库正文，只用来做增量同步，
已写进 `.gitignore`，不会随 `dist/` 或 git push 出去。公开产物只有 `public/notes/` 与 `public/audio/`。

**音频为什么不是全量**：上千篇约 16 MB 正文，全量朗读会是数百小时、GB 级 wav；
**实测 10 篇音频就占 115 MB**（其中一篇 8 分钟、单文件 23 MB），Pages 的 1 GB 配额很快见底。
所以默认只预生成 10 篇，其余显示「这篇笔记目前没有音频」——
**宁可如实说没有，也不放假播放器**。已生成的音频按内容哈希命名，改了笔记会换文件名重生成；
想少放一点就用 `--audio-limit=3` 重跑（已有音频不会被删除，只不再新增）。

**来源链接不放假**：私有仓库的 blob URL 对访客是 404，详情页只显示目录与 git sha 供核对，
不做成对外链接。`[[wikilink]]` 只有在目标确实也在公开集合里时才可点，否则只显示文字。

---

## 自动同步（GitHub Actions）

`.github/workflows/auto-sync.yml` 每天 UTC 02:00（北京时间 10:00）自动检查私库更新，
也支持在 Actions 页面手动 `Run workflow`。流程：同步笔记与栏目 → 重建内容基线/书籍索引 →
跑类型、Lint、单测、构建、文档自检 → 若无内容变化则跳过提交，否则提交生成产物并派发 Pages 部署。

所需仓库 Secret：`OBSIDIAN_TOKEN`（对 `zhubao315/obsidian-vault` 只读的 PAT）。
token 只通过环境变量传给同步脚本，不进代码/产物/日志。

> 当前 TTS 服务停机，自动同步使用 `--no-audio`，只同步正文；音频需等服务恢复后手动 `npm run notes:sync` 生成。

---

## 发布治理（先检查，不自动下线）

```sh
npm run publish:check                 # 默认 dry-run：只打印结论
npm run publish:report                # 写本地报告 publishing/report.json（不进 Pages）
npm run publish:check -- --strict     # 有未授权/敏感/孤儿音频时退出码 1
```

策略在 `publishing/policy.json`：白名单 `allow`、黑名单 `deny`、分类授权 `category_allow`、
标签排除 `tag_deny`、敏感规则 `sensitive_patterns`。`allowlist` 模式下**默认拒绝**；
`deny` 永远优先；敏感报告只回规则名与 slug，**不写正文**。

> 当前线上仍沿用 `allow_all_legacy`（全量公开），这是你已确认的临时状态：
> 治理工具先就位，**检查脚本绝不会删除或修改 public/ 下任何文件**。
> 要切换到默认拒绝，只需把策略 `mode` 改为 `allowlist` 并填授权名单，先跑 `--strict` 看清单再发布。

---

## 主题阅读与书单推荐（`/uRead/themes`、`/uRead/lists`）

从私有仓库 `02-BUILD/21-uRead/Lists` 同步的两个栏目，**与公开笔记同源、同样默认全量公开**：

```sh
GITHUB_TOKEN=... npm run lists:sync        # 真实同步（也可 --local=目录 / --dry-run）
```

| 栏目 | 来源文件 | 产物 | 页面能力 |
| --- | --- | --- | --- |
| 主题阅读 | `∑ 主题-*` / `主题-*`（10 个） | `public/lists/themes.json` | 按主题浏览、搜索、书目列表、能对应笔记的书直接点开 |
| 书单推荐 | `书单-*` / `∑ 书单*` / `uRead-*选品清单`（39 份） | `public/lists/booklists.json` | 书单搜索、书目与作者、展开原文说明、书目跳笔记 |

解析规则：认表格行、列表行与编号行里的 `[[wikilink]]` 或 `《书名》`；引用块与代码块不抓。
`[[目标|别名]]` 里的 `|` 先遮罩再切列——否则《传习录》会被劈成两列。
wikilink 只有在目标确实也在公开笔记集合里时才可点，否则只显示文字。

---

## 书库：静态 EPUB/PDF 阅读（`/uRead/books/`）

> 多端验收清单见 `MULTI_DEVICE.md`（深链 / 手机 / 平板 / 离线 / 数据边界）。

与公开笔记并列的第二块内容，**独立目录、独立构建**，但共用同一个 Pages 站点子路径。

```sh
# 1) 把有权公开分发的 EPUB/PDF 放进 book-library/books/（只扫描，不下载）
cp /path/to/合法的书.epub book-library/books/

# 2) 生成本机目录与阅读页（Python 标准库，不需要 pip）
npm run books:build

# 3) 完整构建会把书库带进 dist/books/，随 Pages 一起发布
npm run build
```

| 事实 | 说明 |
| --- | --- |
| 阅读器 | **foliate-js v1.0.1**（MIT，vendor 已提交在 `book-library/vendor/foliate-js/`，构建不联网、不需要 `npm install`）；EPUB 走浏览器排版，PDF 走浏览器自带阅读器 |
| 目录来源 | 本机扫描书名/作者/语言（EPUB 读 OPF，PDF 无元数据时按文件名回退）；页数是**估算**，不是精确值 |
| 版权 | **只放你有权公开分发的书**；单本违法分发与本站无关。公开下载是直接文件链接，无法收回 |
| 体积硬线 | GitHub 单文件 >50 MiB 告警、>100 MiB**直接拦截**；构建脚本超线拒绝生成并点名文件。当前 2 本合计 ~62 MiB |
| 安全边界 | foliate-js 不支持 EPUB 脚本内容；Pages 不能自定义 CSP 响应头，所以**只收录自己信任的书** |

---

## 备份的真实范围（别把 Markdown 当备份）

| 方式 | 覆盖的数据 | 用途 |
| --- | --- | --- |
| 导出 JSON 备份（`uread-library` v2） | 资料、笔记、知识卡片、书单、阅读记录、划线、批注、知识关系（全部 8 类） | **唯一可完整恢复的备份** |
| 导出 Markdown | 仅笔记与知识卡片 | 人工审阅、版本管理，**不能当备份** |

历史教训（0.5.0 修复）：JSON 备份 v1 只装了前 4 类，而「清空本地数据」的确认写着
「请先导出备份」——照着做的人会永久失去阅读记录、划线、批注与知识关系，
且全程没有任何提示。现在的口径：

- 备份格式升到 v2，八类全部入包；
- 导入 v1 备份时**点名**缺失的类别并说明「这些类型本机已清空且无法找回」，
  不再报告一句含糊的「已恢复数据」；
- Markdown 导出文件的头部与界面按钮都写明它只含笔记与卡片；
- 清空前的确认列出八类的真实条数（数字来自仓储，不是写死的文案）。

`resetLibrary()` 清空的每一个仓储都必须出现在备份全景里——这条由
`tests/data/ui-invariants.test.ts` 静态核对，新增仓储时漏进备份会直接红灯。

同一段限制的另一半是**引用**：Markdown 里只有笔记与卡片，没有它们所属的资料，
所以把这些文件导入另一台机器（或清空后的库）时，每条笔记的 `book_id` 都指向不存在的资料。
这类条目现在不再显示「未知书籍」：卡片写明「所属资料已删除」，
笔记页可按「未归属」单独筛出，并可改挂到现有资料（只改这一条，不动其它笔记）。
资料库里还没有任何资料时不给空下拉框，而是说明先到「资料库」导入。
复核：`npm test -- tests/views/orphan-notes.test.tsx`（用的是真实的导出→清空→导入往返）。

## 未提交的内容：本机暂存，但不算知识

四个表单页（资料 / 笔记 / 卡片 / 书单）的字段以前只存在组件状态里：敲了一段长笔记，
点一下导航栏或刷新浏览器，整段就没了，而界面从来没说会这样。现在由
`useDraft()` 暂存到 `localStorage`（键前缀 `uread:draft:v1:`），三条边界是刻意的：

| 边界 | 具体行为 | 为什么 |
| --- | --- | --- |
| 草稿**不是**知识 | 只写 `localStorage`：不进 IndexedDB、不进 JSON 备份、不进 Markdown 导出 | 未提交的半成品被备份或同步出去，等于把垃圾灌进知识库 |
| 恢复时必须自报身份 | 界面显示「已恢复上次未提交的内容（本机暂存，尚未保存）」+「丢弃草稿」按钮 | 不能让它冒充已保存的条目 |
| 存不下就当场撤回承诺 | 隐私模式 / 禁用存储时标为 `blocked`，并说明「切换页面或刷新会丢失未保存的内容」 | 静默失败等于承诺了做不到的事；输入仍保留在当前这一屏，不打断打字 |

草稿按页面分开存（`notes` / `cards` / `library` / `booklists`），全空时自动删除键；
提交成功或点击「丢弃草稿」后清空。跨浏览器、跨设备带走属云端同步，见上文「现状」表的缺口行。

`useDraft()` 的写只发生在事件处理器里（本仓库启用的 `react-hooks/set-state-in-effect`
拒绝在 effect 中 setState，而且那会让「按一次键」变成两轮渲染）。

## 页面地址就是可分享的状态

四个列表页（资料库 / 笔记 / 卡片 / 书单）的过滤词与创建表单的展开状态一律写在地址上：

| 地址 | 打开后看到什么 |
| --- | --- |
| `/notes?q=认知` | 只有标题、正文或标签命中「认知」的笔记，搜索框里已填好这个词 |
| `/search?q=认知` | 全站搜索结果，点任意一条会**带着这个词**跳到对应列表页 |
| `/library?new=1` | 资料表单直接展开，可直接提交 |

以前只有资料库认 `?q=`，所以从搜索结果点一条笔记进 `/notes`，看到的是全部笔记、
搜索框却是空的——刚做的筛选等于没做。现在这份逻辑只有 `src/hooks/useUrlSync.ts` 一处实现。

> 为什么让 URL 当唯一真相：双向同步要么在渲染期读 `ref`，要么在 `useEffect` 里回写 state，
> 本仓库启用的 React 编译期规则（`react-hooks/refs`、`react-hooks/set-state-in-effect`）
> 两种都拒绝。规则不是在为难人——两种写法都会在打字过程中吃掉刚输入的字符。

## 界面出错时说什么

uRead 没有后端，失败来自 IndexedDB 与 JSON 解析，而这些异常默认是英文技术语
（`NotReadableError`、`Unexpected token …`）。`src/store/errors.ts` 把已知异常映射成
「中文说明 + 下一步动作」，测试逐条锁住（`tests/store/errors.test.ts`）：

| 现象 | 界面说法 | 建议动作 |
| --- | --- | --- |
| 数据库被其它标签页占用 | 浏览器拒绝打开本地数据库 | 关掉其它标签页后点「重试」 |
| 隐私模式禁用存储 | 浏览器出于隐私设置禁止了本地存储 | 换普通窗口，或允许本站存储 |
| 空间不足 | 浏览器存储空间不足，写入没有完成 | 先导出备份，再删除不需要的内容 |
| 导入了手工改坏的文件 | 导入的文件不是合法 JSON | 使用导出功能生成的文件 |
| 未知异常 | 保留原文 | 重试；仍失败则先导出备份 |

三条不可协商的界面规则（由 `tests/components/state-and-feedback.test.tsx` 把守）：

1. **读不到数据时不能显示空状态引导**——「资料库是空的，先导入一本书」会把故障说成新手教学；
2. **写盘失败必须有提示**——表单停在原地的静默失败等于让用户以为已经保存；
3. **删除必须先说清后果**——删一本书会连带删掉它的笔记与卡片，本地应用没有回收站。

## 合成示例库（空库时的一键演示）

uRead 是本地优先应用，空库时界面看不出价值。资料库空状态提供「加载示例库（合成数据）」，
写入一套**明确标注为合成**的演示数据：

| 内容 | 数量 | 说明 |
| --- | --- | --- |
| 示例图书 | 3 | 正文可摘录，`reading_status` 覆盖待读/在读/已读 |
| 读书笔记 | 6 | 每条都带 `text_quote` 锚点与**逐字引用**的正文行号 |
| 知识卡片 | 5 | `card_type` / `importance` 有区分，已核验与未核验混合 |
| 知识关系 | 5 | 卡片 → 笔记的 `derived_from`，同时写入内嵌 `relations` 与关系表 |
| 书单 | 1 | 收录全部示例图书 |

复现与自检：

```bash
npm test -- tests/data/sample.test.ts   # 含引文可定位性、关系完整性、幂等加载
```

边界（重要）：

- 这些内容**不是真实阅读记录**，不代表任何真实书籍的观点，全部带 `synthetic-demo` 标签；
- 笔记锚点的引文必须能在示例正文里逐字找到，测试会直接断言这一点——
  示例数据自己如果伪造引用，测试就会失败；
- 「清除示例数据」只删带标签的条目，真实数据不受影响（有测试覆盖）。

## 技术栈

| 层次 | 方案 |
| --- | --- |
| 框架 | React 19.3 + TypeScript 5.9 |
| 构建 | Vite 8.3（Rolldown） |
| 路由 | React Router 7（`basename=/uRead`） |
| 状态 | Zustand 5（UI 状态）+ 仓储层（持久化） |
| 样式 | Tailwind CSS 3.4 + PostCSS |
| 存储 | IndexedDB（`fake-indexeddb` 用于测试） |
| 测试 | Vitest 5（单元）+ ESLint 9 + `tsc --noEmit` |
| 部署 | GitHub Pages（官方 Actions，`base=/uRead/`，含 404 回退） |
| 文档站 | Hugo Extended 0.168 + [OINK](https://oink.pgsty.com) 主题（本地 vendor 于 `themes/oink/`，无 Node 构建、零 CDN 请求），发布到 `/uRead/docs/` |

## 快速开始

```bash
npm ci
npm run dev        # 本地开发 http://localhost:3000
npm run typecheck  # 类型检查
npm run lint       # ESLint
npm test           # 单元测试
npm run build      # 生产构建（产物在 dist/，含 404.html）
npm run docs:build # 文档站（需要 Hugo Extended 0.168+；产物 docs-site/）
npm run docs:check # 文档站自检（死链 / 两跳可达 / 回应用链接）
```

## 目录结构

```
src/
├── data/                 # 数据层
│   ├── types.ts          # 与共享契约对齐的领域类型
│   ├── db.ts             # IndexedDB 封装（版本迁移 + 索引）
│   ├── repository.ts     # 仓储层：CRUD / 导入导出
│   └── sample.ts         # 合成示例库（加载 / 清除 / 完整性校验）
├── store/libraryStore.ts # Zustand 状态与命令派发
├── hooks/                # useDraft（本机草稿）/ useUrlSync（?q= 与 ?new=1）/ useActionRunner
├── components/           # 展示组件
└── views/                # 仪表板 / 资料库 / 笔记 / 书单 / 卡片
tests/                    # Vitest 测试
docs/                     # 文档站内容（Hugo 的 contentDir）
hugo.yaml                 # 文档站配置（唯一配置文件）
themes/oink/              # OINK 主题（本地 vendor，构建不需要 Node/npm/CDN）
scripts/                  # copy-404.mjs / build-docs.mjs / check-docs-site.mjs
_archive/                 # 历史脚手架与旧文档（不参与构建）
```

## 数据契约

领域类型与共享契约 `schemas/knowledge-asset.schema.json` 对齐：知识资产统一携带 `source_refs`、`relations`、`metadata`、`version`、`status`、`created_at`、`updated_at`；笔记与卡片通过 `anchors`（`pdf_page` / `text_quote` / `line_range` 等）回溯原文位置。

对齐不是口号，而是被测试锁住的：`tests/data/contract-alignment.test.ts` 会读取工作区的
`schemas/KnowledgeAsset.py`，逐字比对 `AssetType`、`AssetStatus`、`RelationType`、`Anchor.kind`、
`SourceRef.source_type` 的枚举取值，任何一方多出或缺少取值都会失败。

两处因此暴露出来的互操作缺陷已修复（它们原本会让 uRead 无法表达来自 SAG 的引用）：

| 取值 | 位置 | 为什么必须有 |
| --- | --- | --- |
| `line_range` | `AnchorKind` | SAG 的证据形态是「文件 + 起始行 + 结束行」，uRead 此前没有对应锚点类型 |
| `local_file` | `SourceRef.source_type` | uAI Core 把已发布资产落到 vault 后，检索证据的来源类型就是 `local_file` |

本地新建的资产一律以 `status='candidate'` 落库：UI 不会把未经人工审核的内容标成已发布。

## 部署

GitHub Actions `deploy.yml` 使用官方 Pages 流程：

- `npm ci`（使用 lockfile，可复现）
- 类型检查 → 单元测试 → 构建
- `actions/configure-pages` + `upload-pages-artifact` + `deploy-pages`

站点以 `https://zhubao315.github.io/uRead/` 子路径部署，`vite.config.ts` 的 `base` 与路由 `basename` 均已对齐；构建产物包含 `404.html`，深层路由刷新不会 404。

文档站（`docs/` → Hugo + OINK）构建到 `docs-site/`，再由同一条 deploy 工作流复制进
`dist/docs/`，因此**应用与文档共用同一个 Pages 产物**，文档在 `/uRead/docs/`，
文档首页也有回应用（`/uRead/`）的路——`docs:check` 会把这条链接当成断言。
Hugo 的构建警告一律视为失败（唯一豁免是主题的 libsass 弃用提示）。

## 许可

MIT，见 `LICENCE`。
