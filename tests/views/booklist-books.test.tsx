/**
 * 书单卡片要看得见「是哪几本书」。
 *
 * 回归的原始缺陷：卡片只报「N 本书」，唯一的入口是「管理书目」——
 * 那是一个**编辑**界面（带着「保存书目」按钮），只想看一眼的人被迫进入编辑态，
 * 关掉时还可能误以为必须保存。
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '../../src/App';
import { BOOK_TITLE_LIMIT } from '../../src/components/BookListCard';
import * as repo from '../../src/data/repository';
import { useLibraryStore } from '../../src/store/libraryStore';

async function seed(title: string, bookTitles: string[]) {
  const ids: string[] = [];
  for (const bookTitle of bookTitles) {
    const book = await repo.createBook({ title: bookTitle });
    ids.push(book.id);
  }
  const list = await repo.createBookList({ title });
  if (ids.length > 0) {
    await repo.updateBookList(list.id, { book_ids: ids });
  }
  await useLibraryStore.getState().load();
  return { list, ids };
}

function renderLists() {
  return render(
    <MemoryRouter initialEntries={['/booklists']}>
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

describe('书单卡片要看得见内容', () => {
  it('卡片上直接列出书名与阅读状态，而不是只有一个数字', async () => {
    await seed('系统能力书单', ['深入理解计算机系统', '数据密集型应用系统设计']);

    renderLists();

    const first = await screen.findByRole('link', { name: '深入理解计算机系统' });
    expect(first).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '数据密集型应用系统设计' })).toBeInTheDocument();
    expect(screen.getByText(/2 本书/)).toBeInTheDocument();
    // 阅读状态标签必须有，否则「在读/待读」这个信息在书单里看不到
    expect(screen.getAllByText('在读').length).toBeGreaterThan(0);
  });

  it('书名可点：跳到资料库并带着书名过滤（不是跳过去看全量）', async () => {
    await seed('可点书单', ['计算机程序的构造和解释']);

    renderLists();
    fireEvent.click(await screen.findByRole('link', { name: '计算机程序的构造和解释' }));

    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: '搜索当前列表' })).toHaveValue(
        '计算机程序的构造和解释',
      ),
    );
    expect(screen.getByText('计算机程序的构造和解释')).toBeInTheDocument();
  });

  it('书名太多时折叠，但必须说清还有几本、且能展开看全', async () => {
    const titles = Array.from({ length: BOOK_TITLE_LIMIT + 2 }, (_unused, index) => `书目第 ${index + 1} 号`);
    await seed('长书单', titles);

    renderLists();
    await screen.findByRole('link', { name: '书目第 1 号' });

    expect(screen.queryByRole('link', { name: `书目第 ${BOOK_TITLE_LIMIT + 1} 号` })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `展开全部 ${titles.length} 本` }));

    expect(await screen.findByRole('link', { name: `书目第 ${BOOK_TITLE_LIMIT + 1} 号` })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: `书目第 ${titles.length} 号` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '收起' }));
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: `书目第 ${BOOK_TITLE_LIMIT + 1} 号` })).not.toBeInTheDocument(),
    );
  });

  it('资料被删除后不留空条目，也不虚报数量', async () => {
    const { ids } = await seed('删过一本的书单', ['还在的书', '会被删掉的书']);
    await repo.deleteBook(ids[1]);
    await useLibraryStore.getState().load();

    renderLists();

    const survivor = await screen.findByRole('link', { name: '还在的书' });
    expect(survivor).toBeInTheDocument();
    expect(screen.queryByText('会被删掉的书')).not.toBeInTheDocument();
    expect(screen.getByText(/其中 1 本已删除/)).toBeInTheDocument();
  });

  it('全部资料都被删掉时，说明「只剩指向已删除资料的条目」', async () => {
    const { ids } = await seed('被清空的书单', ['删掉一本', '再删一本']);
    for (const id of ids) {
      await repo.deleteBook(id);
    }
    await useLibraryStore.getState().load();

    renderLists();

    expect(await screen.findByText(/只剩 2 条指向已删除资料的条目/)).toBeInTheDocument();
  });

  it('空书单给出出路，而不是冷冰冰一句「0 本书」', async () => {
    await repo.createBook({ title: '资料库里的一本' });
    await seed('还没填的书单', []);

    renderLists();

    // 出路必须指向本仓库真实存在的入口，并且只指向**现在可达**的那个
    expect(await screen.findByText(/这个书单还没有资料：点下面「管理书目」从资料库里勾选/)).toBeInTheDocument();
    expect(screen.queryByText(/先到「资料库」导入内容/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '管理书目' })).toBeInTheDocument();
  });

  it('资料库也是空的时，出路指向导入（不是让人对着空勾选框发呆）', async () => {
    await seed('空书单', []);

    renderLists();

    expect(await screen.findByText(/资料库里也还是空的——先到「资料库」导入内容/)).toBeInTheDocument();
  });

  it('管理书目里改勾选后，书名列表跟着变（不是只有数字变）', async () => {
    const { ids } = await seed('会改的书单', ['留下的书', '要移出的书']);

    renderLists();
    fireEvent.click(await screen.findByRole('button', { name: '管理书目' }));
    fireEvent.click(screen.getByLabelText('要移出的书'));
    fireEvent.click(screen.getByRole('button', { name: '保存书目' }));

    await waitFor(() => expect(screen.getByText(/已更新书单，现在共 1 项/)).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('要移出的书')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: '留下的书' })).toBeInTheDocument();
    expect(ids).toHaveLength(2);
  });
});
