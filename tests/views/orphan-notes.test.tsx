/**
 * 指向已删除资料的笔记（孤儿条目）。
 *
 * 到达路径是文档里写着的工作流，不是构造出来的极端输入：
 * 「导出 Markdown」只含笔记与卡片（README 明确说它不能当备份），
 * 把它导入另一台机器或清空后的库时，每条笔记的 `book_id` 都指向不存在的资料。
 * 以前这些笔记只显示一句「未知书籍」——不说原因，也不给出路。
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '../../src/App';
import * as repo from '../../src/data/repository';
import { ORPHAN_BOOK_LABEL } from '../../src/data/labels';
import { useLibraryStore } from '../../src/store/libraryStore';

/** 真实往返：带着资料建笔记 → 导出 Markdown → 清空 → 再导入（资料没跟着走）。 */
async function importOrphanedNotes(titles: string[]) {
  const book = await repo.createBook({ title: '原始资料（没被导出）' });
  for (const title of titles) {
    await repo.createNote({ title, content: `${title} 的正文`, book_id: book.id });
  }
  const markdown = await repo.exportMarkdown();
  await repo.resetLibrary();
  const result = await repo.importMarkdown(markdown);
  expect(result.imported).toBe(titles.length);
  await useLibraryStore.getState().load();
}

function renderNotes() {
  return render(
    <MemoryRouter initialEntries={['/notes']}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  window.localStorage.clear();
  await repo.resetLibrary();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('指向已删除资料的笔记', () => {
  it('导入 Markdown 后不再谎称「未知书籍」，而是说明资料已删除', async () => {
    await importOrphanedNotes(['缓存一致性笔记']);

    renderNotes();

    expect(await screen.findByText(ORPHAN_BOOK_LABEL)).toBeInTheDocument();
    expect(screen.queryByText('未知书籍')).not.toBeInTheDocument();
    expect(screen.getByText(/仍指向一本已经不存在的资料/)).toBeInTheDocument();
  });

  it('「未归属」过滤器能把它们单独挑出来', async () => {
    await importOrphanedNotes(['孤儿笔记', '另一条孤儿笔记']);
    await repo.createNote({ title: '正常笔记', content: '指向存在的资料' });
    await useLibraryStore.getState().load();

    renderNotes();

    fireEvent.click(await screen.findByRole('button', { name: /未归属 \(2\)/ }));

    expect(await screen.findByText('孤儿笔记')).toBeInTheDocument();
    expect(screen.queryByText('正常笔记')).not.toBeInTheDocument();
    // 卡片上的标签也要跟着改：孤儿只剩这两条
    expect(screen.getAllByText(ORPHAN_BOOK_LABEL)).toHaveLength(2);
  });

  it('改挂到现有资料后就恢复正常，并给出成功提示', async () => {
    await importOrphanedNotes(['待认领的笔记']);
    const target = await repo.createBook({ title: '操作系统的概念' });
    await useLibraryStore.getState().load();

    renderNotes();

    fireEvent.change(await screen.findByLabelText('改挂到'), { target: { value: target.id } });
    fireEvent.click(screen.getByRole('button', { name: '改挂' }));

    await waitFor(() => expect(screen.getByText(/已改挂到《操作系统的概念》/)).toBeInTheDocument());
    expect(await screen.findByText('操作系统的概念')).toBeInTheDocument();
    expect(screen.queryByText(ORPHAN_BOOK_LABEL)).not.toBeInTheDocument();

    const notes = await repo.listNotes();
    expect(notes.map((note) => note.book_id)).toEqual([target.id]);
  });

  it('没选目标就点「改挂」时说清原因，且不动仓储', async () => {
    await importOrphanedNotes(['没选目标的笔记']);
    await repo.createBook({ title: '可选的目标资料' });
    await useLibraryStore.getState().load();

    renderNotes();

    const before = await repo.listNotes();
    fireEvent.click(await screen.findByRole('button', { name: '改挂' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('请先选择要改挂到哪本资料。');
    expect(await repo.listNotes()).toEqual(before);
  });

  it('资料库里没有可选资料时，出路指向导入而不是一个空下拉框', async () => {
    await importOrphanedNotes(['无处可挂的笔记']);

    renderNotes();

    expect(await screen.findByText(/先到「资料库」导入内容，再回来改挂这条笔记/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '改挂' })).not.toBeInTheDocument();
  });

  it('改挂只影响这一条笔记（不会顺手改掉其它孤儿）', async () => {
    await importOrphanedNotes(['第一条孤儿', '第二条孤儿']);
    const target = await repo.createBook({ title: '唯一的目标资料' });
    await useLibraryStore.getState().load();

    renderNotes();

    const selects = await screen.findAllByLabelText('改挂到');
    fireEvent.change(selects[0], { target: { value: target.id } });
    fireEvent.click(screen.getAllByRole('button', { name: '改挂' })[0]);

    await waitFor(() => expect(screen.getByText(/已改挂到《唯一的目标资料》/)).toBeInTheDocument());
    const notes = await repo.listNotes();
    expect(notes.filter((note) => note.book_id === target.id)).toHaveLength(1);
    // 另一条仍指向原来那本（已不存在的）资料：两个不同的 book_id，说明只改了一条
    expect(new Set(notes.map((note) => note.book_id)).size).toBe(2);
  });
});
