/**
 * 原文锚点契约（领域层，无 UI / 无 IO）。
 *
 * 原则：定位符只是一部分证据；`quote` 必须能在真实来源里找到，
 * 否则「能定位」只是一句没有核验的承诺。PDF/EPUB 的二进制定位无法在纯文本层核验时，
 * 如实返回 `needs_source`，而不是伪装成通过。
 */

export type AnchorFormat = 'epub' | 'pdf' | 'markdown' | 'txt' | 'web';

export type AnchorLocator =
  | { type: 'epub-cfi'; value: string }
  | { type: 'pdf-page'; value: string }
  | { type: 'text-offset'; value: string }
  | { type: 'line-range'; value: string }
  | { type: 'url-fragment'; value: string };

export interface SourceAnchor {
  sourceId: string;
  format: AnchorFormat;
  locator: AnchorLocator;
  quote: string;
  prefix?: string;
  suffix?: string;
  contentHash?: string;
  sourceVersion?: number;
}

export type AnchorCheck =
  | { ok: true; verifiedBy: 'quote-in-text' }
  | { ok: false; reason: 'empty-quote' | 'bad-locator' | 'quote-not-found' | 'needs-source' };

export function makeAnchor(input: {
  sourceId: string;
  format: AnchorFormat;
  locator: AnchorLocator;
  quote: string;
  prefix?: string;
  suffix?: string;
  contentHash?: string;
  sourceVersion?: number;
}): SourceAnchor {
  if (!input.quote.trim()) throw new Error('锚点必须带引文，否则无法核验');
  if (!input.locator.value.trim()) throw new Error('锚点定位符不能为空');
  return {
    sourceId: input.sourceId,
    format: input.format,
    locator: input.locator,
    quote: input.quote.trim(),
    prefix: input.prefix?.trim() || undefined,
    suffix: input.suffix?.trim() || undefined,
    contentHash: input.contentHash || undefined,
    sourceVersion: input.sourceVersion,
  };
}

/** 用真实文本核验引文。line-range 会先切出声明的行区间，防止「引文在别处也算通过」。 */
export function verifyAnchor(anchor: SourceAnchor, sourceText: string): AnchorCheck {
  if (!anchor.quote.trim()) return { ok: false, reason: 'empty-quote' };
  if (!anchor.locator.value.trim()) return { ok: false, reason: 'bad-locator' };

  if (anchor.format === 'markdown' && anchor.locator.type === 'line-range') {
    const match = anchor.locator.value.match(/^(\d+)-(\d+)$/);
    if (!match) return { ok: false, reason: 'bad-locator' };
    const lines = sourceText.split(/\r?\n/);
    const slice = lines.slice(Number(match[1]) - 1, Number(match[2])).join('\n');
    return slice.includes(anchor.quote) ? { ok: true, verifiedBy: 'quote-in-text' } : { ok: false, reason: 'quote-not-found' };
  }

  if (anchor.locator.type === 'text-offset') {
    const position = Number(anchor.locator.value);
    if (!Number.isInteger(position) || position < 0) return { ok: false, reason: 'bad-locator' };
    return sourceText.slice(position, position + anchor.quote.length) === anchor.quote
      ? { ok: true, verifiedBy: 'quote-in-text' }
      : { ok: false, reason: 'quote-not-found' };
  }

  // EPUB CFI / PDF 页码 / URL 片段需要原始文件或 DOM；纯文本层不假判绿。
  return { ok: false, reason: 'needs-source' };
}

export function anchorLabel(anchor: SourceAnchor): string {
  const locator = `${anchor.locator.type}:${anchor.locator.value}`;
  return `${anchor.sourceId} · ${locator} · 「${anchor.quote.slice(0, 24)}${anchor.quote.length > 24 ? '…' : ''}」`;
}
