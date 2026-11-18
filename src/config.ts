/**
 * 应用级常量。
 *
 * 单独成模块的原因：`base` 同时被 vite.config.ts（构建期）与路由（运行期）使用，
 * 放在 main.tsx 里会让任何想核对它的测试被迫加载整个 DOM 入口。
 */

/** GitHub Pages 项目子路径。必须与 vite.config.ts 的 `base`（带尾斜杠）一致。 */
export const SITE_SLUG = 'uRead';

/** React Router 的 basename（不带尾斜杠）。 */
export const BASE_NAME = `/${SITE_SLUG}`;

/** vite.config.ts 的 base（带尾斜杠）。 */
export const SITE_BASE = `${BASE_NAME}/`;
