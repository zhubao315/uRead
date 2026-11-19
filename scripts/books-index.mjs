/**
 * Phase 2 内容关联：从真实笔记 + 书单生成书籍索引。
 *
 * 硬规则：
 * - 不自动合并同名书；只有书单里已解析的 wikilink 才算「书 → 笔记」的权威关联。
 * - 未被书单引用的笔记，各自生成一条书籍记录（保留原始标题，不按相似度合并）。
 * - 原始书名、作者、别名、推荐说明、书目顺序全部保留，展示层只是索引。
 */

import { createHash } from 'node:crypto';

const sha12 = (value) => createHash('sha256').update(value).digest('hex').slice(0, 12);
const norm = (value) => String(value ?? '').replace(/[《》\s]/g, '').toLowerCase();

export function buildBookCatalog(notes, lists, libraryBooks = []) {
  const books = new Map();
  const linkedNotes = new Set();

  const ensure = (title, author, source) => {
    const original_title = String(title ?? '').trim();
    if (!original_title) return null;
    const original_author = String(author ?? '').trim();
    const id = sha12(`${original_title}\u0000${original_author}`);
    if (!books.has(id)) {
      books.set(id, {
        id,
        original_title,
        author: original_author,
        aliases: [],
        source,
        cover: '',
        format: '',
        notes: [],
        lists: [],
      });
    }
    return books.get(id);
  };

  // 1) 书单里的书目：权威关联（note_slug 来自已解析的 wikilink）。
  for (const list of lists) {
    for (const item of list.books) {
      const book = ensure(item.name, item.author, 'booklist');
      if (!book) continue;
      if (item.note && !book.aliases.includes(item.note)) book.aliases.push(item.note);
      if (!book.lists.some((entry) => entry.id === list.id)) {
        book.lists.push({
          id: list.id,
          title: list.title,
          kind: list.kind,
          recommendation: item.detail || '',
          href: list.kind === 'theme' ? `/themes/${list.id}` : `/lists/${list.id}`,
        });
      }
      if (item.note_slug) {
        linkedNotes.add(item.note_slug);
        const note = notes.find((n) => n.slug === item.note_slug);
        if (note && !book.notes.some((n) => n.slug === note.slug)) {
          book.notes.push({
            slug: note.slug,
            title: note.title,
            category: note.category,
            audio: !!note.audio,
            excerpt: note.body.replace(/[#*`>|]/g, '').trim().slice(0, 160),
            source_path: note.source_ref?.path ?? '',
          });
        }
      }
    }
  }

  // 2) 没有被书单引用的笔记：各自成书，保留原始标题，不按相似度合并。
  for (const note of notes) {
    if (linkedNotes.has(note.slug)) continue;
    const book = ensure(note.title, note.author, 'note');
    if (!book) continue;
    if (!book.notes.some((n) => n.slug === note.slug)) {
      book.notes.push({
        slug: note.slug,
        title: note.title,
        category: note.category,
        audio: !!note.audio,
        excerpt: note.body.replace(/[#*`>|]/g, '').trim().slice(0, 160),
        source_path: note.source_ref?.path ?? '',
      });
    }
  }

  // 3) 封面只取「原始书名完全相等」的本地书库条目；不做模糊匹配。
  for (const book of books.values()) {
    const exact = libraryBooks.find((item) => norm(item.title) === norm(book.original_title));
    if (exact) {
      book.cover = exact.cover || '';
      book.format = exact.format || '';
    }
  }

  const result = [...books.values()].sort((a, b) =>
    a.original_title.localeCompare(b.original_title, 'zh-Hans-CN'));
  return {
    books: result,
    summary: {
      book_count: result.length,
      from_booklist: result.filter((b) => b.source === 'booklist').length,
      from_note: result.filter((b) => b.source === 'note').length,
      linked_notes: result.reduce((sum, b) => sum + b.notes.length, 0),
      unlinked_notes: notes.filter((n) => !linkedNotes.has(n.slug)).length,
      raw_booklist_items: lists.reduce((sum, list) => sum + list.books.length, 0),
      with_cover: result.filter((b) => b.cover).length,
    },
  };
}

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const STYLE = `body{font-family:system-ui,-apple-system,"PingFang SC",sans-serif;max-width:1000px;margin:2rem auto;padding:0 1rem;color:#263244;background:#fff}
h1,h2{color:#172033} a{color:#2457A6;text-decoration:none} a:hover{text-decoration:underline}
.card{border:1px solid #e2e8f0;border-radius:6px;padding:1rem;margin:.6rem 0;background:#fff}
.small{color:#64748b;font-size:.85rem} mark{background:#fef3c7}
input{width:100%;max-width:32rem;padding:.6rem .8rem;border:1px solid #cbd5e1;border-radius:4px;font:inherit}
.cover{width:64px;height:92px;object-fit:cover;float:left;margin:0 1rem 1rem 0;border-radius:4px}
@media(max-width:640px){body{margin:1rem auto}.cover{width:48px;height:70px}}`;

export function renderBookIndex(books) {
  const rows = books.map((book) => `
    <article class="card" data-search="${esc(`${book.original_title} ${book.author} ${book.aliases.join(' ')}`.toLowerCase())}">
      ${book.cover ? `<img class="cover" src="./${esc(book.cover)}" alt="">` : ''}
      <h2><a href="./${book.id}/">${esc(book.original_title)}</a></h2>
      <p class="small">${esc(book.author || '作者未标注')} · ${book.notes.length} 篇笔记 · ${book.lists.length} 份书单</p>
    </article>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>书籍索引 · uRead</title>
<style>${STYLE}</style></head><body>
<p class="small"><a href="../">← 返回 uRead</a></p>
<h1>书籍索引</h1>
<p class="small">共 ${books.length} 条书籍记录。原始书名保留，同名不自动合并；没有关联笔记的书也如实列出。</p>
<label for="q" class="small">搜索书名或作者</label>
<input id="q" type="search" placeholder="搜索书名或作者" aria-label="搜索书名或作者">
<div id="list">${rows}</div>
<p class="small" id="empty" hidden>没有匹配的书。</p>
<script>
  const q = document.getElementById('q');
  q.addEventListener('input', () => {
    const word = q.value.trim().toLowerCase();
    let shown = 0;
    for (const card of document.querySelectorAll('#list .card')) {
      card.hidden = !!word && !card.dataset.search.includes(word);
      if (!card.hidden) shown += 1;
    }
    document.getElementById('empty').hidden = shown > 0;
  });
</script>
</body></html>`;
}

export function renderBookDetail(book) {
  const notes = book.notes.map((note) => `
    <li class="card">
      <a href="../read/${encodeURIComponent(note.slug)}/">${esc(note.title)}</a>
      ${note.audio ? '<span class="small"> · 可听</span>' : ''}
      <p class="small">${esc(note.category || '未分类')}${note.source_path ? ` · 来源 ${esc(note.source_path)}` : ''}</p>
      <p>${esc(note.excerpt)}</p>
    </li>`).join('') || '<li class="card small">这本书还没有关联笔记。</li>';
  const lists = book.lists.map((entry) => `
    <li><a href="..${entry.href}/">${esc(entry.title)}</a>${entry.recommendation ? `<span class="small"> — ${esc(entry.recommendation)}</span>` : ''}</li>`).join('') || '<li class="small">未收录在公开书单里。</li>';
  const aliases = book.aliases.length ? `<p class="small">原始 wikilink：${book.aliases.map(esc).join(' / ')}</p>` : '';
  const reader = book.format ? `<p><a href="./reader.html?id=${encodeURIComponent(book.id)}">在线阅读原文 →</a></p>` : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(book.original_title)} · uRead</title>
<style>${STYLE}</style></head><body>
<p class="small"><a href="../">← 书籍索引</a> · <a href="../../">uRead 首页</a></p>
${book.cover ? `<img class="cover" src="../${esc(book.cover)}" alt="">` : ''}
<h1>${esc(book.original_title)}</h1>
<p class="small">作者：${esc(book.author || '未标注')} · ${book.notes.length} 篇笔记 · ${book.lists.length} 份书单${book.format ? ` · ${esc(book.format.toUpperCase())}` : ''}</p>
${aliases}
${reader}
<h2>关联笔记</h2><ul>${notes}</ul>
<h2>所属书单</h2><ul>${lists}</ul>
</body></html>`;
}
