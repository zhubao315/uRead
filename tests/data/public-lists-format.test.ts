/**
 * 主题阅读 / 书单推荐解析器的真实断言。
 * 样例按真实 Obsidian 结构合成，不把私有笔记正文写进测试。
 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildListRecord, listKind, parseBookRows, resolveBookLinks } from '../../scripts/lists-format.mjs';

const TABLE = `---
title: "示例主题"
tags:
  - "维度/成长"
updated: 2026-11-18
private_field: 不该出门
---
# 示例主题

> 这是一段摘要。

| # | 书名 | 核心主题 |
|---|------|----------|
| 1 | [[《思考，快与慢》-卡尼曼]] | 快慢思维 |
| 2 | [[《传习录》|传习录]] | 知行合一 |

- 《被讨厌的勇气》- 岸见一郎
`;

const notes = [
  { slug: 'B3-认知成长__《思考，快与慢》-卡尼曼', title: '思考，快与慢', aliases: ['《思考，快与慢》'] },
  { slug: 'B9-哲学宗教__传习录', title: '传习录', aliases: [] },
];

describe('Lists 分类与解析', () => {
  it('只认主题与书单两类，索引页不算书单', () => {
    expect(listKind('∑ 主题-人生哲学.md')).toBe('theme');
    expect(listKind('主题-成长与智慧.md')).toBe('theme');
    expect(listKind('书单-2026年度.md')).toBe('booklist');
    expect(listKind('uRead-8月选品清单.md')).toBe('booklist');
    expect(listKind('∑ 读书笔记-文学虚构.md')).toBeNull();
  });

  it('表格与列表里的书都能抓到，代码与引用不抓', () => {
    const books = parseBookRows(TABLE);
    expect(books.map((book) => book.name)).toEqual([
      '《思考，快与慢》-卡尼曼', '传习录', '被讨厌的勇气',
    ]);
  });

  it('未同步的 wikilink 不产生链接，不编造 slug', () => {
    const books = resolveBookLinks(parseBookRows(TABLE), notes);
    expect(books[0].note_slug).toBe(notes[0].slug);
    expect(books[1].note_slug).toBe(notes[1].slug);
    expect(books[2].note_slug).toBe('');
  });

  it('公开产物只带白名单字段，标题去掉前缀，私有字段不出去', () => {
    const record = buildListRecord({ text: TABLE, sha: 'abc123' }, 'Lists/主题-示例主题.md', notes);
    expect(record?.kind).toBe('theme');
    expect(record?.title).toBe('示例主题');
    expect(record?.description).toBe('这是一段摘要。');
    expect(record?.book_count).toBe(3);
    expect(record?.linked_notes).toBe(2);
    expect(JSON.stringify(record)).not.toContain('private_field');
    expect(record?.source_ref.sha).toBe('abc123');
  });
});
