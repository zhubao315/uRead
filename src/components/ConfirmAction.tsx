/**
 * 破坏性动作的两步确认。
 *
 * 删除图书会级联影响它的笔记与卡片（`repository.deleteBook`）。
 * 现在普通删除先进入回收站，可从 repository.listTrashed/restoreTrashed 恢复；
 * 只有回收站里的「永久删除」才真正移除数据。两步确认仍保留，用于说清级联后果。
 */
import React, { useEffect, useRef, useState } from 'react';

export interface ConfirmActionProps {
  /** 按钮正常文案（例如「删除」）。 */
  label: string;
  /** 确认态文案（例如「确认删除这本书？」）。 */
  confirmLabel: string;
  /** 会连带影响多少条数据；用于把级联后果说在前面。 */
  detail?: string;
  onConfirm: () => void | Promise<unknown>;
  /** 忙碌中禁用，避免连点产生竞态。 */
  disabled?: boolean;
  className?: string;
}

/** 等待多久自动退回正常态。太久会让人误点，太短则来不及反应。 */
const RESET_AFTER_MS = 6000;

const ConfirmAction: React.FC<ConfirmActionProps> = ({
  label,
  confirmLabel,
  detail,
  onConfirm,
  disabled = false,
  className = '',
}) => {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!armed) {
      return;
    }
    timer.current = setTimeout(() => setArmed(false), RESET_AFTER_MS);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [armed]);

  return (
    <span className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={armed ? confirmLabel : label}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          void onConfirm();
        }}
        className={`text-xs transition-colors duration-150 disabled:opacity-50 ${
          armed
            ? 'text-white bg-red-600 hover:bg-red-700 rounded px-2 py-1'
            : 'text-red-600 hover:text-red-800'
        }`}
      >
        {armed ? confirmLabel : label}
      </button>
      {armed ? (
        <span role="status" aria-live="polite" className="text-xs text-red-600">
          {detail ?? '此操作不可撤销，再点一次即执行'}
        </span>
      ) : null}
    </span>
  );
};

export default ConfirmAction;
