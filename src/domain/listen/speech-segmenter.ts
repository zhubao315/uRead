import { cleanForSpeech } from './speech-text';

export interface SpeechSegment {
  id: string;
  index: number;
  text: string;
  heading: string;
}

/** 先在原始 Markdown 上识别标题，再逐段清理；否则 cleaning 会把 # 抹掉，分区全丢。 */
export function segmentForSpeech(markdown: string): SpeechSegment[] {
  const raw = markdown.replace(/^---[\s\S]*?^---\s*/m, '');
  if (!raw.trim()) return [];
  const segments: SpeechSegment[] = [];
  let heading = '';
  let buffer: string[] = [];

  const push = (text: string) => {
    const clean = cleanForSpeech(text).trim();
    if (!clean) return;
    const index = segments.length;
    segments.push({ id: `${index}-${simpleHash(clean)}`, index, text: clean, heading });
  };
  const flush = () => {
    const text = buffer.join('\n');
    buffer = [];
    if (!text.trim()) return;
    const sentences = text.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) ?? [text];
    let current = '';
    for (const sentence of sentences) {
      if ((current + sentence).length > 220 && current) {
        push(current);
        current = '';
      }
      current += sentence;
    }
    if (current.trim()) push(current);
  };

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s{0,3}#{1,6}\s+(.+)$/);
    if (match) {
      flush();
      heading = match[1].replace(/[*`]/g, '').trim();
    } else if (!line.trim()) {
      flush();
    } else if (!/^\s*(```|---)/.test(line)) {
      buffer.push(line);
    }
  }
  flush();
  return segments;
}

function simpleHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}
