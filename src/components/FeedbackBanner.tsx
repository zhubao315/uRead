/**
 * 操作结果提示（替代 `window.alert`）。
 *
 * 浏览器的 alert 会阻塞界面、无法样式化，也没法带「下一步做什么」；
 * 而 uRead 的文案本来就要给出动作建议（导出备份、刷新列表），alert 装不下。
 */
import React from 'react';

import type { Feedback } from '../hooks/useActionRunner';

export interface FeedbackBannerProps {
  feedback: Feedback | null;
  onDismiss?: () => void;
}

const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ feedback, onDismiss }) => {
  if (!feedback) {
    return null;
  }

  const palette =
    feedback.kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : feedback.kind === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-blue-200 bg-blue-50 text-blue-800';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`border rounded-lg px-4 py-3 mb-6 font-inter text-sm ${palette}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{feedback.text}</p>
          {feedback.hint ? <p className="mt-1 opacity-90">{feedback.hint}</p> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="关闭提示"
            className="shrink-0 rounded px-2 py-1 text-xs hover:bg-white/60"
          >
            关闭
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default FeedbackBanner;
