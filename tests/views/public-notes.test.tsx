/**
 * 公开笔记的页面层测试：渲染真实组件，断言「浏览 / 听 / 未生成 / wikilink」四种可见结果。
 * fetch 被打桩，但返回形状与 sync-notes.mjs 的产物一致。
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PublicNoteDetailView from '../../src/views/PublicNoteDetailView';
import PublicNotesView from '../../src/views/PublicNotesView';

const noteA = {
  slug: 'B1-文学虚构__《三体》-刘慈欣',
  title: '三体（全集）-刘慈欣',
  author: '刘慈欣',
  category: 'B1-文学虚构',
  created: '2022-08-09',
  updated: '2026-07-17',
  source: '微信读书',
  status: '已读',
  tags: ['类型/读书笔记'],
  aliases: ['《三体》', '三体'],
  body: '# 三体\n\n## 概述\n\n黑暗森林法则见 [[《三体》-刘慈欣|三体]]，另有 [[不存在的笔记]]。',
  source_ref: { path: 'B1-文学虚构/《三体》-刘慈欣.md', sha: 'abcdef123456', url: 'https://example.invalid/note.md' },
  content_hash: 'hash-aaaa',
  audio: true,
};
const noteB = {
  ...noteA,
  slug: 'B3-认知成长__思考的快与慢',
  title: '思考的快与慢',
  author: '卡尼曼',
  category: 'B3-认知成长',
  aliases: [],
  body: '只有正文，没有音频。',
  content_hash: 'hash-bbbb',
  audio: false,
};
const manifest = {
  version: 'v1',
  generated_at: '2026-11-18T00:00:00.000Z',
  note_count: 2,
  audio_count: 1,
  source: 'github',
  repo: 'zhubao315/obsidian-vault',
  branch: 'main',
  note_path: '07-SOURCES/71-书籍',
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = String(input);
    const body = url.includes('manifest.json') ? manifest : [noteA, noteB];
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('公开笔记列表', () => {
  it('列出标题、分类和可听标记，并显示同步版本', async () => {
    render(<MemoryRouter><PublicNotesView /></MemoryRouter>);
    expect(await screen.findByText('三体（全集）-刘慈欣')).toBeInTheDocument();
    expect(screen.getByText(/共 2 篇/)).toBeInTheDocument();
    expect(screen.getByText(/1 篇可听/)).toBeInTheDocument();
    expect(screen.getByText('刘慈欣 · B1-文学虚构 · 可听')).toBeInTheDocument();
    expect(screen.getByText('思考的快与慢')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('搜索标题、标签或正文'), { target: { value: '三体' } });
    expect(document.querySelector('mark')?.textContent).toBe('三体');
  });
});

describe('公开笔记详情', () => {
  const renderDetail = (slug: string) => render(
    <MemoryRouter initialEntries={[`/read/${slug}`]}>
      <Routes>
        <Route path="/read/:slug" element={<PublicNoteDetailView />} />
      </Routes>
    </MemoryRouter>,
  );

  it('有音频时给出播放器，地址来自内容哈希', async () => {
    renderDetail(noteA.slug);
    expect(await screen.findByText('三体（全集）-刘慈欣')).toBeInTheDocument();
    const audio = document.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute('src')).toBe('/uRead/audio/hash-aaaa.wav');
    fireEvent.click(screen.getByRole('button', { name: '1.5×' }));
    expect(audio?.playbackRate).toBe(1.5);
    localStorage.setItem('uread:audio:hash-aaaa', '42');
    fireEvent.loadedMetadata(audio!);
    expect(audio?.currentTime).toBe(42);
  });

  it('没有音频时明说没有，不放假播放器', async () => {
    renderDetail(noteB.slug);
    expect(await screen.findByText('思考的快与慢')).toBeInTheDocument();
    expect(screen.getByText('这篇笔记目前没有音频。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制笔记链接' })).toBeInTheDocument();
    expect(document.querySelector('audio')).toBeNull();
  });

  it('已发布的 wikilink 可点，未发布的只显示文字', async () => {
    renderDetail(noteA.slug);
    await waitFor(() => expect(document.querySelector('article')).not.toBeNull());
    const article = document.querySelector('article');
    const linked = [...(article?.querySelectorAll('a') ?? [])].find((a) => a.textContent === '三体' && a.getAttribute('href')?.startsWith('/read/'));
    expect(linked).toBeDefined();
    expect(linked?.getAttribute('href')).toContain(encodeURIComponent(noteA.slug));
    expect(screen.getByText('不存在的笔记').tagName).toBe('SPAN');
    expect(screen.getByRole('navigation', { name: '本篇目录' })).toBeInTheDocument();
  });
});
