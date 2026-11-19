# uRead 品牌与视觉审计（2026-11-19）

## 审计范围

README.md、CHANGELOG.md、design-system.md、ui-ux-design-system.md、MULTI_DEVICE.md、package.json、hugo.yaml、vite.config.ts、tailwind.config.js，以及 `src/`、`public/`、`book-library/`、`docs/` 真实目录与全部路由。

## 核心结论

1. **设计规范互相冲突**：旧的 `design-system.md` 仍保留 Glassmorphism、渐变、Dashboard 统计卡、瀑布流笔记等 SaaS 描述；`ui-ux-design-system.md` 已改为 Editorial Reading Library。本次以新版为准，淘汰旧建议。
2. **品牌表达不一致**：Navbar 用内联 SVG 图标 + 文字「uRead」；`index.html` favicon 仍是 Vite 默认 `vite.svg`；没有真正的 Logo 资产。
3. **颜色散落**：`tailwind.config.js` 与 `src/index.css` 各有一套令牌，且新页面曾直接使用十六进制类；旧令牌 `primary/secondary` 与新令牌 `brand/ink/accent` 并存。
4. **字体单一**：全站只引入 Inter，中文标题没有宋体层级，长文阅读缺少出版气质。
5. **图标混用**：`src/components/Icon.tsx` 手写 SVG，线宽 1.5px；同时页面文案与旧组件中残留 Emoji（📖📚🧭），与「统一线性图标」冲突。
6. **布局定位**：公开站 `/` 与工作台 `/workspace` 已在路由上分开，但导航和视觉语言仍共享同一套管理后台风格。

## 值得保留

- 公开内容与 IndexedDB 工作台的数据边界；
- 书籍/笔记/书单/主题四类内容及其真实关联；
- `content-baseline.json` 的内容保全门禁；
- 笔记详情按原文标题分区的阅读排版；
- 30 秒版本检查、深链回退、离线外壳。

## 需要废弃

- 渐变 Logo、Glassmorphism 卡片、Dashboard 统计卡墙、瀑布流笔记；
- Emoji 当功能图标；
- 组件内硬编码颜色；
- 把规划中的 AI/RAG/云同步做成入口。

## 改造清单

| 阶段 | 交付 |
| --- | --- |
| 1 | 本审计 + `brand-direction.md` + `current-ui-inventory.md` |
| 2 | `public/brand/*` SVG/PNG + `docs/design/logo-guidelines.md` |
| 3 | `src/styles/tokens.css` + `docs/design/design-tokens.md` + `icon-system.md` |
| 4+ | 页面级重构（首页 / 移动端 / 笔记 / 书籍书单主题 / 工作台） |

## 边界

本次只做视觉与体验升级；公开范围、原始数据、旧路由、音频关联、EPUB/PDF 书库均不变。
