# uRead Design Tokens

实现文件：`src/styles/tokens.css`；Tailwind 映射：`tailwind.config.js`。组件不得写独立颜色。

## 颜色

| Token | 值 | 用途 |
| --- | --- | --- |
| `--navy` | `#17243A` | 标题、正文、品牌深色 |
| `--brand` | `#2457A6` | 主按钮、链接、品牌识别 |
| `--brand-active` | `#477FE8` | 悬停、交互强调 |
| `--mist` | `#DCE8F8` | 专题、标签、浅色区块 |
| `--gold` | `#C58B42` | 书签、少量重点提示 |
| `--page` | `#F3F6FA` | 页面背景 |
| `--surface` | `#FFFFFF` | 内容表面 |
| `--text-secondary` | `#64748B` | 作者、时间、来源 |
| `--border` | `#E2E8F0` | 分割线、卡片描边 |

比例：70% 中性背景/白色，20% 深蓝+品牌蓝，7% 雾蓝，3% 金色。正文区域保持白色或低干扰背景。

## 字体

- 中文标题：`--font-serif`（Noto Serif SC / 思源宋体）
- 中文正文：`--font-sans`（Noto Sans SC）
- 英文/数字：`--font-sans`（Inter 优先）
- 正文行高：`--reading-leading: 1.8`
- 桌面阅读宽度：`--content-width: 720px`

## 间距 / 圆角 / 阴影

基础单位 4px，主网格 8px；圆角 6 / 10 / 14px；卡片极轻阴影，hover 仅边框或 1–2px 位移。

## 动效 / 层级 / 断点

微交互 150–200ms，页面切换 ≤300ms，尊重 `prefers-reduced-motion`。
z-index：base 0 / sticky 20 / nav 50 / overlay 60。
断点沿用 Tailwind：sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536。
