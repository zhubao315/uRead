/**
 * Obsidian Lists 目录 → 公开「主题阅读 / 书单推荐」产物的纯函数。
 * 与 notes-format.mjs 同一原则：只做确定性解析，不发请求、不读文件。
 */

import { createHash } from 'node:crypto';
import { parseFrontmatter } from './notes-format.mjs';

const THEME = /^(?:∑\s*)?主题-/;
const BOOKLIST = /^(?:∑\s*)?书单-|^uRead-\d+月选品清单/;

export function listKind(filename) {
  if (THEME.test(filename)) return 'theme';
  if (BOOKLIST.test(filename)) return 'booklist';
  return null;
}

function cells(line) {
  // wikilink 的别名也用 `|`，先遮住再切列，否则 [[《传习录》|传习录]] 会被劈成两列。
  const masked = line.trim().replace(/\[\[[^\]]+\]\]/g, (match) => match.replace(/\|/g, '\uE000'));
  return masked.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim().replace(/\uE000/g, '|'));
}

/** 表格行 → 书条目。只认「含 [[wikilink]] 或 《书名》」的行，避免把说明表当书单。 */
export function parseBookRows(body) {
  const books = [];
  const seen = new Set();
  let fenced = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('```')) { fenced = !fenced; continue; }
    if (fenced || line.startsWith('>')) continue;
    // 表格行、列表行、编号行才算书；正文散文里的书名不当成书单条目。
    if (!/^(\||[-*+]\s|\d+[.、)\s])/.test(line)) continue;
    const parts = line.startsWith('|') ? cells(line) : [line];
    const joined = parts.join(' ');
    const wikilink = joined.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    const plain = joined.match(/《([^》]+)》/);
    const name = (wikilink?.[2] || wikilink?.[1] || plain?.[1] || '').trim();
    if (!name || seen.has(name)) continue;
    if (!wikilink && !plain) continue;
    seen.add(name);
    books.push({
      name,
      author: parts.find((cell) => cell && cell !== name && !cell.startsWith('[[')
        && /^[\u4e00-\u9fa5A-Za-z·&，, ]{2,24}$/.test(cell.replace(/[*`]/g, ''))) || '',
      note: wikilink ? (wikilink[2] || wikilink[1]).trim() : '',
      note_slug: '',
      note_title: '',
      detail: parts.find((cell) => cell && cell !== name && !cell.includes('[[')
        && cell.replace(/[*`]/g, '').length > 6) || '',
    });
  }
  return books;
}

function titleFrom(meta, filename, kind) {
  const raw = String(meta.title ?? filename.replace(/\.md$/i, ''));
  return raw.replace(/^∑\s*/, '').replace(new RegExp(`^(${kind === 'theme' ? '主题' : '书单'})[-—]\\s*`), '').trim() || raw;
}

/** 把 wikilink 名解析到已同步的公开笔记；解析不到就留空，不做假链接。 */
export function resolveBookLinks(books, notes) {
  const index = new Map();
  for (const note of notes) {
    index.set(note.slug, note);
    index.set(note.slug.split('__').pop() ?? '', note);
    index.set(note.title, note);
    for (const alias of note.aliases ?? []) index.set(alias, note);
  }
  for (const book of books) {
    const hit = index.get(book.note) ?? index.get(book.name);
    if (hit) {
      book.note_slug = hit.slug;
      book.note_title = hit.title;
    }
  }
  return books;
}

export function buildListRecord(record, relativePath, notes) {
  const { meta, body } = parseFrontmatter(record.text);
  const filename = relativePath.split('/').pop() ?? relativePath;
  const kind = listKind(filename);
  if (!kind) return null;
  const books = resolveBookLinks(parseBookRows(body), notes);
  const quote = body.match(/^>\s*(.+)$/m)?.[1]?.replace(/[*`]/g, '').trim() ?? '';
  const slug = filename.replace(/\.md$/i, '').replace(/^∑\s*/, '');
  return {
    id: createHash('sha256').update(relativePath).digest('hex').slice(0, 12),
    kind,
    slug,
    title: titleFrom(meta, filename, kind),
    description: String(meta.description ?? quote),
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    updated: meta.updated ? String(meta.updated) : '',
    body,
    books,
    book_count: books.length,
    linked_notes: books.filter((book) => book.note_slug).length,
    source_ref: { path: relativePath, sha: record.sha },
    content_hash: createHash('sha256').update(record.text).digest('hex').slice(0, 16),
  };
}
