/**
 * Obsidian 笔记 → 公开阅读产物的纯函数。
 *
 * 为什么单独一个 .mjs：同步脚本（Node）与前端测试（vitest）都要用同一套解析规则。
 * 两边各写一份，迟早一份真一份假——这正是 uRead 整个仓库在反对的那件事。
 *
 * 这里不读取任何文件、不发网络请求、不碰环境变量：副作用全在 sync-notes.mjs 里。
 */

import { createHash } from 'node:crypto';

/** 只解析本仓库真实笔记用到的 YAML 子集：标量、带引号标量、行内数组、以 `- ` 开头的列表。 */
export function parseFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, '');
  // 真实笔记里 frontmatter 闭合之后还会再有一行 `---`（空的第二块），一并吃掉。
  const opener = /^---\s*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n---[ \t]*)?\r?\n?/;
  const match = normalized.match(opener);
  if (!match) {
    return { meta: {}, body: normalized, hasFrontmatter: false };
  }
  const meta = {};
  let currentListKey = null;
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trimStart().startsWith('#')) {
      continue;
    }
    const list = line.match(/^\s+-\s+(.*)$/);
    if (list && currentListKey) {
      meta[currentListKey].push(unquote(list[1]));
      continue;
    }
    const pair = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!pair) {
      continue;
    }
    const [, key, value] = pair;
    if (value.trim() === '') {
      meta[key] = [];
      currentListKey = key;
    } else {
      meta[key] = unquote(value.trim());
      currentListKey = null;
    }
  }
  // 清理空列表：空数组不该出现在公开产物里（它只制造噪声）。
  for (const key of Object.keys(meta)) {
    if (Array.isArray(meta[key]) && meta[key].length === 0) {
      delete meta[key];
    }
  }
  return { meta, body: normalized.slice(match[0].length), hasFrontmatter: true };
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

/**
 * 相对路径 → 路由段。保留中文与书名号（URL 里会被 encodeURIComponent），
 * 把层级目录压成 `B1-文学虚构__《三体》-刘慈欣`：这样 react-router 的 `:slug` 仍是单段，
 * 不同子目录里的同名文件也不会撞。
 */
export function slugFor(relativePath) {
  return relativePath
    .replace(/\.md$/i, '')
    .split('/')
    .filter(Boolean)
    .join('__');
}

/** 公开产物只保留这几列白名单，frontmatter 里其余字段（哪怕是私有的）一律不出机器。 */
export function publicNote(record, relativePath) {
  const { meta, body } = parseFrontmatter(record.text);
  const pieces = relativePath.replace(/\.md$/i, '').split('/');
  return {
    slug: slugFor(relativePath),
    title: String(meta.title ?? pieces[pieces.length - 1]),
    author: meta.author ? String(meta.author) : '',
    category: pieces.length > 1 ? pieces[0] : '',
    created: meta.created ? String(meta.created) : '',
    updated: meta.updated ? String(meta.updated) : '',
    source: meta.source ? String(meta.source) : '',
    status: meta.status ? String(meta.status) : '',
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    aliases: Array.isArray(meta.aliases) ? meta.aliases.map(String) : [],
    body,
    source_ref: {
      path: relativePath,
      sha: record.sha,
      url: `https://github.com/zhubao315/obsidian-vault/blob/main/${encodeURI(relativePath)}`,
    },
    content_hash: createHash('sha256').update(record.text).digest('hex').slice(0, 16),
    audio: false, // 由音频生成阶段按实际存在的文件回填，不靠猜
  };
}

/** 正文 → 朗读稿。去掉 Markdown 记号、wikilink 只留显示名、跳过图片与代码围栏。 */
export function narrationText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[\[([^\]]+)\]\]/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/^\s*---+\s*$/gm, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 按句子边界切块，长块再按字符硬切。宁可多切，也不让服务端 4096 token 截断。 */
export function splitForTts(text, maxChars = 900) {
  const clean = text.replace(/\r/g, '').trim();
  if (!clean) {
    return [];
  }
  const paragraphs = clean.split(/\n{2,}/);
  const chunks = [];
  let current = '';
  const flush = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = '';
  };
  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) ?? [paragraph];
    for (const sentence of sentences) {
      if (current.length + sentence.length > maxChars) {
        flush();
      }
      if (sentence.length > maxChars) {
        for (let i = 0; i < sentence.length; i += maxChars) {
          chunks.push(sentence.slice(i, i + maxChars));
        }
      } else {
        current += sentence;
      }
    }
  }
  flush();
  return chunks;
}

