import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { filterLists, loadPublicLists, watchPublicLists, type ListsResult, type PublicList } from '../data/publicLists';

/** 主题阅读 / 书单推荐共用的列表页：两块内容分开呈现，不混成一条信息流。 */
const PublicListView: React.FC<{ kind: 'theme' | 'booklist' }> = ({ kind }) => {
  const [result, setResult] = useState<ListsResult | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadPublicLists().then((next) => {
      if (alive) { setResult(next); setLoading(false); }
    });
    const stop = watchPublicLists('', (next) => {
      if (alive) { setResult(next); setUpdated(true); }
    });
    return () => { alive = false; stop(); };
  }, []);

  const items = useMemo(() => {
    const source = kind === 'theme' ? result?.themes ?? [] : result?.booklists ?? [];
    return filterLists(source, query);
  }, [kind, result, query]);

  const base = kind === 'theme' ? '/themes' : '/lists';
  const other = kind === 'theme' ? { path: '/lists', label: '书单推荐' } : { path: '/themes', label: '主题阅读' };

  if (loading && result === null) {
    return <p className="font-inter text-gray-700">正在读取{kind === 'theme' ? '主题' : '书单'}…</p>;
  }
  if (!result?.available) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 font-inter">
        <h1 className="text-xl font-bold text-gray-900">栏目内容尚未生成</h1>
        <p className="mt-2 text-gray-700">{result?.error || '还没有可展示的内容。'}</p>
        <p className="mt-2 text-sm text-gray-600">在本机运行 <code className="rounded bg-white px-1">npm run lists:sync</code> 后重新打开。</p>
      </section>
    );
  }

  const manifest = result.manifest;
  return (
    <section className="font-inter">
      <header className="mb-6">
        <p className="text-sm text-gray-500">公开内容 / {kind === 'theme' ? '主题阅读' : '书单推荐'}</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">{kind === 'theme' ? '主题阅读' : '书单推荐'}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {kind === 'theme'
            ? `按主题组织的阅读路径，共 ${manifest?.theme_count ?? 0} 个主题。`
            : `可直接照着读的推荐清单，共 ${manifest?.booklist_count ?? 0} 份。`}
          书目能对应到公开笔记的，点一下就能打开。
        </p>
        <p className="mt-1 text-xs text-gray-500">版本 {manifest?.version ?? '未知'} · 同步于 {manifest?.generated_at ?? '未知'}</p>
        <Link to={other.path} className="mt-3 inline-block text-sm text-blue-700 hover:underline">切换到{other.label} →</Link>
      </header>

      {updated ? (
        <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-800">
          栏目有新版本，列表已更新。
        </div>
      ) : null}

      <div className="mb-5">
        <label htmlFor={`${kind}-search`} className="sr-only">搜索{kind === 'theme' ? '主题' : '书单'}</label>
        <input
          id={`${kind}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={kind === 'theme' ? '搜索主题或书名' : '搜索书单、书名或作者'}
          placeholder={kind === 'theme' ? '搜索主题或书名' : '搜索书单、书名或作者'}
          className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      {items.length === 0 ? (
        <p className="text-gray-700">没有匹配的内容，换个关键词试试。</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item: PublicList) => (
            <li key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-blue-300">
              <Link to={`${base}/${item.id}`} className="text-lg font-semibold text-blue-700 hover:underline">
                {item.title}
              </Link>
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{item.description || '（这份清单没有摘要）'}</p>
              <p className="mt-3 text-xs text-gray-500">
                {item.book_count} 本书 · {item.linked_notes} 本有笔记{item.updated ? ` · 更新 ${item.updated}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-gray-500">当前显示 {items.length} 项（每 30 秒检查新版本）。</p>
    </section>
  );
};

export default PublicListView;
