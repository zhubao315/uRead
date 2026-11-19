---
type: docs
title: 现代 Web 指南扫描与处置
description: "使用 GoogleChrome/modern-web-guidance 的 legacy-scan 结果、已应用修复与按规则丢弃的发现。"
---

生成时间：2026-11-19
工具：GoogleChrome/modern-web-guidance（23k★，Apache-2.0 / 指南 CC-BY-4.0）
安装位置：全局 OpenCode skill `/root/.config/opencode/skills/modern-web-guidance/`（212 个文件，含完整 guides）
遥测：已设置 `DISABLE_TELEMETRY=1`

## 扫描口径

初次扫描：20 处机会 / 5 类指南；复扫：**12 处 / 4 类指南**，全部位于 `themes/oink/`（vendored 第三方）或 `_archive/`（死代码），自有代码与 `index.html` 已无命中。

扫描器只覆盖约 20% 的指南语料，结果按每条指南的 Keep / Drop 标准人工判定，不把静态命中直接当缺陷。

## 已应用（自有代码）

| 指南 ID | 改动 | 防住的坑 |
| --- | --- | --- |
| `customize-scrollbar-color-and-thickness` | `src/index.css` 改用 `scrollbar-color` / `scrollbar-width`，旧 `::-webkit-scrollbar` 收进 `@supports not (scrollbar-color: auto)` | 标准属性与 WebKit 伪元素同时生效时样式冲突 |
| `dark-mode-toggle` + `dark-mode` | `<meta name="color-scheme" content="light dark">` + FOUC 内联脚本；主题存 `localStorage['color-scheme']`；三态规则（系统 / light / dark）；CSS 用 `:root:has(...)` 映射并配合 `light-dark()` | JS 改 `data-theme` 但 CSS 赢过 meta 导致主题不生效；白闪 |
| `js` | `readerHub.ts`、`BookListsView.tsx`、`NotesView.tsx` 的 `[...x].sort()` 改为 `x.toSorted()`；`tsconfig.lib` 升到 ES2023 | 多余浅拷贝与非不可变排序 |
| `improve-text-layout-and-legibility` | 仅短标题 `text-wrap: balance`、长正文 `p/blockquote/li` 用 `text-wrap: pretty`，未全局应用 | 全局 balance 的二进制搜索开销 |
| `defer-rendering-heavy-content` | **检索但未应用**：本站长列表含可聚焦的 wikilink，指南要求应用 `content-visibility: auto` 时必须验证键盘可达性；本沙箱无浏览器，按指南的 MANDATORY 验收条件暂不采用 | 键盘/读屏用户可能接触不到屏外节点 |

## 按规则丢弃（未改）

- `_archive/client-duplicate/src/index.css` 与 `_archive/backend-stub/...`：归档死代码，tsconfig/eslint 已排除，不在发布路径。
- `themes/oink/assets/js/*`：vendored 第三方主题，按许可证原样保留；改它会在上游升级时被覆盖。
- `js/promise-with-resolvers`：`themes/oink/.../sidebar-state.js` 同为 vendor。

## 处置结果

自有代码命中数 **8 → 0**（滚动条 1 处、主题 2 处、数组 3 处，加上 `index.html` 缺失 meta 与 FOUC 脚本）。
剩余 12 处均为按 Drop 标准丢弃的 vendor / archive 项，不是待修缺陷。
