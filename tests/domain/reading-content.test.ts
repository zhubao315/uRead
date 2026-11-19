/** Phase 3 阅读体验：标题分组只做展示，原文不改；相关阅读只用真实分类/标签。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { classifyHeading, SECTION_LABEL, splitNoteSections } from '../../src/domain/note-sections';
import { relatedNotes } from '../../src/domain/note-relations';

const BODY = `开头说明，不丢。

## 高亮划线

> 原文第一段。

## 深度分析

作者的核心观点在这里。

### 相关笔记

- 另一本书的链接

## 元数据

来源：某书。`;

describe('笔记标题分组', () => {
  it('按真实标题切段，原文顺序与内容不变', () => {
    const parts = splitNoteSections(BODY);
    expect(parts.map((p) => p.kind)).toEqual(['intro', 'excerpt', 'understanding', 'extension', 'meta']);
    expect(parts.map((p) => p.heading)).toEqual(['', '高亮划线', '深度分析', '相关笔记', '元数据']);
    expect(parts[1].body).toContain('原文第一段');
    expect(parts[3].body).toContain('另一本书的链接');
    expect(parts.map((p) => p.body).join('')).toContain('来源：某书');
  });

  it('真实高频标题能落到正确分区，未知标题不硬猜', () => {
    expect(classifyHeading('金句摘录')).toBe('excerpt');
    expect(classifyHeading('本书评论')).toBe('understanding');
    expect(classifyHeading('扩展阅读')).toBe('extension');
    expect(classifyHeading('某个没见过的标题')).toBe('other');
    expect(SECTION_LABEL.other).toBe('其他内容');
  });
});

describe('相关阅读', () => {
  it('只用共享标签或同分类，匹配不到返回空', () => {
    const current = { slug: 'a', title: '甲', category: 'B1-文学虚构', tags: ['维度/文学'] };
    const pool = [
      { slug: 'b', title: '乙', category: 'B1-文学虚构', tags: ['维度/文学'] },
      { slug: 'c', title: '丙', category: 'B3-认知成长', tags: ['维度/成长'] },
    ];
    const result = relatedNotes(current, pool);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('b');
    expect(result[0].reason).toContain('共享标签');
    expect(relatedNotes(current, [pool[1]])).toEqual([]);
  });

  it('不把当前笔记自己列为相关', () => {
    const note = { slug: 'a', title: '甲', category: 'B1', tags: ['x'] };
    expect(relatedNotes(note, [note])).toEqual([]);
  });
});
