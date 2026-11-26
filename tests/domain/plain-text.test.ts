/** 摘要是正文的派生展示，不应把 Obsidian 标记语法带到列表 / 首页 / RSS。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { excerptFromBody } from '../../scripts/plain-text.mjs';

describe('正文摘要纯文本化', () => {
  it('图片嵌入与普通 wikilink 都不漏出标记', () => {
    const body = '\n# 《1984》 读书笔记\n\n> ![[《1984》-乔治·奥威尔.jpg]]\n> 📖 [[豆瓣读书|条目]]\n> 一段正文。';
    const text = excerptFromBody(body);

    expect(text).not.toContain('![[');
    expect(text).not.toContain('[[');
    expect(text).toContain('《1984》 读书笔记');
    expect(text).toContain('条目');
    expect(text).toContain('一段正文。');
  });

  it('代码围栏与 Markdown 链接不进入摘要', () => {
    const text = excerptFromBody('简介 ![封面](https://example.com/a.png) [链接](https://example.com)\n```\nsecret\n```');

    expect(text).toContain('简介');
    expect(text).not.toContain('secret');
    expect(text).not.toContain('](');
  });
});
