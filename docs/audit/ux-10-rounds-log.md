---
title: UI / UX 与响应速度 10 轮迭代记录
description: "以易用性、专业性、趣味性为视角的 10 次「发现 → 优化 → 验证」循环，每轮均通过类型检查、Lint 与相关测试。"
---

> **历史快照（historical snapshot）**：本文只记录审计当时的状态，不代表当前实现；现状以 `README.md` 与 `docs/PROJECT-STATUS.md` 为准。


日期：2026-11-20
范围：`/oc/upstream/uRead`，仅前端交互与呈现，不改动内容、ID、路由契约与数据结构。

每轮验证：`npm run typecheck` + `npm run lint` + 相关 Vitest 用例；
全部完成后额外执行 `npm run build`、`npm run budget:check`、`npm run test:e2e`。

## 第 1 轮 · 易用性 — 首页首屏被非关键数据阻塞

- **发现**：`ContentHomeView` 用 `Promise.all` 同时等待 4 个请求，361 KB 的书籍聚合与首页配置会拖住整个 Hero。
- **优化**：拆为两个 effect；笔记索引 + 书单先到先渲染 Hero，书籍与配置后台增量填充，并为书籍区提供占位骨架。
- **验证**：`typecheck` / `lint` / `content-edition`（3 项）通过。

## 第 2 轮 · 易用性 — 移动端详情页丢失方位

- **发现**：`MobileBottomNav` 使用精确路径匹配，进入 `/read/:slug`、`/lists/:id` 后无任何 tab 高亮。
- **优化**：改为前缀匹配，并把 `/lists`、`/themes` 归到「书单」tab。
- **验证**：`typecheck` / `lint` / `mobile-nav`（2 项）通过。

## 第 3 轮 · 专业性 — 页面标题与导航播报缺失

- **发现**：只有笔记详情设置 `document.title`，其他页面标签页标题恒定，屏幕阅读器也无从得知换页。
- **优化**：`App` 按路由设置标题（`/read/:slug` 跳过，交给详情自己管理），并增加 `sr-only` 实时播报区。
- **验证**：`typecheck` / `lint` / 全量单测（226 passed / 1 skipped）通过。

## 第 4 轮 · 易用性 — 两个同名的「听这篇笔记」

- **发现**：原文录音播放器与设备语音朗读区域同名，视觉与读屏都无法区分。
- **优化**：分别改为「收听原文录音」与「朗读正文（设备语音）」；保留 E2E 依赖的「收听」按钮名。
- **验证**：`typecheck` / `lint` / `public-notes`（13 项）通过。

## 第 5 轮 · 趣味性 + 专业性 — 长文无进度反馈

- **发现**：长篇笔记阅读时看不到进度。
- **优化**：增加吸顶进度条（`role="progressbar"`），passive scroll + `requestAnimationFrame` 合帧，不抢主线程。
- **验证**：`typecheck` / `lint` / `public-notes`（13 项）通过。

## 第 6 轮 · 易用性 — 搜索缺少清空与快捷键提示

- **发现**：`/` 聚焦快捷键没有任何可见提示；输入后无法一键清空。
- **优化**：增加有关键词时才出现的「清空搜索」按钮，以及 `kbd` 形式的 `/` 提示。
- **验证**：`typecheck` / `lint` / `content-edition`（3 项）通过。

## 第 7 轮 · 专业性 + 易用性 — 阅读排版不可调

- **发现**：正文固定 16px / 1.9 行距。
- **优化**：详情页新增字号（14–22px）与行距（1.7–2.2）控件，写入 `localStorage`，通过 CSS 变量仅作用于当前文章。
- **验证**：`typecheck` / `lint` / `public-notes`（13 项）通过。

## 第 8 轮 · 响应速度 — 首页跳转触发整页重载

- **发现**：首页搜索与「随手翻一份书单」使用 `window.location.href`，重新下载 HTML/JS/CSS，浪费已有缓存与懒加载收益。
- **优化**：改用 `useNavigate` 做 SPA 内跳转。
- **验证**：`typecheck` / `lint` / `content-edition`（3 项）通过。

## 第 9 轮 · 趣味性 — 内容发现缺少偶遇入口

- **发现**：列表页只能搜索/筛选，读者容易陷入固定路径。
- **优化**：在当前筛选结果内增加「随手翻一篇」随机跳转按钮。
- **验证**：`typecheck` / `lint` / `public-notes`（13 项）通过。

## 第 10 轮 · 易用性 + 专业性 — SPA 换页焦点丢失

- **发现**：路由切换后焦点停留在已卸载链接上，键盘与读屏用户失去位置；`<main>` 的 `tabIndex={-1}` 从未被使用。
- **优化**：路径变化时（首次加载除外）把焦点移到 `<main>` 并阻止自动滚动；只依赖 `pathname`，搜索输入不抢焦点。
- **验证**：`typecheck` / `lint` / 全量单测（226 passed / 1 skipped）通过。

## 总体验收

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过 |
| `npm test` | 226 passed / 1 skipped |
| `npm run build` | 通过 |
| `npm run budget:check` | 通过（初始 JS 86.3 KB / CSS 7.6 KB，预算 200/50 KB） |
| `npm run test:e2e` | 25 passed / 1 skipped（桌面 + 移动） |

说明：`npm run docs:check` 的 `404.html` 缺失问题在改造前即存在，与本次 10 轮 UI 迭代无关。
