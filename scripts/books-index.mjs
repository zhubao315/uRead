/**
 * Phase 2 内容关联：从真实笔记 + 书单生成书籍索引。
 *
 * 硬规则：
 * - 不自动合并同名书；只有书单里已解析的 wikilink 才算「书 → 笔记」的权威关联。
 * - 未被书单引用的笔记，各自生成一条书籍记录（保留原始标题，不按相似度合并）。
 * - 原始书名、作者、别名、推荐说明、书目顺序全部保留，展示层只是索引。
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

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
        library_book_id: '',
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

  // 3) 只在「规范化书名 + 作者」都吻合且唯一时，才关联真实电子书。
  //    不做模糊合并；library_book_id 只允许来自 catalog.json 的真实 ID。
  const normAuthor = (value) => String(value ?? '').replace(/[\s（）()·、,，]/g, '').toLowerCase();
  for (const book of books.values()) {
    const candidates = libraryBooks.filter((item) => {
      const titleA = norm(item.title);
      const titleB = norm(book.original_title);
      const titleOk = titleA === titleB || titleB.startsWith(titleA) || titleA.startsWith(titleB);
      const authorA = normAuthor(item.author);
      const authorB = normAuthor(book.author);
      const authorOk = !authorA || !authorB || authorA.includes(authorB) || authorB.includes(authorA);
      return titleOk && authorOk;
    });
    if (candidates.length === 1) {
      const exact = candidates[0];
      book.cover = exact.cover || '';
      book.format = exact.format || '';
      book.library_book_id = exact.id;
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

// 与 React 顶部栏共用的站点导航（logo / 五栏目 / 图标 / 激活态），单一来源。
const SITE_NAV = readFileSync(new URL('../book-library/site-nav.html', import.meta.url), 'utf8');

/** 静态书页封面：真实 EPUB 封面优先，否则用 media:build 生成的确定性 SVG 主题视觉。 */
const bookCover = (book, realPrefix, mediaPrefix) => {
  const src = book.cover
    ? `${realPrefix}${esc(book.cover)}`
    : `${mediaPrefix}media/books/${encodeURIComponent(book.id)}.svg`;
  return `<span class="cover-wrap"><img class="cover" src="${src}" alt="" width="64" height="92" loading="lazy" decoding="async"></span>`;
};
const STYLE = `:root{--navy:light-dark(#17243A,#f1f5f9);--heading:light-dark(#172033,#f1f5f9);--brand:light-dark(#2457A6,#93c5fd);--page:light-dark(#f8fafc,#0f172a);--line:light-dark(#e5e7eb,#334155);--muted:light-dark(#64748B,#cbd5e1);--surface:light-dark(#fff,#1e293b)}
body{font-family:Inter,sans-serif;margin:0;padding:0;color:var(--navy);background:var(--page)}
.uread-page{max-width:1280px;margin:2rem auto;padding:0 1rem}
h1,h2{color:var(--heading)} a{color:var(--brand);text-decoration:none} a:hover{text-decoration:underline}
.card{border:1px solid var(--line);border-radius:8px;padding:1rem;margin:.6rem 0;background:var(--surface);box-shadow:0 1px 2px rgba(23,36,58,.06)}
.small{color:var(--muted);font-size:.85rem} mark{background:light-dark(#DCE8F8,#1e3a8a)}
input{width:100%;max-width:32rem;padding:.6rem .8rem;border:1px solid light-dark(#cbd5e1,#475569);border-radius:4px;font:inherit;background:var(--surface);color:var(--navy)}
.uread-nav-search input{width:auto}
.cover{display:block;width:64px;height:92px;object-fit:cover;border-radius:4px}
.cover-wrap{position:relative;float:left;margin:0 1rem 1rem 0;transition:transform .3s ease}
.cover-wrap::after{content:"";position:absolute;top:0;left:0;bottom:0;width:10px;border-radius:4px 0 0 4px;background:linear-gradient(90deg,rgba(255,255,255,.4),rgba(255,255,255,0));pointer-events:none}
.card{transition:transform .25s ease,box-shadow .25s ease}
.card:hover{transform:translateY(-4px);box-shadow:0 12px 24px -8px rgba(15,23,42,.25)}
.card:hover .cover-wrap{transform:scale(1.04)}
.uread-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.8rem;margin:1.4rem 0 1.8rem}
.uread-stat{font:inherit;cursor:pointer;border:1px solid var(--line);border-radius:8px;padding:.8rem 1rem;background:var(--surface);text-align:center;transition:border-color .2s,background .2s,transform .2s}
.uread-stat:hover{border-color:var(--brand);transform:translateY(-2px)}
.uread-stat[aria-pressed="true"]{border-color:var(--brand);box-shadow:inset 0 0 0 1px var(--brand)}
.uread-stat strong{display:block;font-size:1.4rem;color:var(--brand);line-height:1.2}
.uread-stat span{font-size:.78rem;color:var(--muted)}
@media(prefers-reduced-motion:reduce){.card,.cover-wrap,.uread-stat{transition:none}.card:hover,.card:hover .cover-wrap,.uread-stat:hover{transform:none}}
@media(max-width:640px){.uread-page{margin:1rem auto}.cover{width:48px;height:70px}.cover-wrap{margin:0 .8rem .8rem 0}}`;

