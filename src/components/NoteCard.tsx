import React, { useState } from 'react';
import Card from './Card';
import ConfirmAction from './ConfirmAction';
import Button from './Button';
import { DocumentIcon, LightBulbIcon, StarIcon, ClockIcon } from './Icon';
import { ORPHAN_BOOK_HINT, ORPHAN_NO_TARGET_HINT } from '../data/labels';
import type { Note } from '../data/types';

interface NoteCardProps {
  note: Note;
  bookTitle?: string;
  /** 这条笔记仍指向一本已经不存在的资料（导入备份/Markdown 时会出现）。 */
  bookMissing?: boolean;
  /** 可改挂的目标（资料库里现有的资料）。为空时不能给一个空下拉框。 */
  libraryBooks?: Array<{ id: string; title: string }>;
  /** 把笔记改挂到另一本资料。 */
  onReattach?: (noteId: string, bookId: string) => void;
  /** 正在写盘（禁用按钮，避免连点覆盖）。 */
  saving?: boolean;
  onDelete?: (id: string) => void;
}

const KIND_META: Record<
  Note['note_kind'],
  { label: string; icon: React.ReactElement; badge: string }
> = {
  highlight: {
    label: '高亮',
    icon: <LightBulbIcon size="sm" />,
    badge: 'bg-yellow-100 text-yellow-800',
  },
  note: {
    label: '笔记',
    icon: <DocumentIcon size="sm" />,
    badge: 'bg-blue-100 text-blue-800',
  },
  summary: {
    label: '总结',
    icon: <StarIcon size="sm" />,
    badge: 'bg-green-100 text-green-800',
  },
  intent: {
    label: '阅读意图',
    icon: <StarIcon size="sm" />,
    badge: 'bg-violet-100 text-violet-800',
  },
  feynman: {
    label: '费曼输出',
    icon: <LightBulbIcon size="sm" />,
    badge: 'bg-amber-100 text-amber-800',
  },
};

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  bookTitle,
  bookMissing = false,
  libraryBooks = [],
  onReattach,
  saving = false,
  onDelete,
}) => {
  const meta = KIND_META[note.note_kind] ?? KIND_META.note;
  const anchorLabel = note.anchors?.[0];
  const [target, setTarget] = useState('');
  const [needsTarget, setNeedsTarget] = useState(false);

  return (
    <Card variant="glass" hoverEffect className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${meta.badge}`}>
            <span className={meta.badge.split(' ')[1]}>{meta.icon}</span>
          </div>
          <div>
            <h3 className="font-inter font-semibold text-gray-900">{note.title}</h3>
            {bookTitle ? (
              <p className={`font-inter text-sm ${bookMissing ? 'text-amber-800' : 'text-gray-600'}`}>
                {bookTitle}
              </p>
            ) : null}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-inter font-medium ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      <p className="font-inter text-gray-700 mb-4 line-clamp-3 leading-relaxed whitespace-pre-wrap">
        {note.content}
      </p>

      {bookMissing ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="font-inter text-sm text-amber-900 mb-2">{ORPHAN_BOOK_HINT}</p>
          {onReattach && libraryBooks.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={`reattach-${note.id}`} className="font-inter text-xs text-amber-900">
                改挂到
              </label>
              <select
                id={`reattach-${note.id}`}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="px-2 py-1 border border-amber-300 rounded text-sm font-inter bg-white"
              >
                <option value="">选择现有资料…</option>
                {libraryBooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                isLoading={saving}
                onClick={() => {
                  if (!target) {
                    setNeedsTarget(true);
                    return;
                  }
                  onReattach(note.id, target);
                }}
              >
                改挂
              </Button>
            </div>
          ) : (
            <p className="font-inter text-sm text-amber-900">{ORPHAN_NO_TARGET_HINT}</p>
          )}
          <p role="alert" className="font-inter text-xs text-amber-800 mt-2">
            {needsTarget ? '请先选择要改挂到哪本资料。' : ' '}
          </p>
        </div>
      ) : null}

      {anchorLabel && (
        <div className="mb-4 text-xs font-inter text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="font-medium text-gray-700 mb-1">原文定位</div>
          <div>
            {anchorLabel.kind}：{anchorLabel.value}
            {anchorLabel.page ? `（第 ${anchorLabel.page} 页）` : ''}
          </div>
          {anchorLabel.quote && (
            <div className="mt-1 italic text-gray-500">“{anchorLabel.quote}”</div>
          )}
        </div>
      )}

      {note.source_refs.length > 0 && (
        <div className="mb-4 text-xs font-inter text-gray-600">
          来源：
          {note.source_refs.map((ref) => (
            <span key={ref.source_id} className="mr-2 underline decoration-dotted">
              {ref.title || ref.url || ref.source_id}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(note.metadata.tags ?? []).map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-inter font-medium"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <ClockIcon size="sm" className="text-gray-500" />
          <span className="font-inter text-xs text-gray-500">
            {new Date(note.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-inter text-xs text-gray-500">v{note.version}</span>
          {onDelete && (
            <ConfirmAction
              label="删除"
              confirmLabel="确认删除？"
              detail="笔记正文与它携带的原文锚点会一起删除，且无法撤销"
              onConfirm={() => onDelete(note.id)}
            />
          )}
        </div>
      </div>
    </Card>
  );
};

export default NoteCard;
