import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SafeMarkdown, { type WikilinkMap } from '../components/SafeMarkdown';
import { SITE_BASE } from '../config';
import { loadPublicNotes, type PublicNote, type PublicNotesResult } from '../data/publicNotes';

/** 公开笔记详情：正文只读渲染，音频只在确实生成过时显示播放器。 */
const PublicNoteDetailView: React.FC = () => {
  const { slug = '' } = useParams();
  const [result, setResult] = useState<PublicNotesResult | null>(null);
  const [loading, setLoading] = useState(true);

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
          <p className="mb-2 text-sm font-medium text-gray-800">听这篇笔记</p>
          <audio controls preload="none" src={`${SITE_BASE}audio/${note.content_hash}.wav`} className="w-full">
            当前浏览器不支持音频播放。
          </audio>
        </div>
      ) : (
        <p className="my-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          这篇笔记目前没有音频。
        </p>
      )}

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
