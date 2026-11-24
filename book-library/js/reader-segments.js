/**
 * uRead 静态书库 — EPUB 当前文档文本分段与 Range 映射。
 * 只读取 foliate 已经渲染的 iframe 文档，不重新解析整本书。
 */

const BLOCK_TAGS = new Set([
  'article', 'aside', 'blockquote', 'caption', 'dd', 'div', 'dl', 'dt',
  'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'tr', 'ul',
]);
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'canvas']);

/** 从已渲染的文档里按块提取 Range（只处理当前章节一个文档）。 */
export function getBlockRanges(doc) {
  const out = [];
  const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode;
    const name = el.localName;
    if (!BLOCK_TAGS.has(name)) continue;
    if (el.closest('nav, header, footer')) continue;
    if (SKIP_TAGS.has(name)) continue;
    const text = cleanText(el.textContent);
    if (text.length < 2) continue;
    const range = doc.createRange();
    range.selectNodeContents(el);
    out.push({ range, text });
  }
  return out;
}

/** 找到包含（或紧随）给定位置的内容块索引。 */
export function findBlockIndex(blocks, anchorRange) {
  if (!anchorRange || typeof anchorRange.compareBoundaryPoints !== 'function') return 0;
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i].range;
    if (anchorRange.compareBoundaryPoints(Range.START_TO_START, block) <= 0) return i;
  }
  return Math.max(0, blocks.length - 1);
}

export function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\s+/g, ' ')
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
    .replace(/\u00a0/g, ' ')
    .replace(/\[\s*\d+\s*\]/g, ' ')
    .replace(/\s*([。！？!?；;，、：:,.])\s*/g, '$1')
    .trim();
}

/**
 * 把一个块的 Range 切成句子级片段，并保留对应的 Range 供高亮/滚动。
 * 每段约 120–220 字；不丢失、不重复正文。
 */
export function segmentBlock(doc, blockRange, lang = 'zh-CN', { min = 120, max = 220 } = {}) {
  const parts = [];
  const walker = doc.createTreeWalker(
    blockRange.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    { acceptNode: (node) => (node.parentElement?.closest('script,style,noscript') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) },
  );
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (blockRange.intersectsNode(node)) parts.push({ node, text: node.data });
  }
  const full = parts.map((part) => part.text).join('');
  if (cleanText(full).length < 2) return [];

  const locate = (index) => {
    let acc = 0;
    for (const part of parts) {
      if (index <= acc + part.text.length) return { node: part.node, offset: Math.max(0, index - acc) };
      acc += part.text.length;
    }
    const last = parts[parts.length - 1];
    return { node: last.node, offset: last.text.length };
  };

  const sentences = splitSentences(full, lang);
  const out = [];
  let buffer = [];
  let bufferLen = 0;
  const flush = () => {
    const text = cleanText(buffer.map((item) => item.text).join(''));
    if (!text) { buffer = []; bufferLen = 0; return; }
    const start = buffer[0].start;
    const end = buffer[buffer.length - 1].end;
    const range = doc.createRange();
    const a = locate(start);
    const b = locate(Math.max(start, end - 1));
    range.setStart(a.node, a.offset);
    range.setEnd(b.node, Math.min(b.offset + 1, b.node.length ?? 1));
    out.push({ text, range });
    buffer = [];
    bufferLen = 0;
  };

  for (const sentence of sentences) {
    const clean = cleanText(sentence.text);
    if (!clean) continue;
    if (bufferLen && bufferLen + clean.length > max) flush();
    buffer.push({ text: sentence.text, start: sentence.start, end: sentence.start + sentence.text.length });
    bufferLen += clean.length;
    if (bufferLen >= min) flush();
  }
  flush();
  return out;
}

function splitSentences(text, lang) {
  const raw = [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter(lang || 'zh-CN', { granularity: 'sentence' });
      for (const item of segmenter.segment(text)) raw.push({ text: item.segment, start: item.index });
    } catch { /* fallback below */ }
  }
  if (!raw.length) {
    const regex = /[^。！？!?；;\n]+[。！？!?；;\n]*/g;
    for (const match of text.matchAll(regex)) raw.push({ text: match[0], start: match.index });
  }
  return raw.filter((item) => cleanText(item.text));
}
