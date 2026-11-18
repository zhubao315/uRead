import Button from './Button';
import { DRAFT_BLOCKED_HINT, DRAFT_RESTORED_HINT, type DraftState } from '../hooks/useDraft';

interface DraftNoticeProps<T extends Record<string, string>> {
  draft: DraftState<T>;
}

/**
 * 草稿的存在感：恢复了什么、这台机器存不下时会怎样、怎么主动丢弃。
 *
 * 抽成一个组件而不是在四个页面各写一遍，是为了让「草稿不是已保存的知识」
 * 这句话只有一个版本可改。
 */
export function DraftNotice<T extends Record<string, string>>({ draft }: DraftNoticeProps<T>) {
  if (draft.blocked) {
    return (
      <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-inter text-sm text-amber-900">
        {DRAFT_BLOCKED_HINT}
      </p>
    );
  }

  if (!draft.restored) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <p role="status" className="font-inter text-sm text-amber-900">
        {DRAFT_RESTORED_HINT}
      </p>
      <Button type="button" variant="ghost" onClick={draft.clear}>
        丢弃草稿
      </Button>
    </div>
  );
}

export default DraftNotice;
