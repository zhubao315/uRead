/**
 * 界面文案的唯一来源。
 *
 * 为什么要单独一个文件：同一份标签在多处各写一遍时，改一处漏一处是必然的
 * （「待读 / 想读」这种漂移没人会发现）。`tests/data/ui-invariants.test.ts`
 * 要求全仓库只有一处定义阅读状态标签。
 */
import type { ContentProvenance, NoteKind, ReadingStatus } from './types';

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  wishlist: '待读',
  reading: '在读',
  completed: '已读',
};

/**
 * 指向已删除资料的条目。
 *
 * 「未知书籍」这种说法既不说明原因（资料被删了，不是数据坏了），
 * 也不给下一步；而这类条目是真实会出现的：导出的 Markdown 只含笔记与卡片，
 * 把它导入另一台机器或清空后的库时，每条笔记的 `book_id` 都指向不存在的资料。
 */
export const ORPHAN_BOOK_LABEL = '所属资料已删除';

export const ORPHAN_BOOK_HINT =
  '这条笔记仍指向一本已经不存在的资料：改挂到现有资料即可，不必重敲内容。';

export const ORPHAN_NO_TARGET_HINT =
  '资料库里现在没有任何资料：先到「资料库」导入内容，再回来改挂这条笔记。';

/** 新用途的笔记标签；保留原三类文案，避免工作台其它地方出现漂移。 */
export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  highlight: '原文摘录',
  note: '个人理解',
  summary: '延伸思考',
  intent: '阅读意图',
  feynman: '费曼输出',
};

/** 内容归属：AI 参考材料不能混进人的理解。 */
export const PROVENANCE_LABEL: Record<ContentProvenance, string> = {
  HUMAN_WRITTEN: '亲笔记录',
  AI_GENERATED: 'AI 生成（仅供参考）',
  AI_ASSISTED: 'AI 辅助整理',
  HUMAN_VERIFIED: '本人已核验',
};
