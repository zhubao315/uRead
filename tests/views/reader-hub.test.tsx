/** 统一阅读入口：两种来源汇合、本机进度排序、筛选。 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReaderHubView from '../../src/views/ReaderHubView';

const note = {
  slug: 'B3-认知成长__思考快与慢', title: '思考，快与慢', author: '卡尼曼',
  category: 'B3-认知成长', created: '', updated: '', source: '', status: '', tags: [], aliases: [],
  body: '', source_ref: { path: '', sha: '', url: '' }, content_hash: 'hash-note', audio: true,
};
const manifest = { version: 'v1', generated_at: '', note_count: 1, audio_count: 1, source: 'github', repo: '', branch: '', note_path: '' };
const books = [
  { id: 'book1', title: '朱光潜作品集', author: '朱光潜', format: 'epub', path: 'books/x.epub', cover: '' },
];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = String(input);
    const body = url.includes('books/aggregate.json') ? { books }
      : url.includes('manifest.json') ? manifest : [note];
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('统一阅读入口', () => {
  it('把可听笔记与书放在同一列表，并给出各自跳转', async () => {
    render(<MemoryRouter><ReaderHubView /></MemoryRouter>);
    expect(await screen.findByText('思考，快与慢')).toBeInTheDocument();
    expect(screen.getByText('朱光潜作品集')).toBeInTheDocument();
    expect(screen.getByText('思考，快与慢').closest('a')?.getAttribute('href'))
      .toContain(encodeURIComponent(note.slug));
    expect(screen.getByText('朱光潜作品集').closest('a')?.getAttribute('href'))
      .toContain('reader.html?id=book1');
  });

  it('本机进度会改变排序：书读过就排到笔记前面；筛选只留书', async () => {
    localStorage.setItem('uread:book:book1', JSON.stringify({ fraction: 0.8 }));
    render(<MemoryRouter><ReaderHubView /></MemoryRouter>);
    expect(await screen.findByText('思考，快与慢')).toBeInTheDocument();
    const cards = document.querySelectorAll('li');
    expect(cards[0]?.textContent).toContain('朱光潜作品集');
    fireEvent.click(screen.getByRole('button', { name: '书' }));
    expect(screen.queryByText('思考，快与慢')).not.toBeInTheDocument();
    expect(screen.getByText('朱光潜作品集')).toBeInTheDocument();
  });
});
