import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SafeMarkdown, { headingId, type WikilinkMap } from '../components/SafeMarkdown';
import { SITE_BASE } from '../config';
import { loadNoteDetail, loadNoteIndex, type PublicNote } from '../data/publicNotes';
import { SECTION_LABEL, splitNoteSections } from '../domain/note-sections';
import { relatedNotes } from '../domain/note-relations';
import { useSpeechPlayer } from '../hooks/useSpeechPlayer';
import { HeadphonesIcon } from '../components/icons';

interface ReadingPrefs {
  fontSize: number;
  lineHeight: number;
}

const READING_PREFS_KEY = 'uread:reading-prefs';
const DEFAULT_READING_PREFS: ReadingPrefs = { fontSize: 16, lineHeight: 1.9 };

function loadReadingPrefs(): ReadingPrefs {
  try {
    const raw = localStorage.getItem(READING_PREFS_KEY);
    if (!raw) return DEFAULT_READING_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReadingPrefs>;
    return {
      fontSize: typeof parsed.fontSize === 'number'
        ? Math.max(14, Math.min(22, parsed.fontSize)) : DEFAULT_READING_PREFS.fontSize,
      lineHeight: typeof parsed.lineHeight === 'number'
        ? Math.max(1.6, Math.min(2.2, parsed.lineHeight)) : DEFAULT_READING_PREFS.lineHeight,
    };
  } catch {
    return DEFAULT_READING_PREFS;
  }
}

