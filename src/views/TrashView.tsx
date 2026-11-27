import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '../components/Button';
import Card from '../components/Card';
import ConfirmAction from '../components/ConfirmAction';
import StateBlock from '../components/StateBlock';
import {
  listTrashed,
  purgeDeleted,
  restoreTrashed,
  type TrashedEntry,
} from '../data/repository';
import { useLibraryStore } from '../store/libraryStore';

/** 回收站：普通删除先到这里；只有这里的确认操作才真正移除数据。 */
const TrashView: React.FC = () => {
  const [entries, setEntries] = useState<TrashedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useLibraryStore((state) => state.load);

  const refresh = useCallback(async () => {
    try {
      setEntries(await listTrashed());
      setError(null);
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    }
  }, []);

  useEffect(() => {
    let active = true;
    listTrashed().then(
      (rows) => {
        if (!active) return;
        setEntries(rows);
        setError(null);
      },
      (cause) => {
        if (active) setError(String(cause instanceof Error ? cause.message : cause));
      },
    );
    return () => { active = false; };
  }, []);

  const act = async (operation: () => Promise<void>) => {
    setBusy(true);
    try {
      await operation();
      await load();
      await refresh();
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.16em] text-brand">RECYCLE BIN</p>
        <h1 className="mt-2 font-editorial text-3xl text-navy">回收站</h1>
        <p className="mt-2 text-sm text-gray-600">
          普通删除会先到这里，可随时恢复。只有下方的「永久删除」才会真正移除数据，且不可通过本页恢复。
        </p>
        <Link to="/workspace/library" className="mt-3 inline-block text-sm text-brand hover:underline">
          ← 返回资料库
        </Link>
      </header>

      {error && <StateBlock error={error} onRetry={() => void refresh()} />}

      {!error && entries.length === 0 && (
        <Card variant="default" className="p-6">
          <p className="text-sm text-gray-600">回收站是空的。</p>
        </Card>
      )}

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={`${entry.store}:${entry.id}`}>
            <Card variant="default" className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy">{entry.title}</p>
                <p className="text-xs text-gray-500">删除于 {entry.deleted_at}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void act(() => restoreTrashed(entry.store, entry.id))}
                >
                  恢复
                </Button>
                <ConfirmAction
                  label="永久删除"
                  confirmLabel="永久删除这条数据？此操作不可恢复。"
                  disabled={busy}
                  onConfirm={() => act(() => purgeDeleted(entry.store, entry.id))}
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TrashView;
