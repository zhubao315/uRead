---
title: 文档
description: "uRead 文档站——实施记录与审计快照。应用本身在 /uRead/，数据全在浏览器本地。"
---

uRead 是一个**数据全在本机浏览器里**的阅读知识库应用（IndexedDB，无账号、无服务端）；
应用入口在 <a href="/uRead/">/uRead/</a>，这里是它的文档：

- [审计报告]({{< ref "/audit" >}})：Stage 0 审计的时点快照（问题有些已修复，现状见仓库 README）。
- [实施记录 · Stage 3]({{< ref "/IMPLEMENTATION_STAGE3.md" >}})：数据层重建做了什么、验证到哪一步。

行为承诺（备份范围、孤儿条目处理、草稿恢复等）以仓库 `README.md` 与其测试为准——
那些数字和话术都由 `ui-invariants` 与页面级测试逐条核对。
