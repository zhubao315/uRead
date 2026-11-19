/** 原文锚点契约：引文必须可核验，无法核验的格式必须如实说 needs-source。 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { anchorLabel, makeAnchor, verifyAnchor, type SourceAnchor } from '../../src/domain/anchors';

const text = '第一行\n第二行含目标句子\n第三行';

const base = (overrides: Partial<SourceAnchor> = {}): SourceAnchor => ({
  sourceId: 'book-1',
  format: 'markdown',
  locator: { type: 'line-range', value: '2-2' },
  quote: '第二行含目标句子',
  ...overrides,
});

describe('锚点构造', () => {
  it('空引文或空定位符直接拒绝，不存半成品', () => {
    expect(() => makeAnchor({ ...base(), quote: '  ' })).toThrow(/引文/);
    expect(() => makeAnchor({ ...base(), locator: { type: 'line-range', value: '' } })).toThrow(/定位符/);
  });

  it('构造时裁掉首尾空白，保留可选上下文', () => {
    const anchor = makeAnchor({ ...base(), quote: '  目标句子  ', prefix: '含', contentHash: 'abc' });
    expect(anchor.quote).toBe('目标句子');
    expect(anchor.prefix).toBe('含');
    expect(anchor.contentHash).toBe('abc');
  });
});

describe('锚点核验', () => {
  it('Markdown 行区间：引文必须在声明的行里', () => {
    expect(verifyAnchor(base(), text)).toEqual({ ok: true, verifiedBy: 'quote-in-text' });
    expect(verifyAnchor(base({ locator: { type: 'line-range', value: '1-1' } }), text))
      .toEqual({ ok: false, reason: 'quote-not-found' });
  });

  it('文本偏移：位置不匹配不判绿', () => {
    expect(verifyAnchor(base({ format: 'txt', locator: { type: 'text-offset', value: '4' } }), text).ok).toBe(true);
    expect(verifyAnchor(base({ format: 'txt', locator: { type: 'text-offset', value: '99' } }), text))
      .toEqual({ ok: false, reason: 'quote-not-found' });
  });

  it('EPUB/PDF 需要原始文件，不伪装成通过', () => {
    expect(verifyAnchor(base({ format: 'epub', locator: { type: 'epub-cfi', value: '/6/4' } }), text))
      .toEqual({ ok: false, reason: 'needs-source' });
    expect(verifyAnchor(base({ format: 'pdf', locator: { type: 'pdf-page', value: '12' } }), text))
      .toEqual({ ok: false, reason: 'needs-source' });
  });

  it('摘要只显示前 24 字，不把整段引文塞进列表', () => {
    expect(anchorLabel(base({ quote: 'x'.repeat(50) }))).toContain('…');
  });
});
