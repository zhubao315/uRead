/**
 * 主题阅读 / 书单推荐的页面层测试：真实渲染，验证「能浏览、能搜、能点进笔记」。
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PublicListDetailView from '../../src/views/PublicListDetailView';
import PublicListView from '../../src/views/PublicListView';

const theme = {
  id: 'theme001', kind: 'theme', slug: '人生哲学', title: '人生哲学',
  description: '关于人生意义的 23 本书', tags: ['维度/成长'], updated: '2026-11-18',
  body: '# 人生哲学\n\n## 导读\n\n一段说明。',
  books: [
    { name: '《沉思录》', author: '马可·奥勒留', note: '《沉思录》', note_slug: 'B9-哲学宗教__沉思录', note_title: '沉思录', detail: '古罗马皇帝的思考' },
    { name: '未同步的书', author: '', note: '', note_slug: '', note_title: '', detail: '' },
  ],
  book_count: 2, linked_notes: 1,
  source_ref: { path: 'Lists/∑ 主题-人生哲学.md', sha: 'abc' }, content_hash: 'hash1111',
};
const list = { ...theme, id: 'list001', kind: 'booklist' as const, title: '2026年度书单', description: '年度阅读计划' };
const manifest = { version: 'v1', theme_count: 1, booklist_count: 1, generated_at: '2026-11-18', source: 'github', note_path: 'Lists' };

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = String(input);
    const body = url.includes('manifest.json') ? manifest
      : url.includes('themes.json') ? [theme] : [list];
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('主题阅读', () => {
  it('列出主题卡片与切换入口，搜索能过滤', async () => {
    render(<MemoryRouter><PublicListView kind="theme" /></MemoryRouter>);
    expect(await screen.findByText('人生哲学')).toBeInTheDocument();
    expect(screen.getByText(/2 本书 · 1 本有笔记/)).toBeInTheDocument();
    expect(screen.getByText('切换到书单推荐 →')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('搜索主题或书名'), { target: { value: '不存在的主题' } });
    expect(screen.getByText('没有匹配的内容，换个关键词试试。')).toBeInTheDocument();
  });
});

describe('书单详情', () => {
  const renderDetail = () => render(
    <MemoryRouter initialEntries={['/lists/list001']}>
      <Routes><Route path="/lists/:id" element={<PublicListDetailView kind="booklist" />} /></Routes>
    </MemoryRouter>,
  );

  it('显示书目，已同步的书可点进笔记，未同步的只是文字', async () => {
    renderDetail();
    expect((await screen.findAllByText('2026年度书单')).length).toBeGreaterThan(0);
    expect(screen.getByText('《沉思录》').closest('a')?.getAttribute('href'))
      .toContain(encodeURIComponent('B9-哲学宗教__沉思录'));
    expect(screen.getByText('未同步的书').tagName).toBe('SPAN');
    expect(screen.getAllByText('有笔记')).toHaveLength(1);
  });
});
