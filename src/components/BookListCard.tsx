import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import Button from './Button';
import Card from './Card';
import ConfirmAction from './ConfirmAction';
import { StarIcon } from './Icon';
import { READING_STATUS_LABEL } from '../data/labels';
import type { BookList, ReadingStatus } from '../data/types';

/** 卡片默认铺开的书名数：再多就折叠，但折叠时必须说清还有几本。 */
export const BOOK_TITLE_LIMIT = 5;

/** 书单里一条**还能打开**的资料（已删除的条目没有标题，只计数，见 missingBookCount）。 */
export interface BookListEntry {
  id: string;
  title: string;
  status: ReadingStatus;
}

interface BookListCardProps {
  bookList: BookList;
  bookCount?: number;
  /** 书单里指向已删除资料的条目数；不写出来，「N 本书」就是一个虚高的数字。 */
  missingBookCount?: number;
  /**
   * 书单里的资料（按书单存的顺序，只含本机还在的条目）。
   *
   * 不传就只报数量——但那种情况下界面必须说清「看不到书名」，
   * 而不是让人以为这个书单是空的。
   */
  entries?: BookListEntry[];
  onDelete?: (id: string) => void;
  /** 资料库里的全部资料（用来勾选取）。不传就不提供管理入口，而不是给一个点了没用的按钮。 */
  libraryBooks?: Array<{ id: string; title: string }>;
  /** 保存书单里的资料集合。 */
  onSaveBooks?: (id: string, bookIds: string[]) => void;
  /** 正在保存（同一时刻只允许一次写盘，避免勾选连点互相覆盖）。 */
  saving?: boolean;
}

const TYPE_LABEL: Record<BookList['type'], string> = {
  personal: '个人书单',
  curated: '精选书单',
  shared: '共享书单',
};

const BookListCard: React.FC<BookListCardProps> = ({
  bookList,
  bookCount,
  missingBookCount = 0,
  entries,
  onDelete,
  libraryBooks = [],
  onSaveBooks,
  saving = false,
}) => {
  const [managing, setManaging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>(bookList.book_ids);

  // 书单里的资料可能在资料库被删过：这些条目要原样保留，
  // 由「其中 N 本已删除」说明，而不是保存时悄悄把它们抹掉。
  const knownIds = new Set(libraryBooks.map((book) => book.id));
  const preserved = bookList.book_ids.filter((id) => !knownIds.has(id));
  const count = bookCount ?? bookList.book_ids.length;

  const toggle = (id: string): void => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const startManaging = (): void => {
    setSelected(bookList.book_ids);
    setManaging(true);
  };

  const save = (): void => {
    const ordered = libraryBooks.filter((book) => selected.includes(book.id)).map((book) => book.id);
    onSaveBooks?.(bookList.id, [...preserved, ...ordered]);
    setManaging(false);
  };

  return (
    <Card variant="glass" hoverEffect className="p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
            <StarIcon size="sm" />
          </div>
          <h3 className="font-inter font-semibold text-gray-900">{bookList.title}</h3>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-inter font-medium bg-amber-100 text-amber-700">
          {TYPE_LABEL[bookList.type] ?? '书单'}
        </span>
      </div>

      {bookList.description && (
        <p className="font-inter text-sm text-gray-600 mb-3">{bookList.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {bookList.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-inter font-medium"
          >
            #{tag}
          </span>
        ))}
      </div>

      {!managing && entries ? (
        <div className="mb-4">
          {entries.length === 0 ? (
            <p className="font-inter text-sm text-gray-600">
              {missingBookCount > 0
                ? `这个书单里只剩 ${missingBookCount} 条指向已删除资料的条目：重新从资料库里勾选。`
                : onSaveBooks
                  ? '这个书单还没有资料：点下面「管理书目」从资料库里勾选。'
                  : '这个书单还没有资料。'}
              {libraryBooks.length === 0 ? '资料库里也还是空的——先到「资料库」导入内容。' : ''}
            </p>
          ) : (
            <>
              <h4 className="font-inter text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                书单里的资料
              </h4>
              <ul className="space-y-1">
                {(expanded ? entries : entries.slice(0, BOOK_TITLE_LIMIT)).map((entry) => (
                  <li key={entry.id} className="flex items-baseline gap-2">
                    <Link
                      to={`/library?q=${encodeURIComponent(entry.title)}`}
                      className="font-inter text-sm text-blue-700 hover:underline"
                    >
                      {entry.title}
                    </Link>
                    <span className="font-inter text-xs text-gray-500 shrink-0">
                      {READING_STATUS_LABEL[entry.status]}
                    </span>
                  </li>
                ))}
              </ul>
              {entries.length > BOOK_TITLE_LIMIT ? (
                <Button type="button" variant="ghost" onClick={() => setExpanded((value) => !value)}>
                  {expanded ? '收起' : `展开全部 ${entries.length} 本`}
                </Button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {managing ? (
        <div className="mb-4 rounded-lg border border-gray-200 p-4">
          <p className="font-inter text-sm font-medium text-gray-900 mb-2">选择书单里的资料</p>
          {libraryBooks.length === 0 ? (
            <p className="font-inter text-sm text-gray-600">
              资料库里还没有资料：先到「资料库」导入内容，再回来往书单里添加。
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
              {libraryBooks.map((book) => {
                const fieldId = `list-${bookList.id}-book-${book.id}`;
                return (
                  <div key={book.id} className="flex items-start gap-2">
                    <input
                      id={fieldId}
                      type="checkbox"
                      checked={selected.includes(book.id)}
                      onChange={() => toggle(book.id)}
                      className="mt-1"
                    />
                    <label htmlFor={fieldId} className="font-inter text-sm text-gray-700">
                      {book.title}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="font-inter text-xs text-gray-500">
              已选 {selected.filter((id) => knownIds.has(id)).length} 本
              {preserved.length > 0 ? `；另有 ${preserved.length} 条指向已删除的资料` : ''}
            </span>
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setManaging(false)}>
                取消
              </Button>
              <Button type="button" variant="primary" isLoading={saving} onClick={save}>
                保存书目
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="font-inter text-xs text-gray-500">
          {count} 本书
          {missingBookCount > 0 ? `（其中 ${missingBookCount} 本已删除）` : ''}
        </span>
        <div className="flex items-center gap-2">
          {onSaveBooks && !managing ? (
            <Button type="button" variant="ghost" onClick={startManaging}>
              管理书目
            </Button>
          ) : null}
          {onDelete && (
            <ConfirmAction
              label="删除"
              confirmLabel="确认删除？"
              detail="只删除这个书单，书单里的书与笔记不会被删除"
              onConfirm={() => onDelete(bookList.id)}
            />
          )}
        </div>
      </div>
    </Card>
  );
};

export default BookListCard;
