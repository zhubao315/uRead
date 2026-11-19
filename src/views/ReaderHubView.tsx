import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadReaderHub, withProgress, type ReaderHubResult } from '../data/readerHub';

/** 统一 Reader 工作区：把「听笔记」与「电子书」放在同一入口，继续阅读优先。 */
const ReaderHubView: React.FC = () => {
  const [result, setResult] = useState<ReaderHubResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'note' | 'book'>('all');

  useEffect(() => {
    let alive = true;
    void loadReaderHub().then((next) => {
      if (alive) { setResult(next); setLoading(false); }
    });
    return () => { alive = false; };
  }, []);

  const sources = useMemo(() => {
    const base = withProgress(result?.sources ?? [], (key) => {
      if (typeof localStorage === 'undefined') return 0;
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      // 书的进度是 JSON 对象，笔记是秒数；都折算成可排序的数字即可。
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'number' ? parsed : (parsed?.fraction ?? 0);
      } catch {
        return Number(raw) || 0;
      }
    });
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return base.filter((item) => {
      if (kind !== 'all' && item.kind !== kind) return false;
      return words.every((word) => `${item.title} ${item.subtitle}`.toLowerCase().includes(word));
    });
  }, [result, query, kind]);

  if (loading && result === null) {
    return <p className="font-inter text-gray-700">正在整理阅读入口…</p>;
  }
  if (!result?.available) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 font-inter">
        <h1 className="text-xl font-bold text-gray-900">还没有可阅读的内容</h1>
        <p className="mt-2 text-gray-700">{result?.error || '先同步公开笔记或放入书库，再回来看。'}</p>
      </section>
    );
  }

  return (
    <section className="font-inter">
      <header className="mb-6">
        <p className="text-sm text-gray-500">公开内容 / 阅读</p>
        <h1 className="text-3xl font-bold text-gray-900">继续阅读</h1>
        <p className="mt-2 text-sm text-gray-600">把可听的公开笔记和书库里的书放在一处；有本机进度的排在最前。</p>
        <p className="mt-1 text-xs text-gray-500">可听笔记 {result.notes} 篇 · 书 {result.books} 本</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-3">
        <label htmlFor="reader-search" className="sr-only">搜索阅读内容</label>
        <input id="reader-search" type="search" aria-label="搜索阅读内容" value={query}
          onChange={(event) => setQuery(event.target.value)} placeholder="搜索书名或笔记"
          className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
        {(['all', 'note', 'book'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setKind(value)}
            aria-pressed={kind === value}
            className={`rounded-full px-3 py-1.5 text-sm ${kind === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {value === 'all' ? '全部' : value === 'note' ? '笔记' : '书'}
          </button>
        ))}
      </div>

      {sources.length === 0 ? (
        <p className="text-gray-700">没有匹配的内容。</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sources.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300">
              <p className="text-xs text-gray-500">{item.kind === 'note' ? '🎧 听笔记' : '📖 电子书'}</p>
              {item.kind === 'note' ? (
                <Link to={item.href} className="mt-1 block text-base font-semibold text-blue-700 hover:underline">{item.title}</Link>
              ) : (
                <a href={item.href} className="mt-1 block text-base font-semibold text-blue-700 hover:underline">{item.title}</a>
              )}
              <p className="mt-2 text-sm text-gray-600">{item.subtitle}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-gray-500">
        进度只存在这台设备的浏览器里，不会随公开产物发布。
        <Link to="/library" className="ml-2 text-blue-700 hover:underline">回资料库 →</Link>
      </p>
    </section>
  );
};

export default ReaderHubView;
