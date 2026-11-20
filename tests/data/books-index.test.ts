/** 书籍关联：权威 wikilink 才聚合，同书名不同作者不自动合并，原始说明保留。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildBookCatalog, renderBookDetail, renderBookIndex } from '../../scripts/books-index.mjs';

const note = (slug: string, title: string, author = '') => ({
  slug, title, author, category: 'B1-文学虚构', body: '## 摘录\n\n一段原文。',
  audio: false, source_ref: { path: `books/${slug}.md`, sha: '' },
});
const list = {
  id: 'l1', kind: 'booklist', title: '年度书单',
  books: [{
    name: '《三体》', author: '刘慈欣', note: '《三体》', note_slug: 'note-1',
    note_title: '三体', detail: '中国科幻的里程碑，值得反复读黑暗森林。',
  }],
};

describe('书籍索引聚合', () => {
  it('书单的已解析 wikilink 才是权威关联，推荐说明不丢', () => {
    const { books } = buildBookCatalog([note('note-1', '三体（全集）', '刘慈欣')], [list]);
    expect(books).toHaveLength(1);
    expect(books[0].notes.map((n) => n.slug)).toEqual(['note-1']);
    expect(books[0].lists[0].recommendation).toContain('黑暗森林');
    expect(books[0].aliases).toContain('《三体》');
  });

  it('同名不同作者不合并，保留两条原始书名', () => {
    const { books } = buildBookCatalog([
      note('a', '《人生》', '路遥'), note('b', '《人生》', '季羡林'),
    ], []);
    expect(books).toHaveLength(2);
    expect(books.map((b) => b.original_title)).toEqual(['《人生》', '《人生》']);
    expect(books.map((b) => b.author)).toEqual(['路遥', '季羡林']);
  });

  it('未关联的笔记各自成书，不因为标题相似而丢掉', () => {
    const { books, summary } = buildBookCatalog([
      note('a', '甲笔记'), note('b', '乙笔记'),
    ], []);
    expect(summary.unlinked_notes).toBe(2);
    expect(books).toHaveLength(2);
  });


  it('只在书名作者唯一吻合时写入真实 library_book_id，并用它生成阅读链接', () => {
    const { books } = buildBookCatalog(
      [note('n1', '《吾辈如神》-彼得·戴曼迪斯', '彼得·戴曼迪斯')],
      [],
      [{ id: 'lib-abc', title: '《吾辈如神》', author: '彼得·戴曼迪斯', format: 'pdf', cover: '' }],
    );
    expect(books[0].library_book_id).toBe('lib-abc');
    expect(renderBookDetail(books[0])).toContain('reader.html?id=lib-abc');
  });

  it('没有匹配电子书时不生成假阅读链接，首页仍展示真实电子书区', () => {
    const { books } = buildBookCatalog([note('n1', '无匹配的笔记', '')], [], []);
    expect(books[0].library_book_id).toBe('');
    expect(renderBookDetail(books[0])).not.toContain('reader.html?id=');
    const html = renderBookIndex(books, [
      { id: 'lib-xyz', title: '《真实书》', author: '作者', format: 'epub', cover: '' },
    ]);
    expect(html).toContain('reader.html?id=lib-xyz');
    expect(html).toContain('可在线阅读的电子书');
  });

  it('详情页面不含假封面，空关联给出真实空状态', () => {
    const book = {
      ...buildBookCatalog([note('a', '无封面书')], []).books[0],
      notes: [], cover: '',
    };
    const html = renderBookDetail(book);
    expect(html).toContain('这本书还没有关联笔记');
    expect(html).not.toContain('<img class="cover"');
  });
});
