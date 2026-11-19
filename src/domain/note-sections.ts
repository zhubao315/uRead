/**
 * 笔记阅读排版：只按原文已有标题分组，**不改写、不合并、不删减任何正文**。
 * 分类只是展示标签，原文标题始终显示；匹配不到关键词就归入「其他」。
 */

export type SectionKind = 'excerpt' | 'understanding' | 'extension' | 'meta' | 'other' | 'intro';

export interface NoteSection {
  kind: SectionKind;
  heading: string;
  level: number;
  body: string;
}

const RULES: Array<{ kind: SectionKind; words: string[] }> = [
  { kind: 'excerpt', words: ['高亮划线', '关键摘录', '金句摘录', '原文摘录', '摘录', '划线', '金句', '引用', '原文'] },
  { kind: 'extension', words: ['相关笔记', '扩展阅读', '知识关联', '延伸', '拓展', '参考', '疑问', '待验证'] },
  { kind: 'meta', words: ['元数据', '标签', '出版信息', '来源信息'] },
  { kind: 'understanding', words: ['读书笔记', '本书评论', '深度分析', '核心观点', '主要内容', '大纲', '解读', '评论', '心得', '理解', '概述', '创作背景', '作者介绍'] },
];

export function classifyHeading(heading: string): SectionKind {
  const text = heading.replace(/[#*`\d.、\s]/g, '');
  for (const rule of RULES) {
    if (rule.words.some((word) => text.includes(word))) return rule.kind;
  }
  return 'other';
}

/** 按标题切段，保留空行与原始 Markdown；正文顺序不变。 */
export function splitNoteSections(body: string): NoteSection[] {
  const sections: NoteSection[] = [];
  let current: NoteSection = { kind: 'intro', heading: '', level: 0, body: '' };
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
    if (match) {
      if (current.body.trim() || current.heading) sections.push(current);
      const heading = match[2].replace(/[*`]/g, '').trim();
      current = { kind: classifyHeading(heading), heading, level: match[1].length, body: '' };
    } else {
      current.body += `${line}\n`;
    }
  }
  if (current.body.trim() || current.heading) sections.push(current);
  return sections;
}

export const SECTION_LABEL: Record<SectionKind, string> = {
  excerpt: '原文摘录',
  understanding: '个人理解',
  extension: '延伸思考',
  meta: '来源与元数据',
  other: '其他内容',
  intro: '',
};
