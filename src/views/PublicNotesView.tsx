import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { filterNotes, loadPublicNotes, watchPublicNotes, type PublicNotesResult } from '../data/publicNotes';

/**
 * 公开笔记列表。只读：不写 IndexedDB、不新建任何 store，
 * 因此不影响本地数据的八类备份口径。
 */
const PublicNotesView: React.FC = () => {
  const [result, setResult] = useState<PublicNotesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [updated, setUpdated] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setResult(await loadPublicNotes());
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    void loadPublicNotes().then((next) => {
      if (alive) {
        setResult(next);
        setLoading(false);
      }
    });
    const stop = watchPublicNotes('', (next) => {
      if (alive) {
        setResult(next);
        setUpdated(true);
      }
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of result?.notes ?? []) {
      counts.set(note.category, (counts.get(note.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'));
  }, [result]);

  const visible = useMemo(() => {
    const filtered = filterNotes(result?.notes ?? [], query);
    return category ? filtered.filter((note) => note.category === category) : filtered;
  }, [result, query, category]);

  if (loading && result === null) {
    return <p className="font-inter text-gray-700">正在读取公开笔记…</p>;
  }
  if (!result?.available) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 font-inter">
        <h1 className="text-xl font-bold text-gray-900">公开笔记尚未生成</h1>
        <p className="mt-2 text-gray-700">{result?.error || '还没有可展示的笔记。'}</p>
        <p className="mt-2 text-sm text-gray-600">
          在本机运行 <code className="rounded bg-white px-1">node scripts/sync-notes.mjs</code>
          后重新打开本页。本地的读书笔记（IndexedDB）不受影响。
        </p>
        <button type="button" onClick={() => void refresh()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          重新读取
        </button>
      </section>
    );
  }

  const manifest = result.manifest;
  return (
    <section className="font-inter">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">公开读书笔记</h1>
        <p className="mt-1 text-sm text-gray-600">
          共 {manifest?.note_count ?? result.notes.length} 篇 · {manifest?.audio_count ?? 0} 篇可听 ·
          版本 {manifest?.version ?? '未知'} · 生成于 {manifest?.generated_at ?? '未知'}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          这些笔记从 Obsidian 仓库同步而来，内容由笔记作者负责；本站只读，不会修改原文。
        </p>
      </header>

      {updated ? (
        <div role="status" aria-live="polite" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-800">
          笔记有新版本，列表已更新。
          <button type="button" onClick={() => setUpdated(false)} className="ml-3 underline">知道了</button>
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label htmlFor="public-note-search" className="sr-only">搜索公开笔记</label>
        <input
          id="public-note-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、标签或正文"
          className="w-72 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        />
        <button type="button" onClick={() => void refresh()} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
          立即刷新
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`rounded-full px-3 py-1 text-sm ${category === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          全部分类
        </button>
        {categories.map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => setCategory(name)}
            className={`rounded-full px-3 py-1 text-sm ${category === name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {name}（{count}）
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="font-inter text-gray-700">没有匹配的笔记，换个关键词试试。</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((note) => (
            <li key={note.slug} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300">
              <Link to={`/read/${encodeURIComponent(note.slug)}`} className="font-inter text-lg font-semibold text-blue-700 hover:underline">
                {note.title}
              </Link>
              <p className="mt-1 text-sm text-gray-600">
                {note.author || '作者未标注'} · {note.category || '未分类'}
                {note.audio ? ' · 可听' : ''}
              </p>
              {note.tags.length > 0 ? (
                <p className="mt-2 text-xs text-gray-500">{note.tags.join(' / ')}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-gray-500">当前显示 {visible.length} 篇（每 30 秒自动检查新版本）。</p>
    </section>
  );
};

export default PublicNotesView;
