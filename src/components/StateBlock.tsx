/**
 * 加载 / 空 / 出错三种页面状态的统一呈现。
 *
 * 为什么要有这个组件：资料库、笔记、卡片、书单四个视图原来各自写空状态，
 * **都只判断数组是否为空**。于是 IndexedDB 打不开时，用户看到的是
 * 「资料库是空的，先导入一本书」——把故障说成了新手引导，还会让人去重复导入。
 * 空、加载中、出错必须是三种不同的界面。
 */
import React from 'react';

import Button from './Button';

export interface StateBlockProps {
  /** 加载失败的原因（已按用户语言描述）。 */
  error?: string | null;
  /** 失败时的下一步动作。 */
  hint?: string | null;
  /** 重试回调（有值才渲染重试按钮）。 */
  onRetry?: () => void;
  /** 首次加载中：显示骨架提示而不是空状态引导。 */
  loading?: boolean;
  /** 正常空状态：标题 + 建议的下一步。 */
  emptyTitle?: string;
  emptyAction?: React.ReactNode;
  /** 加载中提示。 */
  loadingText?: string;
}

const StateBlock: React.FC<StateBlockProps> = ({
  error,
  hint,
  onRetry,
  loading = false,
  emptyTitle,
  emptyAction,
  loadingText = '正在读取本地数据…',
}) => {
  if (error) {
    return (
      <section
        role="alert"
        aria-live="assertive"
        className="bg-white border border-red-200 rounded-xl p-6 text-center"
      >
        <h2 className="text-lg font-inter font-semibold text-red-700">本地数据读取失败</h2>
        <p className="mt-2 text-sm font-inter text-gray-700">{error}</p>
        {hint ? <p className="mt-1 text-sm font-inter text-gray-500">{hint}</p> : null}
        {onRetry ? (
          <div className="mt-4">
            <Button variant="primary" onClick={onRetry}>
              重试
            </Button>
          </div>
        ) : null}
        <p className="mt-3 text-xs font-inter text-gray-500">
          数据仍在你本机的浏览器里；未备份前请不要清除浏览器数据。
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section
        role="status"
        aria-live="polite"
        className="bg-white border border-gray-200 rounded-xl p-10 text-center"
      >
        <p className="font-inter text-gray-600">{loadingText}</p>
        <div className="mt-6 space-y-3 max-w-prose mx-auto skeleton-loading" aria-hidden="true">
          <div className="h-4 bg-gray-100 rounded" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
        </div>
      </section>
    );
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className="bg-white border border-gray-200 rounded-xl p-10 text-center"
    >
      <p className="text-base font-inter text-gray-600">{emptyTitle ?? loadingText}</p>
      {emptyAction ? <div className="mt-4 flex justify-center">{emptyAction}</div> : null}
    </section>
  );
};

export default StateBlock;

/** 页面主体该显示什么：出错 > 首次加载中 > 空 > 内容。 */
export function resolveState(input: {
  error?: string | null;
  loading?: boolean;
  initialized?: boolean;
  isEmpty?: boolean;
}): 'error' | 'loading' | 'empty' | 'content' {
  if (input.error) {
    return 'error';
  }
  if (input.loading && !input.initialized) {
    return 'loading';
  }
  if (input.isEmpty) {
    return 'empty';
  }
  return 'content';
}
