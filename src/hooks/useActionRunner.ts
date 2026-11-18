/**
 * 统一的「用户动作」执行器：把 try/catch/finally 收到一处。
 *
 * 之前每个视图各自写 `try { await xxx() } finally { setSaving(false) }`，
 * **没有 catch**：写盘失败时表单安静地停在那里，用户以为已经保存了。
 * 这是本地优先应用最危险的一类 bug——丢数据而不告知。
 */
import { useCallback, useRef, useState } from 'react';

import { describeError, type ActionableError } from '../store/errors';

export type FeedbackKind = 'success' | 'error' | 'info';

export interface Feedback {
  kind: FeedbackKind;
  text: string;
  hint?: string;
}

export interface RunOptions {
  /** 成功后的提示；不传则不提示（用于静默的后台刷新）。可以按结果动态生成。 */
  success?: string | ((result: unknown) => string | undefined);
  /** 失败提示的前缀，用来说明是哪个动作失败了。 */
  label?: string;
  /** 成功后要做的事（关表单、跳列表页）。返回 false 可阻止自动清理提示。 */
  onDone?: () => void;
}

export interface ActionRunner {
  /** 执行一个异步动作；返回是否成功（调用方可据此决定是否关闭表单）。 */
  run: <T>(task: () => Promise<T>, options?: RunOptions) => Promise<boolean>;
  busy: boolean;
  feedback: Feedback | null;
  dismiss: () => void;
}

export function useActionRunner(): ActionRunner {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const mounted = useRef(true);

  // React 19 的 StrictMode 会双挂 effects；这里只关心「组件还活着吗」。
  const alive = () => mounted.current;

  const dismiss = useCallback(() => setFeedback(null), []);

  const run = useCallback(
    async <T,>(task: () => Promise<T>, options: RunOptions = {}): Promise<boolean> => {
      setBusy(true);
      setFeedback(null);
      try {
        const result = await task();
        if (alive()) {
          const success =
            typeof options.success === 'function' ? options.success(result) : options.success;
          setFeedback(success ? { kind: 'success', text: success } : null);
          options.onDone?.();
        }
        return true;
      } catch (error) {
        const explained: ActionableError = describeError(error);
        if (alive()) {
          setFeedback({
            kind: 'error',
            text: options.label ? `${options.label}失败：${explained.message}` : explained.message,
            hint: explained.hint,
          });
        }
        return false;
      } finally {
        if (alive()) {
          setBusy(false);
        }
      }
    },
    [],
  );

  return { run, busy, feedback, dismiss };
}
