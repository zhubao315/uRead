// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanText, getBlockRanges, segmentBlock } from '../../book-library/js/reader-segments.js';

const html = `<h1>第一章</h1><p>这是第一句话。这是第二句话，含有中文标点；这是第三句话！</p><p>第二段很短。</p>`;

describe('reader-segments (静态书库听书分段)', () => {
  it('cleans Chinese punctuation and collapses whitespace', () => {
    expect(cleanText('  你好   世界 。 测试，正确  ')).toBe('你好世界。测试，正确');
  });

  it('extracts block ranges from the rendered document', () => {
    document.body.innerHTML = html;
    const blocks = getBlockRanges(document);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0].text).toContain('第一章');
    expect(blocks.some((block) => block.text.includes('第二句话'))).toBe(true);
  });

  it('segments a block into readable pieces with ranges', () => {
    document.body.innerHTML = html;
    const blocks = getBlockRanges(document);
    const paragraph = blocks.find((block) => block.text.includes('第二句话'));
    expect(paragraph).toBeTruthy();
    const segments = segmentBlock(document, paragraph!.range, 'zh-CN');
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.map((s) => s.text).join('')).toContain('第二句话');
    for (const segment of segments) {
      expect(segment.range.toString().length).toBeGreaterThan(0);
    }
  });
});
