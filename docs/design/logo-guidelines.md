# uRead Logo 使用规范

## 概念

U + Open Book + Bookmark：字母 U 的外轮廓由两片对称书页构成，中间负空间是书脊，右页的金色短书签代表阅读痕迹。图形完全原创，无渐变、无阴影、无 3D。

## 资产

| 文件 | 用途 |
| --- | --- |
| `public/brand/logo-symbol.svg` | 独立图形，App Icon 基础 |
| `public/brand/logo-horizontal.svg` | 桌面导航横版（图形 + uRead 字标 + 口号） |
| `public/brand/logo-stacked.svg` | 品牌封面 / 宣传图竖版 |
| `public/brand/logo-monochrome.svg` | 单色印刷 / 小尺寸 |
| `public/brand/logo-dark.svg` | 深色背景反白版 |
| `public/brand/favicon.svg` | 浏览器标签 |
| `public/brand/icon-192.png` / `icon-512.png` | PWA / 移动桌面图标 |

## 安全区

以 symbol 的 64×64 viewBox 为基准，四周至少保留 8px（即图形宽高的 1/8）空白。不要裁切书页或书签。

## 最小尺寸

- Favicon / 小尺寸：16×16（仅 symbol）。
- 网页导航：symbol 32px，横版高度 40px。
- 印刷 / 分享卡：symbol 64px 起。

## 背景适配

浅色背景用 `logo-symbol.svg` 或 `logo-horizontal.svg`；深色背景用 `logo-dark.svg`；黑白/印刷用 `logo-monochrome.svg`。金色只用于书签，不随背景改色（深色版仍保留金色）。

## 错误用法（禁止）

- 拉伸、旋转、加阴影/渐变/描边特效；
- 与机器人、星星、芯片、大脑图标组合；
- 把书签改成其他颜色或去掉；
- 在 16px 以下使用横版字标；
- 用 Emoji 或通用书本素材替代。