export function renderBookIndex(books, libraryBooks = []) {
  const rows = books.map((book) => `
    <article class="card" data-search="${esc(`${book.original_title} ${book.author} ${book.aliases.join(' ')}`.toLowerCase())}"
      data-has-notes="${book.notes.length ? 1 : 0}" data-has-lists="${book.lists.length ? 1 : 0}" data-has-reader="${book.library_book_id ? 1 : 0}">
      ${bookCover(book, './', '../')}
      <h2><a href="./${book.id}/">${esc(book.original_title)}</a></h2>
      <p class="small">${esc(book.author || '作者未标注')} · ${book.notes.length} 篇笔记 · ${book.lists.length} 份书单</p>
    </article>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark">
<title>书籍索引 · uRead</title>
<meta name="description" content="uRead 个人阅读档案：按书名、作者与主题浏览公开读书笔记与电子书。">
<link rel="canonical" href="https://zhubao315.github.io/uRead/books/">
<meta property="og:title" content="书籍索引 · uRead">
<meta property="og:image" content="https://zhubao315.github.io/uRead/brand/icon-512.png">
<style>${STYLE}</style></head><body>
${SITE_NAV}
<main class="uread-page">
<p class="small"><a href="../">← 返回 uRead</a></p>
<h1>书籍索引</h1>
<p class="small">共 ${books.length} 条书籍记录。原始书名保留，同名不自动合并；没有关联笔记的书也如实列出。</p>
<section class="uread-stats" aria-label="书籍统计，可点击筛选">
  <button class="uread-stat" type="button" data-filter="all" aria-pressed="true"><strong>${books.length}</strong><span>书籍记录</span></button>
  <button class="uread-stat" type="button" data-filter="notes" aria-pressed="false"><strong>${books.filter((book) => book.notes.length).length}</strong><span>有关联笔记</span></button>
  <button class="uread-stat" type="button" data-filter="lists" aria-pressed="false"><strong>${books.filter((book) => book.lists.length).length}</strong><span>收录于书单</span></button>
  <button class="uread-stat" type="button" data-filter="reader" aria-pressed="false"><strong>${libraryBooks.length}</strong><span>可在线阅读</span></button>
</section>
<label for="q" class="small">搜索书名或作者</label>
<input id="q" type="search" placeholder="搜索书名或作者" aria-label="搜索书名或作者">
<div id="list">${rows}</div>
<p class="small" id="empty" hidden>没有匹配的书。</p>
<section id="library-section" class="mt-8" aria-labelledby="library-books">
  <h2 id="library-books">可在线阅读的电子书</h2>
  <p class="small">来自本地 EPUB/PDF 书库，共 ${libraryBooks.length} 本。完整目录见 <a href="./library.html">电子书库</a>。</p>
  <ul>${libraryBooks.map((item) => `
    <li class="card">
      <a href="./reader.html?id=${encodeURIComponent(item.id)}">${esc(item.title)}</a>
      <span class="small">${esc(item.author || '作者未标注')} · ${esc(item.format || '').toUpperCase()}</span>
    </li>`).join('')}</ul>
</section>
<script>
  const q = document.getElementById('q');
  const cards = [...document.querySelectorAll('#list .card')];
  const stats = [...document.querySelectorAll('.uread-stat')];
  let activeFilter = 'all';
  const applyFilters = () => {
    const word = q.value.trim().toLowerCase();
    const readerOnly = activeFilter === 'reader';
    // 电子书在独立区块，点「可在线阅读」时只显示它，不混进 1804 条聚合卡片。
    document.getElementById('list').hidden = readerOnly;
    document.getElementById('empty').hidden = true;
    let shown = 0;
    if (!readerOnly) {
      for (const card of cards) {
        const byWord = !word || card.dataset.search.includes(word);
        const byFilter = activeFilter === 'all' || card.getAttribute('data-has-' + activeFilter) === '1';
        card.hidden = !(byWord && byFilter);
        if (!card.hidden) shown += 1;
      }
      document.getElementById('empty').hidden = shown > 0;
    }
    for (const stat of stats) stat.setAttribute('aria-pressed', String(stat.dataset.filter === activeFilter));
  };
  q.value = new URLSearchParams(location.search).get('q') || '';
  q.addEventListener('input', applyFilters);
  for (const stat of stats) {
    stat.addEventListener('click', () => { activeFilter = stat.dataset.filter; applyFilters(); });
  }
  applyFilters();
</script>
</main>
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
  const reader = book.library_book_id ? `<p><a href="./reader.html?id=${encodeURIComponent(book.library_book_id)}">在线阅读原文 →</a></p>` : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark">
<title>${esc(book.original_title)} · uRead</title>
<meta name="description" content="${esc(book.notes[0]?.excerpt?.slice(0, 120) || `${book.original_title} 的阅读档案、关联笔记与书单。`)}">
<link rel="canonical" href="https://zhubao315.github.io/uRead/books/${book.id}/">
<meta property="og:title" content="${esc(book.original_title)} · uRead">
<meta property="og:image" content="https://zhubao315.github.io/uRead/brand/icon-512.png">
<style>${STYLE}</style></head><body>
${SITE_NAV}
<main class="uread-page">
<p class="small"><a href="../">← 书籍索引</a> · <a href="../../">uRead 首页</a></p>
${bookCover(book, '../', '../../')}
<h1>${esc(book.original_title)}</h1>
<p class="small">作者：${esc(book.author || '未标注')} · ${book.notes.length} 篇笔记 · ${book.lists.length} 份书单${book.format ? ` · ${esc(book.format.toUpperCase())}` : ''}</p>
${aliases}
${reader}
<h2>关联笔记</h2><ul>${notes}</ul>
<h2>所属书单</h2><ul>${lists}</ul>
</main>
</body></html>`;
}
