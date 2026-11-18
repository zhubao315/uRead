/**
 * 页面层的真实交互测试（渲染真实组件，而不是只扫源码字符串）。
 *
 * 为什么补这一层：此前没有任何测试渲染过视图，于是「点了没反应」这类缺陷
 * 只能靠人眼发现。静态不变量测试守得住 `outline: none`、缺 `catch`
 * 这种「回退即失效」的规则，却守不住「按钮跳到一页，到了还得再找按钮」。
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '../../src/App';
import * as repo from '../../src/data/repository';
import { useLibraryStore } from '../../src/store/libraryStore';

/** 在指定地址渲染整个应用（接线与 main.tsx 一致，只是换了初始路由）。 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

async function seed() {
  await repo.resetLibrary();
  const book = await repo.createBook({ title: '深入理解计算机系统' });
  await repo.createNote({
    title: '认知负荷笔记',
    content: '关于工作记忆的容量',
    note_kind: 'summary',
  });
  await repo.createNote({ title: '缓存一致性', content: 'MESI 协议', note_kind: 'summary' });
  await repo.createBookList({ title: '待读系统书' });
  await useLibraryStore.getState().load();
  return { book };
}

beforeEach(async () => {
  await seed();
});

afterEach(() => {
  cleanup();
});

describe('搜索结果跳转必须带着查询词落地', () => {
  it('命中项的链接带 ?q=（否则落地页显示全量、搜索框却是空的）', async () => {
    renderAt('/search?q=认知');

    const link = await screen.findByRole('link', { name: /认知负荷笔记/ });

    expect(link.getAttribute('href')).toBe('/notes?q=%E8%AE%A4%E7%9F%A5');
  });

  it('带着 ?q= 打开笔记页时只显示匹配项，搜索框也是满的', async () => {
    renderAt('/notes?q=认知');

    await waitFor(() => expect(screen.getByText('认知负荷笔记')).toBeInTheDocument());

    expect(screen.queryByText('缓存一致性')).not.toBeInTheDocument();
    // 精确占位符：导航栏还有一个「搜索全部数据」的框，模糊匹配会撞到两个
    expect(screen.getByPlaceholderText('搜索标题、正文、标签…')).toHaveValue('认知');
  });

  it('书单页同样认 ?q=', async () => {
    renderAt('/booklists?q=系统');

    await waitFor(() => expect(screen.getByText('待读系统书')).toBeInTheDocument());
  });

  it('卡片页同样认 ?q=（四个列表页同一口径，不是只有资料库特殊）', async () => {
    await repo.createCard({ title: '认知负荷卡片', content: '工作记忆' });
    await repo.createCard({ title: '一致性协议卡片', content: 'MESI' });
    await useLibraryStore.getState().load();
    renderAt('/cards?q=认知');

    await waitFor(() => expect(screen.getByText('认知负荷卡片')).toBeInTheDocument());
    expect(screen.queryByText('一致性协议卡片')).not.toBeInTheDocument();
  });
});

describe('承诺「新建」的入口必须给出可提交的表单', () => {
  it('?new=1 直接展开笔记表单', async () => {
    renderAt('/notes?new=1');

    await waitFor(() => expect(screen.getByLabelText(/标题/)).toBeInTheDocument());
  });

  it('仪表板的「写第一条笔记」点下去，落地页的表单已经是打开的', async () => {
    const { container } = renderAt('/');

    const cta = await screen.findByRole('link', { name: '写第一条笔记' });

    expect(cta.getAttribute('href')).toBe('/notes?new=1');
    fireEvent.click(cta);

    await waitFor(() => expect(container.querySelector('input#note-title')).not.toBeNull(), {
      timeout: 4000,
    });
  });

  it('仪表板的「导入资料」同理落到可提交的资料表单', async () => {
    const { container } = renderAt('/');

    const cta = await screen.findByRole('link', { name: '导入资料' });
    fireEvent.click(cta);

    await waitFor(() => expect(container.querySelector('input#book-title')).not.toBeNull(), {
      timeout: 4000,
    });
  });
});

describe('书单不是死胡同', () => {
  it('可以把资料库里的资料加进书单，卡片上的数量随之变化', async () => {
    renderAt('/booklists');

    await waitFor(() => expect(screen.getByText('待读系统书')).toBeInTheDocument());
    expect(screen.getByText(/0 本书/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '管理书目' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: '深入理解计算机系统' }));
    fireEvent.click(screen.getByRole('button', { name: '保存书目' }));

    await waitFor(() => expect(screen.getByText(/1 本书/)).toBeInTheDocument());
    expect((await repo.listBookLists())[0].book_ids).toHaveLength(1);
  });

  it('取消勾选再保存只移出书单，资料本身保留', async () => {
    const { book } = await seed();
    await repo.updateBookList((await repo.listBookLists())[0].id, { book_ids: [book.id] });
    await useLibraryStore.getState().load();
    renderAt('/booklists');

    await waitFor(() => expect(screen.getByText('待读系统书')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '管理书目' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: '深入理解计算机系统' }));
    fireEvent.click(screen.getByRole('button', { name: '保存书目' }));

    await waitFor(() => expect(screen.getByText(/0 本书/)).toBeInTheDocument());
    expect(await repo.listBooks()).toHaveLength(1);
  });

  it('资料库为空时说明下一步做什么，而不是摆一张空表格', async () => {
    await repo.resetLibrary();
    await repo.createBookList({ title: '空库书单' });
    await useLibraryStore.getState().load();
    renderAt('/booklists');

    await waitFor(() => expect(screen.getByText('空库书单')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '管理书目' }));

    expect(await screen.findByText(/先到「资料库」导入内容/)).toBeInTheDocument();
  });
});

describe('表单的拒绝理由要看得见', () => {
  it('资料表单缺标题时给出内联原因（与另外三个表单页同一口径）', async () => {
    renderAt('/library?new=1');

    await waitFor(() =>
      expect(
        screen.getAllByRole('alert').some((node) => node.textContent?.includes('请填写资料标题')),
      ).toBe(true),
    );
  });

  it('四个表单页都有内联校验（role="alert"），不再出现「按钮灰了却不知道为什么」', async () => {
    for (const path of ['/library?new=1', '/notes?new=1', '/cards?new=1', '/booklists?new=1']) {
      const { unmount } = renderAt(path);

      await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
      unmount();
    }
  });
});
