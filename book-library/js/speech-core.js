/**
 * uRead 静态书库 — 语音公共工具（纯浏览器 ES Module，无构建步骤）。
 * 只依赖浏览器标准 API；与 src/ 下的 React 语音模块保持独立，避免两套状态机互相覆盖。
 */

const SENTENCE_END = /[。！？!?；;]+/u;

/** 清洗从 EPUB Range 提取出来的纯文本：实体、空白、装饰性脚注标记。 */
export function cleanSpeechText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\[\s*\d+\s*\]/g, ' ') // [1] 这类脚注编号
    .replace(/\s+/g, ' ')
    .replace(/\s*([。！？!?；;，、：:,.])\s*/g, '$1')
    .trim();
}

/**
 * 中文友好分段：优先按句，单段约 120–220 字，不在不合理位置切断。
 * 不丢失、不重复正文；超长单句不强行切开（避免破坏语义）。
 */
export function segmentForSpeech(text, { min = 120, max = 220 } = {}) {
  const clean = cleanSpeechText(text);
  if (!clean) return [];
  const sentences = clean
    .split(SENTENCE_END)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, i, arr) => (i < arr.length - 1 ? `${part}。` : part));

  const out = [];
  let buffer = '';
  const flush = () => {
    const value = buffer.trim();
    if (value) out.push(value);
    buffer = '';
  };
  for (const sentence of sentences) {
    if (buffer && buffer.length + sentence.length > max) flush();
    buffer += sentence;
    if (buffer.length >= min) flush();
  }
  flush();
  return out;
}

/** 解析 Foliate TTS 返回的 SSML，得到 [{ text, mark }]。 */
export function parseTTSMarks(ssml) {
  if (!ssml || typeof ssml !== 'string') return [];
  const doc = new DOMParser().parseFromString(ssml, 'application/xml');
  if (doc.querySelector('parsererror')) return [];
  const root = doc.documentElement;
  if (!root) return [];

  const segments = [];
  let mark = null;
  let buffer = '';
  const push = () => {
    const text = cleanSpeechText(buffer);
    if (text) segments.push({ text, mark });
    buffer = '';
  };
  for (const node of root.childNodes) {
    if (node.nodeType === 1 && node.localName === 'mark') {
      push();
      mark = node.getAttribute('name') || null;
    } else {
      buffer += node.textContent || '';
    }
  }
  push();
  return segments.filter((segment) => segment.text.length > 0);
}

/** 语音能力检测；返回动态音色列表，并监听 voiceschanged 刷新。 */
export function detectSpeechCapabilities() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const hasUtterance = typeof window !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function';
  if (!synth || !hasUtterance) {
    return {
      supported: false,
      canPause: false,
      boundaryEvents: false,
      mediaSession: false,
      wakeLock: false,
      fullscreen: false,
      voices: [],
      chineseVoices: [],
    };
  }
  const voices = Array.from(synth.getVoices() || []);
  return {
    supported: true,
    canPause: typeof synth.pause === 'function' && typeof synth.resume === 'function',
    boundaryEvents: 'onboundary' in window.SpeechSynthesisUtterance.prototype,
    mediaSession: typeof navigator !== 'undefined' && !!navigator.mediaSession,
    wakeLock: typeof navigator !== 'undefined' && !!navigator.wakeLock?.request,
    fullscreen: typeof document !== 'undefined' && !!document.documentElement?.requestFullscreen,
    voices,
    chineseVoices: voices.filter((voice) => /zh|cmn|中文|普通话/i.test(`${voice.lang} ${voice.name}`)),
  };
}

export function onVoicesChanged(callback) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {};
  const handler = () => callback(detectSpeechCapabilities());
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  // Chrome 首次调用常返回空列表；异步补一次。
  Promise.resolve().then(handler);
  return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', handler);
}
