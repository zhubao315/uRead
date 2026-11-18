import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SafeMarkdown, { headingId, type WikilinkMap } from '../components/SafeMarkdown';
import { SITE_BASE } from '../config';
import { loadPublicNotes, type PublicNote, type PublicNotesResult } from '../data/publicNotes';

/** 公开笔记详情：正文只读渲染，音频只在确实生成过时显示播放器。 */
const PublicNoteDetailView: React.FC = () => {
  const { slug = '' } = useParams();
  const [result, setResult] = useState<PublicNotesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadPublicNotes().then((next) => {
      if (alive) {
        setResult(next);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const note = useMemo(
    () => (result?.notes ?? []).find((item) => item.slug === slug) ?? null,
    [result, slug],
  );

  const progressKey = note ? `uread:audio:${note.content_hash}` : '';
  // 续播点只在用户真正听过之后才写：没听过的笔记不该被记成 0 秒。

  const headings = useMemo(() =>
    [...(note?.body ?? '').matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) => ({
      text: match[1].replace(/[*`]/g, '').trim(),
      id: headingId(match[1]),
    })), [note]);

  const links = useMemo<WikilinkMap>(() => {
    const map: WikilinkMap = {};
    const register = (key: string, target: PublicNote) => {
      if (key) {
        map[key] = target.slug;
      }
    };
    for (const item of result?.notes ?? []) {
      register(item.slug, item);
      register(item.slug.split('__').pop() ?? '', item);
      register(item.title, item);
      for (const alias of item.aliases) {
        register(alias, item);
      }
    }
    return map;
  }, [result]);

  if (loading && result === null) {
    return <p className="font-inter text-gray-700">正在读取笔记…</p>;
  }
  if (!note) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-8 font-inter">
        <h1 className="text-2xl font-bold text-gray-900">这篇笔记不在公开集合里</h1>
        <p className="mt-2 text-gray-700">可能是地址写错，或者笔记还没同步进来。</p>
        <Link to="/read" className="mt-4 inline-block text-blue-700 hover:underline">返回公开笔记列表</Link>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 md:p-10 font-inter">
      <div className="mb-3 flex items-center gap-3">
        <button type="button" onClick={() => {
          void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true));
        }} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
          {copied ? '已复制笔记链接' : '复制笔记链接'}
        </button>
        <a href={`${SITE_BASE}books/?q=${encodeURIComponent(note.title)}`} className="text-xs text-emerald-700 hover:underline">
          在书库里找这本书 →
        </a>
      </div>

      <p className="text-sm text-gray-500">
        <Link to="/read" className="hover:text-blue-700 hover:underline">公开笔记</Link>
        <span className="mx-2">/</span>
        {note.category || '未分类'}
      </p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900">{note.title}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {note.author ? `作者：${note.author} · ` : ''}
        {note.updated ? `更新：${note.updated} · ` : ''}
        {note.status ? `状态：${note.status}` : ''}
      </p>
      {note.tags.length > 0 ? (
        <p className="mt-2 text-xs text-gray-500">{note.tags.join(' / ')}</p>
      ) : null}

      {note.audio ? (
        <div className="my-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-800">听这篇笔记</span>
            {[1, 1.25, 1.5, 2].map((rate) => (
              <button key={rate} type="button" aria-pressed={speed === rate}
                onClick={() => { if (audioRef.current) audioRef.current.playbackRate = rate; setSpeed(rate); }}
                className={`rounded-full px-2.5 py-1 text-xs ${speed === rate ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
                {rate}×
              </button>
            ))}
          </div>
          <audio
            ref={audioRef}
            controls
            preload="none"
            src={`${SITE_BASE}audio/${note.content_hash}.wav`}
            onLoadedMetadata={(event) => {
              const saved = Number(localStorage.getItem(progressKey) || 0);
              if (saved > 0) event.currentTarget.currentTime = saved;
            }}
            onTimeUpdate={(event) => {
              const current = Math.floor(event.currentTarget.currentTime);
              if (current > 0 && current % 5 === 0) localStorage.setItem(progressKey, String(current));
            }}
            className="w-full"
          >
            当前浏览器不支持音频播放。
          </audio>
        </div>
      ) : (
        <p className="my-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          这篇笔记目前没有音频。
        </p>
      )}

      {headings.length > 1 ? (
        <nav aria-label="本篇目录" className="my-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-800">本篇目录</p>
          <ul className="space-y-1 text-sm">
            {headings.map((item, index) => (
              <li key={`${item.id}-${index}`}>
                <a href={`#${item.id}`} className="text-blue-700 hover:underline">{item.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="mt-6 border-t border-gray-200 pt-4">
        <SafeMarkdown source={note.body} links={links} />
      </div>

      <footer className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-500">
        来源：Obsidian 私有仓库 · 目录 <code>{note.source_ref.path}</code> · 内容版本 {note.source_ref.sha.slice(0, 12)}
      </footer>
    </article>
  );
};

export default PublicNoteDetailView;
