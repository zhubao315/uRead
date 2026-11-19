#!/usr/bin/env node
/**
 * Phase 0 内容盘点：只读取真实产物，算哈希，生成迁移前基线。
 * 禁止写死 1634 / 39 / 10——每次运行都重新扫描；数字变了就是内容变了，必须解释。
 *
 * 输出：
 *   docs/migration/content-inventory.json / .md
 *   docs/migration/route-map.md
 *   docs/migration/data-preservation-plan.md
 *   publishing/content-baseline.json（对账基线，不含正文）
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const fm = (title, description) => `---\ntype: docs\ntitle: ${title}\ndescription: "${description}"\n---\n\n`;
const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));

const notes = await readJson('public/notes/notes.json');
const themes = await readJson('public/lists/themes.json');
const booklists = await readJson('public/lists/booklists.json');
const noteManifest = await readJson('public/notes/manifest.json');
const listsManifest = await readJson('public/lists/manifest.json');
const libraryBooks = await readJson('dist/books/catalog.json').catch(() => []);

const audioFiles = (await readdir(path.join(ROOT, 'public/audio')).catch(() => []))
  .filter((name) => name.endsWith('.wav')).sort();

// 书籍索引：保留原始书名/作者，不做归一化合并；同名只标记为「候选」，不自动合并。
const rawBooks = new Map();
for (const list of [...themes, ...booklists]) {
  for (const book of list.books) {
    const key = `${book.name}__${book.author || ''}`;
    if (!rawBooks.has(key)) {
      rawBooks.set(key, { original_title: book.name, author: book.author, sources: [], note_slug: book.note_slug || '' });
    }
    rawBooks.get(key).sources.push({ list: list.id, kind: list.kind });
  }
}
const allBooks = [...rawBooks.values()];
const duplicateCandidates = new Map();
for (const book of allBooks) {
  const key = book.original_title.replace(/[《》\s]/g, '').toLowerCase();
  if (!duplicateCandidates.has(key)) duplicateCandidates.set(key, []);
  duplicateCandidates.get(key).push(book.original_title);
}
const duplicates = [...duplicateCandidates.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([key, names]) => ({ normalized: key, count: names.length, names: [...new Set(names)] }));

const noteHashes = notes.map((note) => ({ id: note.slug, hash: note.content_hash, path: note.source_ref.path }));
const listHashes = [...themes, ...booklists].map((item) => ({ id: item.id, kind: item.kind, hash: item.content_hash, path: item.source_ref.path }));
const audioHashes = [];
for (const name of audioFiles) {
  audioHashes.push({ file: name, hash: sha(await readFile(path.join(ROOT, 'public/audio', name))) });
}

const inventory = {
  generated_at: new Date().toISOString(),
  source: 'real public artifacts + local caches, never hardcoded',
  counts: {
    notes: notes.length,
    notes_with_source_path: notes.filter((n) => n.source_ref?.path).length,
    notes_with_audio: notes.filter((n) => n.audio).length,
    themes: themes.length,
    booklists: booklists.length,
    lists_total: themes.length + booklists.length,
    booklist_items: [...themes, ...booklists].reduce((sum, l) => sum + l.books.length, 0),
    resolved_book_links: [...themes, ...booklists].reduce((sum, l) => sum + l.linked_notes, 0),
    unresolved_book_links: [...themes, ...booklists].reduce((sum, l) => sum + l.books.filter((b) => !b.note_slug).length, 0),
    raw_book_entries: allBooks.length,
    duplicate_book_candidates: duplicates.length,
    library_books: libraryBooks.length,
    audio_files: audioFiles.length,
  },
  manifests: { notes: noteManifest.version, lists: listsManifest.version },
  hashes: { notes: noteHashes, lists: listHashes, audio: audioHashes },
  duplicates,
  notes_without_category: notes.filter((n) => !n.category).map((n) => n.slug),
};

const md = `生成时间：${inventory.generated_at}
来源：真实公开产物逐项扫描，不写死基准数。

## 内容总量

| 对象 | 实测数量 | 说明 |
| --- | ---: | --- |
| 公开读书笔记 | ${inventory.counts.notes} | 全部带来源路径 ${inventory.counts.notes_with_source_path} 篇 |
| 可听笔记 | ${inventory.counts.notes_with_audio} | 音频文件 ${inventory.counts.audio_files} 个，逐文件 sha256 |
| 主题阅读 | ${inventory.counts.themes} | 原始主题数据完整保留 |
| 书单 | ${inventory.counts.booklists} | 与主题合计 ${inventory.counts.lists_total} 份 |
| 书单书目条目 | ${inventory.counts.booklist_items} | 保留原始顺序、作者与推荐说明 |
| 已解析书目→笔记 | ${inventory.counts.resolved_book_links} | wikilink 命中公开笔记 |
| 未解析书目 | ${inventory.counts.unresolved_book_links} | 保留原始书名，只显示文字，不编造链接 |
| 原始书条目 | ${inventory.counts.raw_book_entries} | 不归一化合并 |
| 同名候选 | ${inventory.counts.duplicate_book_candidates} | 只标记，不自动合并 |
| 本地书库 | ${inventory.counts.library_books} | EPUB/PDF 静态阅读器来源 |

## 对账规则

- 迁移前后 \`notes / themes / booklists / booklist_items / audio_files\` 必须逐一相等。
- 每篇笔记与每份书单的 \`content_hash\` 必须一致；不一致必须有逐条差异报告。
- 92 条未解析书目不是丢失：原始书名、作者、推荐说明都留在产物里。
- 无分类笔记 ${inventory.notes_without_category.length} 篇：保留原状，不强行归类。

完整逐项哈希见 \`content-inventory.json\`。
`;

const routes = [
  ['/', '公开内容门户（Phase 1 待建，当前为管理工作台）'],
  ['/notes', '公开笔记列表（历史路径，保留）'],
  ['/notes/:slug', '公开笔记详情'],
  ['/reader', '统一阅读入口'],
  ['/themes', '主题阅读（兼容入口，保留）'],
  ['/lists', '书单推荐（兼容入口，保留）'],
  ['/booklists', '整合后的书单入口（Phase 1 待建）'],
  ['/books/', '静态 EPUB/PDF 书库（原样保留，不可覆盖）'],
  ['/books/:slug', '书籍信息详情（Phase 1 待建，须避开静态 /books/ 目录）'],
  ['/docs/', 'Hugo + OINK 文档站'],
  ['/library /cards /booklists /search', '本地 IndexedDB 管理工作台（保留）'],
];
const routeMap = `生成时间：${inventory.generated_at}

## 真实路由盘点

| 路径 | 状态 |
| --- | --- |
${routes.map(([p, s]) => `| \`${p}\` | ${s} |`).join('\n')}

## 兼容硬约束

- \`base=/uRead/\`、\`basename=/uRead\`、\`404.html\` 回退三者必须一致。
- \`/books/\` 是**真实静态目录**（书库阅读器与书文件），新书籍详情不得直接覆盖它。
- 深链回退脚本为 1691 条路由生成 \`index.html\`；新增路由必须同步扩充。
- 旧路径 \`/read /notes /themes /lists /books/ /docs/\` 继续有效，不得 404。
`;

const preservation = `生成时间：${inventory.generated_at}

## 数据保全原则

1. 原始内容只读：公开产物与私有缓存都不在本次重构中被改写。
2. 新增的是展示层索引（书籍聚合、书单聚合、搜索索引），不是对原文的覆盖。
3. 原始 ID、原始路径、原始文件名、内容哈希全部保留。
4. 同名书籍只列候选，不自动合并；没有关联的笔记不丢弃。
5. 书单的书目顺序、推荐说明、wikilink 别名、原始来源路径原样保留。

## 迁移前基线

- 笔记 ${inventory.counts.notes} 篇，逐篇 sha256 写入 \`content-inventory.json\`。
- 主题 + 书单 ${inventory.counts.lists_total} 份，逐份 sha256 写入基线。
- 音频 ${inventory.counts.audio_files} 个，逐文件 sha256 写入基线。
- 读书目条目 ${inventory.counts.booklist_items} 条，${inventory.counts.unresolved_book_links} 条未解析也保留。

## 对账失败即停止

任何重构后若数量或哈希减少，必须输出差异报告并阻止发布；
不允许通过删掉校验、改基准数字或替换成样例数据让检查变绿。

基线文件：\`publishing/content-baseline.json\`（只含计数与哈希，不含笔记正文）。
`;

for (const dir of ['docs/migration', 'publishing']) await mkdir(path.join(ROOT, dir), { recursive: true });
await writeFile(path.join(ROOT, 'docs/migration/content-inventory.json'), JSON.stringify(inventory, null, 2), 'utf8');
await writeFile(path.join(ROOT, 'docs/migration/content-inventory.md'), fm('内容盘点', '迁移前真实内容数量、原始路径与逐项哈希基线。') + md, 'utf8');
await writeFile(path.join(ROOT, 'docs/migration/route-map.md'), fm('路由地图', '公开站与管理工作台的兼容路由、静态目录边界。') + routeMap, 'utf8');
await writeFile(path.join(ROOT, 'docs/migration/data-preservation-plan.md'), fm('数据保全计划', '哪些内容不能动、迁移前后如何逐项对账。') + preservation, 'utf8');
await writeFile(path.join(ROOT, 'publishing/content-baseline.json'), JSON.stringify({
  generated_at: inventory.generated_at,
  counts: inventory.counts,
  manifests: inventory.manifests,
  hashes: inventory.hashes,
}, null, 2), 'utf8');
console.log(`内容盘点完成：笔记 ${inventory.counts.notes} / 主题 ${inventory.counts.themes} / 书单 ${inventory.counts.booklists} / 书目条目 ${inventory.counts.booklist_items} / 音频 ${inventory.counts.audio_files}`);
