/**
 * 构建 uRead 文档站：Hugo Extended + OINK（主题本地 vendor 于 themes/oink）。
 * 产物 docs-site/；发布时 deploy 工作流把它复制进 dist/docs/（Pages：/uRead/docs/）。
 * 严格门禁：Hugo 的 WARN 一律失败，唯一豁免是 OINK 的 libsass→dartsass 弃用提示。
 */
import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_BASE_URL = 'https://zhubao315.github.io/uRead/docs/';
const ALLOWED_WARNING = /css\.Sass: libsass was deprecated/;

function whichHugo() {
  const probe = spawnSync('hugo', ['version'], { cwd: ROOT, encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    console.error('找不到 hugo 二进制：安装 Hugo Extended 0.168+（文档站唯一构建依赖）');
    process.exit(1);
  }
  const line = (probe.stdout || probe.stderr).split('\n')[0] ?? '';
  if (!line.includes('+extended')) {
    console.error(`需要 Hugo Extended（SCSS 由主题内置编译）：${line}`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const urlIndex = args.indexOf('--base-url');
const baseUrl = urlIndex >= 0 && args[urlIndex + 1] ? args[urlIndex + 1] : DEFAULT_BASE_URL;

whichHugo();
await rm(path.join(ROOT, 'docs-site'), { recursive: true, force: true });
const hugo = spawnSync('hugo', ['--gc', '--minify', '--destination', 'docs-site', '--baseURL', baseUrl], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (hugo.stdout) process.stdout.write(hugo.stdout);
if (hugo.stderr) process.stderr.write(hugo.stderr);
if (hugo.status !== 0) process.exit(hugo.status ?? 1);
const warnings = (hugo.stderr ?? '')
  .split('\n')
  .filter((line) => line.startsWith('WARN') && !ALLOWED_WARNING.test(line));
if (warnings.length > 0) {
  console.error(`Hugo 产生了未豁免的警告（${warnings.length} 条），视为失败：`);
  for (const line of warnings.slice(0, 10)) console.error(`  ${line}`);
  process.exit(1);
}
console.log('已生成文档站：docs-site/（发布时复制进 dist/docs/）');
