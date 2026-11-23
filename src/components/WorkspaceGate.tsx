import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { useLibraryStore } from '../store/libraryStore';

/**
 * 工作台路由的布局壳。
 *
 * 这是整个应用里**唯一**触发 IndexedDB 初始化的位置：公开门户路由
 * （首页 / 阅读 / 书单 / 搜索）不会挂载本组件，因此不会读取本机资料库。
 * 组件以路由 layout 形式存在，工作台内部切换子路由时不会重新挂载，
 * `initialized` 标志保证重试成功后不会重复读取。
 */
const WorkspaceGate: React.FC = () => {
  const load = useLibraryStore((state) => state.load);
  const initialized = useLibraryStore((state) => state.initialized);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);

  useEffect(() => {
    if (!initialized) {
      void load();
    }
  }, [load, initialized]);

  const banner: ReactNode = error ? (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-red-50 border-b border-red-200 text-red-800 font-inter text-sm"
    >
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
        <span>
          本地数据读取失败：{error}
          {errorHint ? <span className="ml-2 opacity-80">{errorHint}</span> : null}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="underline hover:text-red-900"
        >
          重试
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {banner}
      <Outlet />
    </>
  );
};

export default WorkspaceGate;