/** 公开笔记详情：正文只读渲染，音频只在确实生成过时显示播放器。 */
const PublicNoteDetailView: React.FC = () => {
  const { slug = '' } = useParams();
  const [note, setNote] = useState<PublicNote | null>(null);
  const [pool, setPool] = useState<Array<{ slug: string; title: string; category: string; tags: string[]; aliases: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reading, setReading] = useState<ReadingPrefs>(loadReadingPrefs);

  useEffect(() => {
    let alive = true;
    // 正文先到先渲染；相关笔记是增强，不应阻塞阅读。
    void loadNoteDetail(slug).then((detail) => {
      if (!alive) return;
      setNote(detail);
      setLoading(false);
    });
    // 相关笔记只是增强，用 low 优先级抓取，别和正文/样式抢带宽。
    void loadNoteIndex('low').then((items) => {
      if (!alive) return;
      setPool(items.map((item) => ({
        slug: item.slug, title: item.title, category: item.category, tags: item.tags, aliases: item.aliases,
      })));
    });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(READING_PREFS_KEY, JSON.stringify(reading));
    } catch {
      // 隐私模式下 localStorage 不可写：不影响本次阅读，下次回到默认值。
    }
  }, [reading]);

  const progressKey = note ? `uread:audio:${note.content_hash}` : '';
  const player = useSpeechPlayer(note?.body ?? '', note?.slug ?? '');
  useEffect(() => {
    if (!note) return;
    document.title = `${note.title} · uRead 读书笔记`;
    return () => { document.title = 'uRead · 个人阅读档案与知识沉淀'; };
  }, [note]);
  // 续播点只在用户真正听过之后才写：没听过的笔记不该被记成 0 秒。

  // 阅读进度：被动监听 + rAF 合帧，滚动时最多每帧更新一次，不抢主线程。
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const value = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;
      setProgress(Math.max(0, Math.min(100, value)));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [note?.slug]);

  const headings = useMemo(() =>
    [...(note?.body ?? '').matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) => ({
      text: match[1].replace(/[*`]/g, '').trim(),
      id: headingId(match[1]),
    })), [note]);

  const sections = useMemo(() => (note ? splitNoteSections(note.body) : []), [note]);
  const related = useMemo(() => note
    ? relatedNotes(
        { slug: note.slug, title: note.title, category: note.category, tags: note.tags },
        pool,
      )
    : [], [note, pool]);

  const links = useMemo<WikilinkMap>(() => {
    const map: WikilinkMap = {};
    const register = (key: string, target: { slug: string }) => {
      if (key) {
        map[key] = target.slug;
      }
    };
    for (const item of pool) {
      register(item.slug, item);
      register(item.slug.split('__').pop() ?? '', item);
      register(item.title, item);
      for (const alias of item.aliases) {
        register(alias, item);
      }
    }
    return map;
  }, [pool]);

  if (loading && note === null) {
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
    <article
      className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 md:p-10 font-inter"
      style={{
        '--note-font-size': `${reading.fontSize}px`,
        '--note-line-height': reading.lineHeight,
      } as React.CSSProperties}
    >
      <div
        role="progressbar"
        aria-label="阅读进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="sticky top-16 z-30 -mx-6 mb-4 border-b border-border bg-surface/90 px-6 py-1 backdrop-blur md:-mx-10 md:px-10"
      >
        <div className="h-1 rounded-full bg-mist">
          <div className="h-1 rounded-full bg-brand transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
        <span className="sr-only">已读 {Math.round(progress)}%</span>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
        <span>阅读设置</span>
        <button type="button" aria-label="缩小字号" title="缩小字号"
          onClick={() => setReading((value) => ({ ...value, fontSize: Math.max(14, value.fontSize - 1) }))}
          className="rounded border border-border px-2 py-1 hover:bg-mist">A−</button>
        <span className="min-w-[3rem] text-center text-navy" aria-live="polite">{reading.fontSize}px</span>
        <button type="button" aria-label="放大字号" title="放大字号"
          onClick={() => setReading((value) => ({ ...value, fontSize: Math.min(22, value.fontSize + 1) }))}
          className="rounded border border-border px-2 py-1 hover:bg-mist">A+</button>
        <span className="mx-1">·</span>
        <button type="button" aria-label="切换行距" title="切换行距"
          onClick={() => setReading((value) => ({
            ...value,
            lineHeight: value.lineHeight >= 2.1
              ? 1.7
              : Math.round((value.lineHeight + 0.2) * 10) / 10,
          }))}
          className="rounded border border-border px-2 py-1 hover:bg-mist">行距 {reading.lineHeight}</button>
      </div>
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
      <h1 className="font-editorial mt-3 text-3xl font-semibold text-navy">{note.title}</h1>
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
            <span className="text-sm font-medium text-gray-800">收听原文录音</span>
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
      ) : null}

      <section className="my-6 rounded-lg border border-border bg-surface p-4" aria-label="朗读正文（设备语音）">
        <div className="flex flex-wrap items-center gap-2">
          <HeadphonesIcon size="md" className="text-brand" />
          <span className="text-sm font-semibold text-navy">朗读正文（设备语音）</span>
          {player.state === 'playing' ? (
            <button type="button" onClick={player.pause} className="rounded border border-border px-3 py-1.5 text-xs">暂停</button>
          ) : player.state === 'paused' ? (
            <button type="button" onClick={player.resume} className="rounded border border-border px-3 py-1.5 text-xs">继续</button>
          ) : (
            <button type="button" onClick={() => player.play(0)} className="rounded bg-brand px-3 py-1.5 text-xs text-white">收听</button>
          )}
          <button type="button" onClick={player.previous} disabled={!player.segment} className="rounded border border-border px-2 py-1.5 text-xs">上一段</button>
          <button type="button" onClick={player.next} disabled={!player.segment} className="rounded border border-border px-2 py-1.5 text-xs">下一段</button>
          <button type="button" onClick={player.stop} disabled={player.state === 'idle'} className="rounded border border-border px-2 py-1.5 text-xs">停止</button>
          <label className="text-xs text-muted">语速
            <select value={player.settings.rate} onChange={(event) => player.setSettings({ ...player.settings, rate: Number(event.target.value) })}
              className="ml-1 rounded border border-border px-2 py-1">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
            </select>
          </label>
          {player.capabilities.chineseVoices.length ? (
            <label className="text-xs text-muted">音色
              <select value={player.settings.voice} onChange={(event) => player.setSettings({ ...player.settings, voice: event.target.value })}
                className="ml-1 rounded border border-border px-2 py-1">
                <option value="">默认</option>
                {player.capabilities.chineseVoices.map((voice) => <option key={voice} value={voice}>{voice}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        {player.segment ? (
          <p className="mt-3 text-sm text-muted">
            第 {player.segment.index + 1} / {player.segments.length} 段 · {player.segment.heading || '正文'}
            <span className="mt-1 block rounded bg-page p-2 text-body">{player.segment.text.slice(0, 160)}</span>
          </p>
        ) : null}
        {player.error ? <p role="alert" className="mt-2 text-xs text-error">{player.error}</p> : null}
        {!player.capabilities.supported ? (
          <p className="mt-2 text-xs text-muted">当前浏览器不支持设备语音朗读，建议使用 Chrome / Edge / Safari。</p>
        ) : null}
      </section>

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

      <div className="note-article mt-6 border-t border-gray-200 pt-4">
        {sections.map((section, index) => (
          <section key={`${section.heading}-${index}`} className={`note-section note-section-${section.kind}`}>
            {section.heading ? (
              <h3 className="note-section-heading">
                <span className="note-section-label">{SECTION_LABEL[section.kind]}</span>
                {section.heading}
              </h3>
            ) : null}
            <SafeMarkdown source={section.body} links={links} />
          </section>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="related-title">
        <h2 id="related-title" className="font-editorial text-lg font-semibold text-navy">相关阅读</h2>
        {related.length ? (
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link to={`/read/${encodeURIComponent(item.slug)}`} className="text-blue-700 hover:underline">{item.title}</Link>
                <span className="ml-2 text-xs text-gray-500">{item.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-600">没有可可靠关联的同主题笔记，这里不编造推荐。</p>
        )}
      </section>

      <footer className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-500">
        来源：Obsidian 私有仓库 · 目录 <code>{note.source_ref.path}</code> · 内容版本 {note.source_ref.sha.slice(0, 12)}
      </footer>
    </article>
  );
};

export default PublicNoteDetailView;
