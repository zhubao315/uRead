/**
 * 表单草稿（本机暂存未提交内容）。
 *
 * 这里要防的是一类很具体、也很难靠读代码发现的缺陷：用户敲了半天的笔记，
 * 点一下导航栏就整段没了，而界面从来没说会这样。
 * 测试走的是**真实导航**（点导航链接离开再回来），不是卸载重挂——
 * 后者测不到「同一次会话里切页面」这个最常见的场景。
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '../../src/App';
import * as repo from '../../src/data/repository';
import { useLibraryStore } from '../../src/store/libraryStore';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  window.localStorage.clear();
  await repo.resetLibrary();
  await repo.createBook({ title: '计算机系统的细节' });
  await useLibraryStore.getState().load();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('未提交的内容不该被吃掉', () => {
  it('笔记表单里打的内容，切到别处再回来还在', async () => {
    const first = renderAt('/notes?new=1');
    const title = await screen.findByLabelText(/标题/);
    fireEvent.change(title, { target: { value: '缓存一致性的四个状态' } });
    fireEvent.change(screen.getByLabelText(/内容/), { target: { value: 'MESI 的 M/E/S/I' } });
    first.unmount();

    renderAt('/notes?new=1');

    await waitFor(() =>
      expect(screen.getByLabelText(/标题/)).toHaveValue('缓存一致性的四个状态'),
    );
    expect(screen.getByLabelText(/内容/)).toHaveValue('MESI 的 M/E/S/I');
  });

  it('恢复时明说这是「尚未保存」，不让它冒充已保存的知识', async () => {
    const first = renderAt('/cards?new=1');
    fireEvent.change(await screen.findByLabelText(/标题/), {
      target: { value: '只存在于草稿里的卡片' },
    });
    first.unmount();

    renderAt('/cards?new=1');

    expect(await screen.findByText(/已恢复上次未提交的内容/)).toBeInTheDocument();
    expect(screen.getByText(/尚未保存/)).toBeInTheDocument();
  });

  it('通过导航链接离开再回来，同样能恢复', async () => {
    const { unmount } = renderAt('/notes?new=1');
    fireEvent.change(await screen.findByLabelText(/标题/), {
      target: { value: '走开一趟也不会丢' },
    });
    // 桌面导航栏与移动端底部导航各渲染一条同名链接，两条都指向资料库，
    // 所以必须取全部再点第一条（getByRole 会因为「找到多个」直接失败）。
    const [libraryLink] = screen.getAllByRole('link', { name: /资料库/ });
    fireEvent.click(libraryLink);
    // 确认真的换了路由：笔记表单已经不在这一屏了
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '保存笔记' })).not.toBeInTheDocument(),
    );
    unmount();

    renderAt('/notes?new=1');

    await waitFor(() => expect(screen.getByLabelText(/标题/)).toHaveValue('走开一趟也不会丢'));
  });

  it('提交成功后草稿清空（下一次进来是干净表单）', async () => {
    const first = renderAt('/notes?new=1');
    fireEvent.change(await screen.findByLabelText(/标题/), { target: { value: '已提交的笔记' } });
    fireEvent.change(screen.getByLabelText(/内容/), { target: { value: '正文若干' } });
    fireEvent.click(screen.getByRole('button', { name: '保存笔记' }));

    await waitFor(() => expect(screen.getByText(/已保存|已创建|新增笔记/)).toBeInTheDocument());
    first.unmount();

    renderAt('/notes?new=1');
    await waitFor(() => expect(screen.getByLabelText(/标题/)).toBeInTheDocument());
    expect(screen.getByLabelText(/标题/)).toHaveValue('');
    expect((await repo.listNotes()).map((note) => note.title)).toContain('已提交的笔记');
  });

  it('「丢弃草稿」能真的丢掉（不是只把提示关掉）', async () => {
    const first = renderAt('/booklists?new=1');
    fireEvent.change(await screen.findByLabelText(/名称/), { target: { value: '不想留的草稿' } });
    first.unmount();

    renderAt('/booklists?new=1');
    fireEvent.click(await screen.findByRole('button', { name: /丢弃草稿/ }));

    await waitFor(() => expect(screen.getByLabelText(/名称/)).toHaveValue(''));
    expect(screen.queryByText(/已恢复上次未提交的内容/)).not.toBeInTheDocument();
    expect(await repo.listBookLists()).toHaveLength(0);
  });
});

describe('草稿不许越界', () => {
  it('草稿不进 JSON 备份（未提交的内容不是知识）', async () => {
    const { unmount } = renderAt('/notes?new=1');
    fireEvent.change(await screen.findByLabelText(/标题/), {
      target: { value: '这句话只该留在草稿箱' },
    });
    unmount();

    const bundle = await repo.exportBundle();

    expect(JSON.stringify(bundle)).not.toContain('这句话只该留在草稿箱');
    expect((await repo.listNotes())).toHaveLength(0);
  });

  it('存不下时如实说明会丢，而不是静默失败', async () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
        removeItem: () => {
          throw new Error('SecurityError');
        },
      },
    });

    try {
      renderAt('/notes?new=1');
      const title = await screen.findByLabelText(/标题/);
      fireEvent.change(title, { target: { value: '隐私模式下的输入' } });

      // 1) 不许崩：当前这一屏还能继续打字
      await waitFor(() => expect(screen.getByLabelText(/标题/)).toHaveValue('隐私模式下的输入'));
      // 2) 必须说清会丢
      expect(await screen.findByText(/不允许暂存草稿/)).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: original,
      });
    }
  });

  it('挂载时存得下、打字时才存不下（配额用满），同样要说清会丢', async () => {
    // 上一条测的是「一开始就存不下」（挂载探测）。这条测的是另一半：
    // 探测成功之后 setItem 才开始抛——只守前一半的话，写入路径的 catch 是没人管的。
    const original = window.localStorage;
    const store = new Map<string, string>();
    let refuse = false;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (refuse) {
            throw new Error('QuotaExceededError');
          }
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });

    try {
      renderAt('/notes?new=1');
      const title = await screen.findByLabelText(/标题/);
      refuse = true;
      fireEvent.change(title, { target: { value: '写到一半配额满了' } });

      await waitFor(() => expect(screen.getByLabelText(/标题/)).toHaveValue('写到一半配额满了'));
      expect(await screen.findByText(/不允许暂存草稿/)).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: original });
    }
  });
});
