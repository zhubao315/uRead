/** Content Edition 首页 / 书单中枢 / 分组搜索：只渲染真实产物，验证两类内容不混流。 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentHomeView from '../../src/views/ContentHomeView';
import BooklistsHubView from '../../src/views/BooklistsHubView';
import FindView from '../../src/views/FindView';

const note = {
  slug: 'B1-文学虚构__三体', title: '三体', author: '刘慈欣', category: 'B1-文学虚构',
  created: '', updated: '2026-11-18', source: '', status: '', tags: [], aliases: [],
  body: '黑暗森林法则', source_ref: { path: '', sha: '', url: '' }, content_hash: 'h1', audio: true,
};
const manifest = { version: 'v1', generated_at: '2026-11-19T00:00:00Z', note_count: 1, audio_count: 1, source: 'github', repo: '', branch: '', note_path: '' };
const theme = {
  id: 't1', kind: 'theme' as const, slug: '人生哲学', title: '人生哲学', description: '关于人生意义',
  tags: [], updated: '', body: '', books: [], book_count: 23, linked_notes: 20,
  source_ref: { path: '', sha: '' }, content_hash: 't1',
};
const booklist = { ...theme, id: 'l1', kind: 'booklist' as const, title: '2026年度书单', description: '年度计划', book_count: 47 };
const listsManifest = { version: 'v2', theme_count: 1, booklist_count: 1, generated_at: '', source: '', note_path: '' };
const book = { id: 'b1', title: '朱光潜作品集', author: '朱光潜', format: 'epub', cover: '' };

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = String(input);
    const body = url.includes('books/catalog.json') ? [book]
      : url.includes('lists/manifest.json') ? listsManifest
        : url.includes('lists/themes.json') ? [theme]
          : url.includes('lists/booklists.json') ? [booklist]
            : url.includes('notes/manifest.json') ? manifest : [note];
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('内容门户首页', () => {
  it('展示真实数字、精选书单与主题，搜索指向统一检索', async () => {
    render(<MemoryRouter><ContentHomeView /></MemoryRouter>);
    expect(await screen.findByText(/1 篇读书笔记/)).toBeInTheDocument();
    expect(screen.getByText('人生哲学')).toBeInTheDocument();
    expect(screen.getByText('2026年度书单')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索书名、作者、笔记或主题……')).toBeInTheDocument();
  });
});

describe('统一书单中枢', () => {
  it('保留主题与书单两种类型，筛选只留书单', async () => {
    render(<MemoryRouter><BooklistsHubView /></MemoryRouter>);
    expect(await screen.findByText('人生哲学')).toBeInTheDocument();
    expect(screen.getByText('2026年度书单')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '书单' }));
    expect(screen.queryByText('人生哲学')).not.toBeInTheDocument();
    expect(screen.getByText('2026年度书单')).toBeInTheDocument();
  });
});

describe('统一搜索', () => {
  it('结果按书籍/笔记/书单/主题分组，不混成一条流', async () => {
    render(<MemoryRouter initialEntries={['/find?q=三体']}><FindView /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: /读书笔记/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '三体' })).toBeInTheDocument();
  });
});