/**
 * 拼接同源 wav：Qwen3-TTS 产出 24 kHz / 单声道 / 16-bit PCM。
 * 只保留第一个头，把其余 wav 的 data 段接上去，再重写 RIFF 长度。
 * 不兼容的源直接报错——静默拼出半截音频比失败更糟。
 */
export function concatWav(buffers) {
  if (buffers.length === 0) {
    throw new Error('没有可拼接的音频');
  }
  const first = buffers[0];
  const asText = (buf) => buf.toString('latin1', 0, Math.min(buf.length, 64));
  if (first.length < 44 || asText(first).slice(0, 4) !== 'RIFF' || asText(first).slice(8, 12) !== 'WAVE') {
    throw new Error('首个音频不是合法 wav');
  }
  const rate = first.readUInt32LE(24);
  const channels = first.readUInt16LE(22);
  // 偏移 34 是「位深」(16)，不是字节数；拿它当 width 会把自己造的合法 wav 判红。
  const bits = first.readUInt16LE(34);
  const width = bits / 8;
  const datas = [];
  for (const [index, buf] of buffers.entries()) {
    if (buf.length < 44 || asText(buf).slice(0, 4) !== 'RIFF' || asText(buf).slice(8, 12) !== 'WAVE') {
      throw new Error(`第 ${index + 1} 段不是合法 wav`);
    }
    if (buf.readUInt32LE(24) !== rate || buf.readUInt16LE(22) !== channels || buf.readUInt16LE(34) !== bits) {
      throw new Error(`第 ${index + 1} 段格式不一致（${buf.readUInt32LE(24)} Hz / ${buf.readUInt16LE(22)} 声道 / ${buf.readUInt16LE(34)} bit）`);
    }
    // fmt 块之后可能还有别的 chunk；找到真正的 data 标记，不硬编码偏移 44。
    let offset = 12;
    let data = null;
    while (offset + 8 <= buf.length) {
      const id = asText(buf.subarray(offset, offset + 4));
      const size = buf.readUInt32LE(offset + 4);
      if (id === 'data') {
        data = buf.subarray(offset + 8, offset + 8 + size);
        break;
      }
      offset += 8 + size + (size % 2);
    }
    if (!data || data.length === 0) {
      throw new Error(`第 ${index + 1} 段没有 data 区`);
    }
    datas.push(data);
  }
  const total = datas.reduce((sum, d) => sum + d.length, 0);
  if (width !== 2 || channels !== 1 || rate !== 24000) {
    throw new Error(`不支持的音频格式：${rate} Hz / ${channels} 声道 / ${bits} bit`);
  }
  const out = Buffer.alloc(44 + total);
  out.write('RIFF', 0, 'latin1');
  out.writeUInt32LE(36 + total, 4);
  out.write('WAVE', 8, 'latin1');
  out.write('fmt ', 12, 'latin1');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(channels, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * channels * (width / 2), 28);
  out.writeUInt16LE(channels * (width / 2), 32);
  out.writeUInt16LE(bits, 34);
  out.write('data', 36, 'latin1');
  out.writeUInt32LE(total, 40);
  let cursor = 44;
  for (const d of datas) {
    d.copy(out, cursor);
    cursor += d.length;
  }
  return out;
}

/** contents API 的路径相对仓库根；漏掉笔记目录前缀会得到 404（真实踩过）。 */
export function contentsUrl(repo, notePath, branch, relative) {
  const repoPath = `${notePath}/${relative}`.replace(/^\/+/, '');
  return `https://api.github.com/repos/${repo}/contents/${repoPath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}?ref=${encodeURIComponent(branch)}`;
}

/** 生成稳定 wav 文件名：同内容同文件名，重跑不产生垃圾。 */
export function audioName(contentHash) {
  return `${contentHash}.wav`;
}
