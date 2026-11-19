# 视觉回归报告（2026-11-19）

## 本轮完成

- 品牌资产：6 个 SVG + 2 个 PNG，路径 `public/brand/`，基于 `/oc/tmp/uRead.png` 参考方向重绘为原创 SVG。
- Design Tokens：`src/styles/tokens.css` + `tailwind.config.js` 统一为新品牌色板。
- 图标：`src/components/icons/index.tsx` 提供 20 个 Lucide 风格线性图标；替换了 Navbar、首页、笔记页、书单页、ReaderHub、Dashboard 中的 Emoji。
- 首页：改为杂志式 Hero + 精选书单 + 最新笔记 + 主题 + 推荐书籍 + 品牌页脚；全部读取真实产物。
- 导航：Logo 使用品牌 SVG，去掉渐变方块；favicon 改为品牌 SVG。

## 尚未完成（按任务书分阶段）

- 真机截图与视觉回归对比：已用 Playwright（Chromium）在 1440×1000 与 390×844 真机视口运行，截图落在 `screenshots/`；360/375/430/768/1024/1920 仍需用户本地验收。
- Playwright E2E：`npm run test:e2e` → **21 passed / 1 skipped**（desktop + mobile）。
- 工作台 `/workspace` 的独立工具视觉重构：未开始。

## 已执行的自动验证

- `npm run typecheck`：通过
- `npm run lint`：通过
- `npm test`：210 passed / 1 skipped（211）
- `npm run build`：通过（含书库与 1744 条深链回退）
- `npm run docs:build` / `docs:check`：通过
- 工作区 `ROUND=70`：37/37（本轮视觉改动后需复跑确认）

## 内容完整性

本轮未改任何笔记、书单、主题、音频或关联数据；`npm run verify:release` 的内容基线应保持一致。

## Playwright 结果（2026-11-19）

`npm run test:e2e` → **21 passed / 1 skipped / 22**（desktop Chromium 1440×1000、mobile Chromium 390×844）。

| 截图 | 路径 |
| --- | --- |
| PC 首页 | `screenshots/home-desktop.png` |
| 移动端首页 | `screenshots/home-mobile.png` |
| 笔记详情 | `screenshots/note-detail-desktop.png` / `-mobile.png` |
| 书单详情 | `screenshots/booklist-detail-desktop.png` / `-mobile.png` |
| 书籍详情 | `screenshots/book-detail-desktop.png` / `-mobile.png` |
| 工作台 | `screenshots/workspace-desktop.png` / `-mobile.png` |

断言覆盖：真实内容加载、搜索跳转、笔记分区、音频缺失不放假播放器、书单书目表、静态书籍索引/详情不冲突、工作台入口、移动端底部导航可见且无横向溢出。

注意：`baseURL` 已含 `/uRead/`，Playwright 跳转必须用相对路径（`page.goto('read')`），前导斜杠会跳到站点根并触发 Vite base 提示页。
