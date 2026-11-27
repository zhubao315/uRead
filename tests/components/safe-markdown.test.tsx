/**
 * 正文渲染回归：Obsidian 的图片嵌入必须在页面上变成真正的 <img>，
 * 不能再把 ![[file.jpg]] 或裸文件名漏给读者。
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SafeMarkdown from '../../src/components/SafeMarkdown';

describe('SafeMarkdown 图片嵌入', () => {
  it('有映射时 ![[图片.jpg]] 渲染为本地图片，不漏出标记语法', () => {
    render(
      <SafeMarkdown
        source={'# 《1984》 读书笔记\n\n> ![[《1984》-乔治·奥威尔.jpg]]\n> 📖 豆瓣读书'}
        images={{ '《1984》-乔治·奥威尔.jpg': '/uRead/media/books/abc123.jpg' }}
      />,
    );

    const image = screen.getByRole('img', { name: '《1984》-乔治·奥威尔' });
    expect(image).toHaveAttribute('src', '/uRead/media/books/abc123.jpg');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(document.body).not.toHaveTextContent('![[');
  });

  it('没有映射时显示占位文字，不把 ![[...]] 当普通文字显示', () => {
    render(<SafeMarkdown source={'段落 ![[缺失.png]] 结束'} />);

    expect(screen.getByText('[图片：缺失.png]')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('![[');
  });

  it('普通 wikilink 与图片嵌入同时出现时各自正确解析', () => {
    render(
      <SafeMarkdown
        source={'![[a.jpg]] 与 [[相关笔记|别名]]'}
        links={{ 相关笔记: 'slug-1' }}
        images={{ 'a.jpg': '/uRead/media/embeds/a.jpg' }}
      />,
    );

    expect(screen.getByRole('img', { name: 'a' })).toHaveAttribute('src', '/uRead/media/embeds/a.jpg');
    expect(screen.getByRole('link', { name: '别名' })).toHaveAttribute('href', '/read/slug-1');
  });
});
