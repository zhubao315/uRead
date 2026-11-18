/**
 * 公开笔记解析器的真实断言。
 *
 * 这里的样例来自真实 Obsidian 笔记的形态（YAML frontmatter + 第二道 `---` + 正文 + wikilink），
 * 但内容是合成的，不把私有笔记正文写进测试文件。
 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  audioName,
  concatWav,
  contentsUrl,
  narrationText,
  parseFrontmatter,
  publicNote,
  slugFor,
  splitForTts,
} from '../../scripts/notes-format.mjs';

const SAMPLE = `---
title: "示例笔记"
author: 某人
tags:
  - "类型/读书笔记"
  - "维度/文学"
internal_token: 不该出门
---
---

# 示例笔记

正文第一段，含 [[另一篇笔记]] 与 **重点**。

- 第一条
- 第二段

\`\`\`js
const secret = 1;
\`\`\`
`;

function wav(samples: number[]): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((value, index) => data.writeInt16LE(value, index * 2));
  const out = Buffer.alloc(44 + data.length);
  out.write('RIFF', 0, 'latin1');
  out.writeUInt32LE(36 + data.length, 4);
  out.write('WAVE', 8, 'latin1');
  out.write('fmt ', 12, 'latin1');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(24000, 24);
  out.writeUInt32LE(48000, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36, 'latin1');
  out.writeUInt32LE(data.length, 40);
  data.copy(out, 44);
  return out;
}

describe('Obsidian frontmatter 解析', () => {
  it('认得闭合后多出的第二道 ---，正文不会被它吃掉', () => {
    const parsed = parseFrontmatter(SAMPLE);
    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.meta.title).toBe('示例笔记');
    expect(parsed.meta.tags).toEqual(['类型/读书笔记', '维度/文学']);
    expect(parsed.body).toContain('# 示例笔记');
    expect(parsed.body).toContain('正文第一段');
  });

  it('公开产物只带白名单字段，frontmatter 里的私有键不出去', () => {
    const note = publicNote({ text: SAMPLE, sha: 'abc123' }, 'B1-文学虚构/示例笔记.md');
    expect(note.title).toBe('示例笔记');
    expect(note.category).toBe('B1-文学虚构');
    expect(note.slug).toBe('B1-文学虚构__示例笔记');
    expect(note.tags).toHaveLength(2);
    expect(JSON.stringify(note)).not.toContain('internal_token');
    expect(JSON.stringify(note)).not.toContain('不该出门');
    expect(note.audio).toBe(false);
    expect(note.content_hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('同名文件在不同子类不会撞 slug', () => {
    expect(slugFor('B1-文学虚构/同一个名字.md')).not.toBe(slugFor('B3-认知成长/同一个名字.md'));
  });
});

describe('朗读稿', () => {
  it('wikilink 只朗读显示名，代码块与图片不朗读', () => {
    const text = narrationText('# 标题\n正文 [[目标|显示名]] 与 [[裸链接]]。\n\n```\n静默代码\n```\n\n![[附件.png]]');
    expect(text).toContain('显示名');
    expect(text).toContain('裸链接');
    expect(text).not.toContain('静默代码');
    expect(text).not.toContain('附件.png');
    expect(text).not.toContain('# 标题');
  });

  it('分块不超上限，且不丢句子', () => {
    const text = Array.from({ length: 30 }, (_, i) => `第${i}句是一个完整的句子。`).join('');
    const chunks = splitForTts(text, 120);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(120);
    }
    expect(chunks.join('')).toContain('第29句是一个完整的句子。');
  });
});

describe('wav 拼接', () => {
  it('两段 24 kHz 单声道音频拼成一段，data 长度相加', () => {
    const a = wav([1, 2, 3, 4]);
    const b = wav([5, 6]);
    const joined = concatWav([a, b]);
    expect(joined.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(joined.readUInt32LE(40)).toBe(12);
    expect(joined.length).toBe(56);
    // 第一段是 4 个采样（8 字节），第二段从偏移 44 + 8 开始
    expect([...joined.subarray(52, 54)]).toEqual([5, 0]);
  });

  it('格式不一致直接红，不静默拼出半截音频', () => {
    const wrong = wav([1, 2]);
    wrong.writeUInt16LE(2, 22); // 改成双声道
    expect(() => concatWav([wav([1]), wrong])).toThrow(/格式不一致/);
  });

  it('音频文件名由内容哈希决定，同内容同名', () => {
    expect(audioName('abc')).toBe('abc.wav');
  });
});

describe('GitHub contents URL', () => {
  it('路径相对仓库根：笔记目录前缀必须在，中文必须编码', () => {
    const url = contentsUrl('zhubao315/obsidian-vault', '07-SOURCES/71-书籍', 'main', 'B1-文学虚构/∑ 示例.md');
    expect(url).toContain('/contents/07-SOURCES/71-%E4%B9%A6%E7%B1%8D/');
    expect(url).toContain('B1-%E6%96%87%E5%AD%A6%E8%99%9A%E6%9E%84');
    expect(url).toContain('?ref=main');
  });
});
