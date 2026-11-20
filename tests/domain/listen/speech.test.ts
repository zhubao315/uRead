/** 朗读文本层：不改作者原意，只去语法噪音；分段 id 稳定且顺序不变。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cleanForSpeech } from '../../../src/domain/listen/speech-text';
import { segmentForSpeech } from '../../../src/domain/listen/speech-segmenter';

const SOURCE = `---
title: 元数据
---
# 概述

第一段 **重点** 与 [链接](https://example.com)。

> 引用原文。

## 要点

- 第一条
- 第二条

\`\`\`js
const secret = 1;
\`\`\`

| 列A | 列B |
| --- | --- |
| 值1 | 值2 |
`;

describe('朗读文本清理', () => {
  it('去 frontmatter / 代码 / 链接语法，保留正文与重点词', () => {
    const clean = cleanForSpeech(SOURCE);
    expect(clean).not.toContain('title: 元数据');
    expect(clean).not.toContain('const secret');
    expect(clean).not.toContain('https://example.com');
    expect(clean).toContain('第一段 重点 与 链接');
    expect(clean).not.toContain('|');
  });

  it('空输入返回空数组', () => {
    expect(segmentForSpeech('')).toEqual([]);
  });
});

describe('朗读分段', () => {
  it('按标题与段落切分，顺序与标题保留', () => {
    const segments = segmentForSpeech(SOURCE);
    expect(segments.length).toBeGreaterThan(2);
    expect(segments[0].heading).toBe('概述');
    expect(segments.map((s) => s.index)).toEqual(segments.map((_, i) => i));
    expect(segments.some((s) => s.heading === '要点')).toBe(true);
  });

  it('相同内容生成相同 id，内容变化 id 变化', () => {
    const a = segmentForSpeech('第一段。\n\n第二段。');
    const b = segmentForSpeech('第一段。\n\n第二段。');
    const c = segmentForSpeech('第一段。\n\n第二段 changed。');
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
    expect(a.map((s) => s.id)).not.toEqual(c.map((s) => s.id));
  });
});
