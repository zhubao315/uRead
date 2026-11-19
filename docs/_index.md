---
title: 文档
description: "uRead 文档站——实施记录与审计快照。应用本身在 /uRead/，数据全在浏览器本地。"
---

uRead 是一个**数据全在本机浏览器里**的阅读知识库应用（IndexedDB，无账号、无服务端）；
应用入口在 <a href="/uRead/">/uRead/</a>，这里是它的文档：

- **[当前项目状态]({{< ref "/PROJECT-STATUS.md" >}})：唯一状态基线（按真实命令复核）**
- **[产品基线 PRD]({{< ref "/product/PRD.md" >}})：从功能堆叠回归读书内容本身**
- **[内容盘点]({{< ref "/migration/content-inventory.md" >}})：迁移前真实数量与逐项哈希**
- **[路由地图]({{< ref "/migration/route-map.md" >}})：兼容路径与静态目录边界**
- **[数据保全]({{< ref "/migration/data-preservation-plan.md" >}})：什么不能动、如何对账**
- **[发版对账]({{< ref "/migration/reconciliation.md" >}})：数量、哈希、路由与书籍索引最终核对
- [现状审计]({{< ref "/audit/current-state.md" >}}) / [功能矩阵]({{< ref "/audit/feature-matrix.md" >}})：按真实命令与代码判定
- [审计报告]({{< ref "/audit" >}})：Stage 0 审计的时点快照（问题有些已修复，现状见仓库 README）。
- [实施记录 · Stage 3]({{< ref "/IMPLEMENTATION_STAGE3.md" >}})：数据层重建做了什么、验证到哪一步。

行为承诺（备份范围、孤儿条目处理、草稿恢复等）以仓库 `README.md` 与其测试为准——
那些数字和话术都由 `ui-invariants` 与页面级测试逐条核对。
