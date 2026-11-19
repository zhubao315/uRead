---
type: docs
title: 当前项目状态（唯一基线）
weight: 5
menus:
  main:
    weight: 5
description: "uRead 当前状态的唯一基线：版本、真实能力、复核命令与已知限制。历史审计仅作时点快照。"
---

> 状态基准：**2026-11-19** · 版本 **0.23.0**
> 本文件是「现在是什么样」的唯一入口。历史审计（`docs/audit/*`）只代表审计当天的代码，
> 不得作为当前待办清单使用——已有多次 AI 智能体读到旧文档后重做已完成功能的风险。

## 1. 一句话现状

uRead 是**本地优先的阅读与知识工作台**：个人数据只进浏览器 IndexedDB（八类 store，无账号、无服务端）；
公开内容是另一套**构建期生成的静态只读产物**，两者不共享写入路径。

## 2. 可复核数字（全部跑过，不是 README 抄的）

| 口径 | 真实值 | 复核命令 |
| --- | --- | --- |
| 版本 | 0.23.0 | `node -p "require('./package.json').version"` |
| 单元测试 | 212 passed / 1 skipped / 213（29 文件） | `npm test` |
| 全量门禁 | PASS=37 FAIL=0 | `cd .. && ROUND=72 bash scripts/quality_round.sh` |
| 发布检查 | 35/35 | `cd .. && python3 scripts/release_check.py` |
| 变异 | 92 处 / 26 套件 | `cd .. && python3 scripts/mutation_check.py` |
| 公开笔记 | 1634 篇 / 10 篇音频 | `cat public/notes/manifest.json` |
| 公开栏目 | 10 主题 / 39 书单 | `cat public/lists/manifest.json` |
| 书库 | 2 本（EPUB + PDF） | `cat dist/books/catalog.json` |
| 深链回退 | 1691 条路由 | `npm run build:fallbacks` 输出 |

## 3. 真实能力清单

| 能力 | 状态 | 依据 |
| --- | --- | --- |
| 资料库 / 笔记 / 卡片 / 书单 CRUD | IMPLEMENTED | `src/data/repository.ts`、`tests/data/repository.test.ts` |
| IndexedDB 八类数据与 JSON 完整备份 | IMPLEMENTED | `src/data/db.ts`、`tests/data/ui-invariants.test.ts`（清空 store 数 === 8） |
| 全站搜索、URL 状态同步 | IMPLEMENTED | `src/components/Search.tsx`、`tests/components/search-and-state.test.tsx` |
| 公开笔记（浏览 / 搜索 / 音频 / 深链） | IMPLEMENTED | `src/views/PublicNotesView.tsx`、`public/notes/` |
| 主题阅读 / 书单推荐 | IMPLEMENTED | `src/views/PublicListView.tsx`、`public/lists/` |
| EPUB / PDF 静态书库 | IMPLEMENTED（PDF 用浏览器原生） | `book-library/reader.html`、`book-library/build.py` |
| 离线外壳 / 夜间模式 / 深链回退 | IMPLEMENTED | `public/sw.js`、`src/index.css`、`scripts/make-fallback-pages.mjs` |
| AI 摘要 / 知识抽取 / 推荐 | PLANNED | README 明确标注未实现；仓库无 AI Provider、无提示词、无模型调用 |
| 跨设备同步 / 知识复习 / 知识图谱 | PLANNED | 无对应 store、路由或测试 |
| EPUB 原文锚点回跳 | PARTIAL | 仅保存阅读位置 `lastLocation`，未做到选区→批注→锚点→回跳闭环 |
| 公开发布权限治理 | PARTIAL | 当前是全量公开 + 同步脚本；无逐篇授权、预览、撤回 |

## 4. 数据边界（务必区分）

1. **私人 IndexedDB**：只在你的浏览器里；八类 store；没有服务端。
2. **私有 Obsidian 仓库**：`zhubao315/obsidian-vault`（private）；token 只在环境变量。
3. **公开静态产物**：`public/notes/`、`public/lists/`、`public/audio/`、`book-library/books/`
   会随 Pages 发布，**不可收回**。
4. **本地缓存**：`.notes-cache/`、`.lists-cache/`、`.gitignore` 排除，装的是私有正文。

## 5. 已知限制（不要当 bug 反复查）

- 公开笔记没有 backlinks / graph view / transclusion；不迁 Quartz 的决定见 `IMPLEMENTATION_PLAN.md` 轮次 33。
- 栏目同步靠本机 cron，不是 webhook；页面 30 秒检查 manifest 版本。
- 58 MiB PDF 触发 GitHub 大文件告警；公开产物预算 300 MiB。
- 本沙箱没有浏览器；真机触摸/横竖屏/离线项由 `MULTI_DEVICE.md` 人工验收。

## 6. 复核入口

应用：<https://zhubao315.github.io/uRead/>
发布：`.github/workflows/deploy.yml`（Pages Actions，main 分支触发）
历史：仓库根 `CHANGELOG.md`、工作区 `IMPLEMENTATION_PLAN.md`（轮次台账）
