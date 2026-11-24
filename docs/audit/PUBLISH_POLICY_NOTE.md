---
type: docs
title: 发布策略切换待办（人工决策）
weight: 90
description: "当前发布策略模式、被拦截笔记/孤儿音频事实，以及切换到默认拒绝的精确步骤。"
---

> **历史快照（historical snapshot）**：本文只记录审计当时的状态，不代表当前实现；现状以 `README.md` 与 `docs/PROJECT-STATUS.md` 为准。

## 1. 当前状态（2026-11-24 实测）

复核命令：`npm run publish:check`（只读；`--write` 会写 gitignored 的 `publishing/report.json` / `publishing/PREVIEW.md`）。

| 事实 | 数值 |
| --- | --- |
| 公开笔记总数 | 1595 |
| 当前允许 / 拦截 | 1593 / 2 |
| 策略模式 | `publishing/policy.json` → `mode: "allow_all_legacy"`（全量公开的历史模式） |
| 敏感命中 | 11 处（历史已批准，仅提示）；新增/修改 0 处 |
| 审批差异 | 新增 0 / 修改 0 / 删除 0 |
| 孤儿音频 | 8 个（均已在批准基线里，新出现 0 个） |

当前被拦截的 2 篇（原因是敏感信息命中，仅列 slug，正文不进报告）：

1. `B5-科技科普__《趣味网络图解》-小白debug（敏感信息）`
2. `B7-传记人物__史蒂夫乔布斯传__《史蒂夫·乔布斯传》-沃尔特·艾萨克森（第17-24章）（敏感信息）`

**本次审计不修改发布策略模式**：从全量公开切到默认拒绝会立刻改变线上可见内容，属于需要人工确认的发布决策。

## 2. 切换到默认拒绝（allowlist）的精确步骤

1. 生成当前报告并人工复核：
   ```bash
   npm run publish:check -- --write
   cat publishing/PREVIEW.md   # 2 篇被拦截笔记的 slug、8 个孤儿音频 hash
   ```
2. 人工决定 2 篇命中敏感信息的笔记怎么处理：要么修掉上游正文后重新同步，要么明确加入 `deny`。同时决定 8 个孤儿音频是删除还是补回对应正文。
3. 编辑 `publishing/policy.json`（这是唯一开关，判定逻辑在 `scripts/publish-policy.mjs`，已单测覆盖）：
   - `"mode": "allowlist"`；
   - 把要继续公开的 **1593 个 slug** 填进 `allow`（或按分类填 `category_allow`）；`allow` 为空会导致这 1593 篇全部被拦截；
   - 把 2 篇敏感笔记 slug 填进 `deny`（deny 永远优先）；
   - 复核 `tag_deny`、`sensitive_patterns`，保持 `"require_approval": true`，并按需递增 `version`。
4. 重新生成公开产物：当前同步脚本还不会按 `publish-policy.mjs` 过滤 `public/notes/` 与 `public/audio/`，所以只改模式不会让被拦截内容真正下线。需要人工把被拦截笔记及其音频从公开产物移除后再跑 `npm run build`。
5. 人工审批基线：
   ```bash
   npm run publish:preview          # 看与 approved-baseline 的差异
   npm run publish:approve          # 人工确认后才更新 publishing/approved-baseline.json
   ```
6. 验收门禁（必须与 `deploy.yml` 的严格检查一致）：
   ```bash
   npm run publish:check
   npm run publish:check -- --strict   # 退出码必须为 0
   ```
   严格模式会在「未审批变更 / 新增敏感命中 / 策略拦截（`blocked.length > 0`）/ 新增孤儿音频」任一情况出现时失败；切换模式后若 `allow` 不完整，这里会挡住部署。
7. 把 `publishing/policy.json` 与基线变更作为独立 PR 提交，由人复核后再合并部署。
