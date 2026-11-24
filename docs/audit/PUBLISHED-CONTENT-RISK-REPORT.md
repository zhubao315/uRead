---
type: docs
title: 已发布内容风险报告（Phase 0 快照）
weight: 95
description: "uRead 公开产物的事实清单、风险与待批准处置项；不含笔记正文或凭据值。"
---

> 本报告只列事实、数量与状态，不修改发布策略、不删除任何内容、不含笔记正文。

## 1. 公开产物快照（2026-11-24）

| 产物 | 数量 | 字节 | MiB | 线上可访问 |
|---|---:|---:|---:|---|
| `public/notes/` 全部 | 4,589 | 89,175,061 | 85.04 | 是 |
| ├ `detail/*.json`（完整正文） | 4,585 | 65,148,161 | 62.13 | 是 |
| ├ `notes.json` | 1 | 22,432,938 | 21.39 | 是 |
| `public/audio/` WAV | 10 | 120,088,760 | 114.53 | 是 |
| `book-library/books/` EPUB | 5 | 45,052,062 | 42.96 | 是（books/catalog.json） |
| `book-library/covers/` | 5 | 6,848,216 | 6.53 | 是 |

笔记清单：`manifest.json` version `8e4d20afc6ebbde7`，note_count **1599**，source `github`，repo `zhubao315/obsidian-vault`（私库），note_path `07-SOURCES/71-书籍`。

## 2. 发布策略事实

`publishing/policy.json` → `mode: allow_all_legacy`，`allow`/`deny`/`tag_deny` 全空 → **1599/1599 篇允许公开**。敏感规则（手机号/身份证/邮箱/API token/内网地址）仅报告、不过滤产物。

`auto-sync.yml` 在 legacy 模式下执行 `APPROVE=1 npm run publish:approve`，使 `deploy.yml` 的 `publish:check --strict` 恒过；切换正式策略前必须移除该步骤。

## 3. 风险明细

### R1 敏感命中（2 篇，11 处）

| slug | content_hash | 规则命中 | 线上详情 |
|---|---|---|---|
| `B5-科技科普__《趣味网络图解》-小白debug` | `8c9bc76d1205f278` | 内网地址 ×10 | HTTP 200 |
| `B7-传记人物__史蒂夫乔布斯传__《史蒂夫·乔布斯传》-沃尔特·艾萨克森（第17-24章）` | `2302f5423011be9d` | 邮箱 ×1 | HTTP 200 |

误报校正：`1[3-9]\d{9}` 在原始 JSON 文本中的 18 处匹配来自 hash 子串；按 JS 语义在 title/body/tags 中 **0** 处手机号。

### R2 历史正文无法撤回

4,585 个 `detail/*.json` 对应 1,599 个当前 hash → **2,986 个孤儿历史正文（40.57 MiB）**。抽样 100 个全部 HTTP 200 且属于当前 slug。`sync-notes.mjs` 从不清理 `detail/`。

### R3 电子书授权缺口

5 本 EPUB 全部发布，README 声明只有 2 本有权分发；无 `distribution-manifest`。`朱光潜作品集(共六册).epub`（3.72 MiB，id `5a6e6a83b4b2`）不在 4 个同步前缀内，来源无记录。`catalog.json` 的 `rights` 是统一免责声明，不是逐书授权。

### R4 孤儿音频

10 个 WAV 共 114.53 MiB，全部不匹配当前笔记 hash；`publish-approve.mjs` 保留其哈希使 `new_audio_orphans=0`，CI 不告警。每次部署都上传。

### R5 私库元数据

1,599/1,599 条笔记暴露 `source_ref.url`（私库 blob URL + commit SHA）与 `source_path`；`manifest.json` 公开私库名与目录。`publishing/policy.json` 被复制到 `dist/` 公开。

## 4. 待所有者批准项（本报告不执行）

1. 逐本裁定 5 本书的分发授权；把 `book-library/distribution-manifest.json` 从 DRAFT 改为 APPROVED 后，再启用构建 fail-closed。
2. 裁定 2 篇敏感笔记是修改上游正文后重同步，还是加入 deny。
3. 裁定 2,986 个历史正文与 10 个孤儿音频是否清理；批准后改 `sync-notes.mjs` 原子化重建 `detail/`。
4. 裁定私库 URL/path 是否脱敏为"路径 + SHA"，以及是否继续发布 `publishing/policy.json`。
5. 修正基线漂移：README 1,595/2/0.33.1 → 实际 1,599/5/0.34.5；审计文档 8 个孤儿音频 → 10 个。

只读核对命令：`node scripts/book-distribution-check.mjs`（草案阶段只报告、不阻断）。
