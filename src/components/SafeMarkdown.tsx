import React from 'react';

/**
 * 只读的 Markdown 渲染器：输出 React 节点，**从不使用 dangerouslySetInnerHTML**。
 *
 * 为什么自己写而不装一个库：这是公开站点，笔记正文来自外部仓库。
 * 任何 `innerHTML` 路径都把「别人写的文本」变成「别人写的 DOM」，XSS 只差一步。
 * 这里只认有限几种块与行内结构，认不出来的原样当文字显示——宁可丑一点，也不猜。
 *
 * 支持：标题 / 段落 / 无序与有序列表 / 引用 / 代码围栏 / 水平线；
 * 行内：粗体、斜体、行内代码、普通链接、图片、Obsidian `[[wikilink]]` 与 `![[图片]]`。
 * 链接只允许 http(s) 与站内路径，`javascript:` 之类一律降级成纯文字。
 */

export interface WikilinkMap {
  [target: string]: string;
}

/** Obsidian 图片嵌入的文件名 → 已同步到本地的站点路径。 */
export interface WikiImageMap {
  [target: string]: string;
}

interface SafeMarkdownProps {
  source: string;
  /** 目标名 → 站内 slug。没有映射的 wikilink 只显示文字，不做假链接。 */
  links?: WikilinkMap;
  /** 图片文件名 → 静态资源路径；没有映射时显示占位文字，不把标记语法暴露给读者。 */
  images?: WikiImageMap;
}

/** 标题锚点：TOC 与正文共用同一个算法，避免「目录跳过去找不到」。 */
export function headingId(text: string): string {
  return text.replace(/[#*`[\]()]/g, '').trim().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60);
}

const SAFE_URL = /^(https?:\/\/|\/|#)/i;

function externalUrl(raw: string): string | null {
  const url = raw.trim();
  return SAFE_URL.test(url) ? url : null;
}

function inline(text: string, links: WikilinkMap, images: WikiImageMap, key: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // 图片嵌入必须排在普通 wikilink 前面，否则 ![[file.jpg]] 会先被当成 [[file.jpg]]。
  const token = /(!\[\[[^\]\n]+\]\])|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(!?\[[^\]]*\]\([^)]*\))|(\[\[[^\]\n]+\]\])/g;
  let cursor = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const part = match[0];
    const id = `${key}-i${index++}`;
    if (part.startsWith('![[')) {
      const target = part.slice(3, -2).split('|')[0].trim();
      const src = images[target];
      if (!src) {
        nodes.push(<span key={id} title="图片资源未同步" className="text-gray-500">[图片：{target}]</span>);
      } else {
        nodes.push(
          <img
            key={id}
            src={src}
            alt={target.replace(/\.[^.]+$/, '')}
            width={400}
            height={600}
            loading="lazy"
            decoding="async"
            style={{ aspectRatio: '2 / 3', height: 'auto' }}
            className="my-3 max-w-full rounded-lg border border-gray-200"
          />,
        );
      }
    } else if (part.startsWith('`')) {
      nodes.push(<code key={id} className="rounded bg-gray-100 px-1 py-0.5 text-sm">{part.slice(1, -1)}</code>);
    } else if (part.startsWith('**')) {
      nodes.push(<strong key={id}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('*')) {
      nodes.push(<em key={id}>{part.slice(1, -1)}</em>);
    } else if (part.startsWith('[[')) {
      const inside = part.slice(2, -2);
      const [target, label] = inside.split('|');
      const slug = links[target.trim()] ?? links[label?.trim() ?? ''];
      nodes.push(
        slug ? (
          <a key={id} href={`/read/${encodeURIComponent(slug)}`} className="text-blue-700 underline decoration-blue-300 hover:decoration-blue-600">
            {label?.trim() || target.trim()}
          </a>
        ) : (
          <span key={id} title="这篇笔记不在公开集合里">{label?.trim() || target.trim()}</span>
        ),
      );
    } else {
      const image = part.startsWith('!');
      const body = image ? part.slice(2, -1) : part.slice(1, -1);
      const split = body.match(/^([^\]]*)\]\(([^)]*)\)$/);
      const label = split?.[1] ?? '';
      const url = split ? externalUrl(split[2]) : null;
      if (!url) {
        nodes.push(part);
      } else if (image) {
        nodes.push(<img key={id} src={url} alt={label} className="my-3 max-w-full rounded-lg border border-gray-200" />);
      } else {
        nodes.push(
          <a key={id} href={url} target="_blank" rel="noreferrer" className="text-blue-700 underline decoration-blue-300 hover:decoration-blue-600">
            {label || url}
          </a>,
        );
      }
    }
    cursor = match.index + part.length;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+\.\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*(?:---|\*\*\*)\s*$/;

const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ source, links = {}, images = {} }) => {
  const lines = source.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={key++} className="my-3 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2], links, images, `h${key}`);
      const anchorId = headingId(heading[2]);
      const cls = 'font-inter font-bold text-gray-900 mt-6 mb-2';
      blocks.push(
        level === 1 ? <h1 id={anchorId} key={key++} className={`${cls} text-3xl`}>{content}</h1>
          : level === 2 ? <h2 id={anchorId} key={key++} className={`${cls} text-2xl`}>{content}</h2>
            : level === 3 ? <h3 id={anchorId} key={key++} className={`${cls} text-xl`}>{content}</h3>
              : <h4 id={anchorId} key={key++} className={`${cls} text-lg`}>{content}</h4>,
      );
      i += 1;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push(<hr key={key++} className="my-6 border-gray-200" />);
      i += 1;
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote key={key++} className="my-3 border-l-4 border-blue-300 bg-blue-50 px-4 py-2 text-gray-700">
          {inline(quoted.join('\n'), links, images, `q${key}`)}
        </blockquote>,
      );
      continue;
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const ordered = ORDERED.test(line);
      const pattern = ordered ? ORDERED : BULLET;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(lines[i].match(pattern)?.[1] ?? '');
        i += 1;
      }
      const children = items.map((item, index) => (
        <li key={index} className="ml-5 list-disc leading-7">{inline(item, links, images, `li${key}-${index}`)}</li>
      ));
      blocks.push(
        ordered ? <ol key={key++} className="my-3">{children}</ol> : <ul key={key++} className="my-3">{children}</ul>,
      );
      continue;
    }
    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !BULLET.test(lines[i]) && !ORDERED.test(lines[i]) && !QUOTE.test(lines[i]) && !RULE.test(lines[i]) && !lines[i].trim().startsWith('```')) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={key++} className="my-2 leading-7 text-gray-800">
        {inline(paragraph.join('\n'), links, images, `p${key}`)}
      </p>,
    );
  }
  return <div className="font-inter">{blocks}</div>;
};

export default SafeMarkdown;
