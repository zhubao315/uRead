/**
 * 四部自著书稿：uRead 笔记 slug → 主站落地页 / 在线阅读器。
 *
 * 用途：在公开读书笔记页给出反向入口，形成「主站书稿 ↔ uRead 阅读器 ↔ uRead 笔记」的双向引用。
 * 不修改发布策略、不触碰 publishing/approved-baseline.json、不新增公开内容。
 * 书稿状态以作者公开信息为准；无出版社、ISBN 或发行时间，不写「已出版」。
 */

export interface OwnBookLink {
  slug: string;
  title: string;
  direction: 'THINK' | 'CREATE';
  landingUrl: string;
  readerUrl: string;
}

const PORTFOLIO = 'https://zhubao315.github.io';
const READER = `${PORTFOLIO}/uRead/books/reader.html?id=`;

export const ownBooks: OwnBookLink[] = [
  {
    slug: 'B5-科技科普__《知识库工程学》-朱宝',
    title: '知识库工程学',
    direction: 'THINK',
    landingUrl: `${PORTFOLIO}/books/knowledge-base-engineering/`,
    readerUrl: `${READER}38036cf7bf29`,
  },
  {
    slug: 'B6-投资理财__《投资的纪律》-朱宝',
    title: '投资的纪律',
    direction: 'THINK',
    landingUrl: `${PORTFOLIO}/books/investment-discipline/`,
    readerUrl: `${READER}a2e2ed0dd1d8`,
  },
  {
    slug: 'B3-认知成长__《AI时代，如何真正学会》-朱宝',
    title: 'AI时代，如何真正学会',
    direction: 'THINK',
    landingUrl: `${PORTFOLIO}/books/ai-era-learning/`,
    readerUrl: `${READER}dd24f66b8e72`,
  },
  {
    slug: 'B3-认知成长__《千分之一的你》-朱宝',
    title: '千分之一的你',
    direction: 'CREATE',
    landingUrl: `${PORTFOLIO}/books/one-in-a-thousand/`,
    readerUrl: `${READER}df4c81f86b08`,
  },
];

export const ownBookBySlug: Record<string, OwnBookLink> = Object.fromEntries(
  ownBooks.map((book) => [book.slug, book]),
);
