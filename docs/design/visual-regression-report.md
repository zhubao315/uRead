# 视觉回归报告（2026-11-19）

## 本轮完成

- 品牌资产：6 个 SVG + 2 个 PNG，路径 `public/brand/`，基于 `/oc/tmp/uRead.png` 参考方向重绘为原创 SVG。
- Design Tokens：`src/styles/tokens.css` + `tailwind.config.js` 统一为新品牌色板。
- 图标：`src/components/icons/index.tsx` 提供 20 个 Lucide 风格线性图标；替换了 Navbar、首页、笔记页、书单页、ReaderHub、Dashboard 中的 Emoji。
- 首页：改为杂志式 Hero + 精选书单 + 最新笔记 + 主题 + 推荐书籍 + 品牌页脚；全部读取真实产物。
- 导航：Logo 使用品牌 SVG，去掉渐变方块；favicon 改为品牌 SVG。

## 尚未完成（按任务书分阶段）

- 真机截图与视觉回归对比：本沙箱没有浏览器，无法产出 PC/移动端截图，也不能验证 360–1920px 实际渲染。
- Playwright E2E：仓库当前没有完整 E2E 框架；本轮未新增。
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
