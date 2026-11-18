/**
 * 列表页的过滤词与「新建表单是否展开」一律以 URL 为准。
 *
 * 为什么需要单独一层：四个列表页原来各自 `useState('')` 存过滤词，
 * 只有资料库把它写进 `?q=`。结果是「从全站搜索点一条结果跳过去」之后，
 * 落地页显示的仍是**全部**条目、搜索框却是空的——用户刚做的筛选凭空消失。
 *
 * 为什么让 URL 当唯一真相，而不是「本地状态 + 同步到地址栏」：
 * 双向同步要么在渲染期读 ref（`react-hooks/refs` 拒绝），
 * 要么在 effect 里回写 state（`react-hooks/set-state-in-effect` 拒绝），
 * 两种写法都说明方向不对。改成单向之后：外部导航（搜索结果、前进后退、
 * 别人分享的链接）天然生效，不存在「谁覆盖谁」的问题，
 * 也只需一处测试。写入一律 `replace: true`，打字不会堆出几十个历史条目。
 */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';

type Setter<T> = Dispatch<SetStateAction<T>>;

/** 过滤词：本地输入直接落进 `?q=`，因此搜索结果、后退、分享链接都能带回来。 */
export function useQueryFilter(): [string, Setter<string>] {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';

  const setQuery = useCallback<Setter<string>>(
    (next) => {
      const resolved = typeof next === 'function' ? next(params.get('q') ?? '') : next;
      const updated = new URLSearchParams(params);
      if (resolved) {
        updated.set('q', resolved);
      } else {
        updated.delete('q');
      }
      setParams(updated, { replace: true });
    },
    [params, setParams],
  );

  return [query, setQuery];
}

/**
 * `?new=1` → 创建表单直接展开。
 *
 * 仪表板的两个大按钮写着「导入资料」「写第一条笔记」，原来只是跳到列表页，
 * 而列表页的表单默认收起——新用户到了目的地还得再找一次按钮。
 * 既然承诺了「新建」，落地就该是可提交的表单（这也是本仓库
 * `docs/audit/functionality-matrix.md` 给自己写的验收标准）。
 */
export function useCreateFlag(): [boolean, Setter<boolean>] {
  const [params, setParams] = useSearchParams();
  const open = params.get('new') === '1';

  const setOpen = useCallback<Setter<boolean>>(
    (next) => {
      const resolved = typeof next === 'function' ? next(params.get('new') === '1') : next;
      const updated = new URLSearchParams(params);
      if (resolved) {
        updated.set('new', '1');
      } else {
        updated.delete('new');
      }
      setParams(updated, { replace: true });
    },
    [params, setParams],
  );

  return [open, setOpen];
}
