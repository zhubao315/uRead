// Post-build step: add the unified ZHUBAO analytics loader to every generated
// HTML page (SPA shell + static deep-link fallbacks). Idempotent.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = path.resolve(fileURLToPath(new URL('../dist', import.meta.url)));

const SNIPPET = `<meta name="referrer" content="strict-origin-when-cross-origin" />
    <script
      src="/uRead/js/zhubao-analytics.js"
      async
      fetchpriority="low"
      data-site-id="uRead"
      data-site-group="THINK"
      data-repo="zhubao315/uRead"
    ></script>
`;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

let injected = 0;
let already = 0;
let skipped = 0;
for (const file of await walk(dist)) {
  const html = await readFile(file, 'utf8');
  if (html.includes('zhubao-analytics.js')) {
    already++;
    continue;
  }
  if (!html.includes('</head>')) {
    skipped++;
    continue;
  }
  await writeFile(file, html.replace('</head>', `${SNIPPET}</head>`));
  injected++;
}

console.log(`analytics injection: ${injected} added, ${already} already present, ${skipped} skipped`);
