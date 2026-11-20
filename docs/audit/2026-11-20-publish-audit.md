---
type: docs
title: 2026-11-20 发布治理审计
description: "对发布策略、同步、基线与部署工作流的真实审计，以及专项 2 的修复方案。"
---

审计时间：2026-11-20

## 已验证事实

1. `publishing/policy.json` 有 `require_approval: true`，但 `scripts/publish-policy.mjs` 的 `isNoteAllowed()` 只读取 `mode / deny / allow / category_allow / tag_deny`，**从未读取 `require_approval`** —— 这是一个假开关。
2. `scripts/publish-check.mjs` 能检查已生成内容的授权、敏感信息与孤儿音频，但 `npm run publish:check -- --strict` **没有出现在 `.github/workflows/deploy.yml`**。
3. `scripts/content-inventory.mjs` 同时写 `docs/migration/content-inventory.json` 与 `publishing/content-baseline.json`；`auto-sync` 每次都会重跑它 → **审批基线会被普通扫描自动覆盖**，失去审核意义。
4. `scripts/reconcile-release.mjs` 读取的是已经写好的 `content-inventory.json`，不是实时重新扫描当前公开产物。
5. 同步脚本 `sync-notes.mjs` 会直接把私库目录写入 `public/notes/`；新增笔记若未审核，仍会随 auto-sync 的提交进入仓库。

## 不变量（用户明确要求）

- 当前 1595 篇公开笔记属于**已批准内容**，不得删除或缩小范围。
- 新增 / 修改 / 删除必须有独立审批，未批准不得部署上线。
- 敏感检查与音频权限一致性必须成为生产门禁。
- 扫描报告只含规则名 / slug / 位置，不含正文与 token。

## 修复方案（专项 2）

1. 新增独立 `publishing/approved-baseline.json`，从当前公开笔记一次性生成；普通盘点命令不再覆盖它。
2. `publish-policy.mjs` 增加基线 diff：`added / modified / removed`；`require_approval` 真正生效。
3. `publish-check -- --strict` 检查未批准变更 + 新增/修改笔记的敏感命中；已批准内容中的历史命中只警告不阻断（不擅自下线）。
4. 新增 `publish:preview`（只打印差异）与 `publish:approve`（需显式 `APPROVE=1`，仅人工执行）。
5. deploy 工作流在构建后执行 `verify:release` 与 `publish:check -- --strict`，失败即阻止 Pages 部署。
6. auto-sync 仍负责同步与扫描；它派发的 deploy 会因未审批变更而失败，站点保持上一版，直到人工批准。
