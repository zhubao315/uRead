/**
 * ASCII 稳定别名 → 公开笔记 slug。
 *
 * 中文 slug 在地址栏会显示为 percent-encoded 串（看起来像乱码），
 * 书稿站等外部站点改用这些别名链接。解析时先查真实 slug 映射，
 * 因此笔记内容更新（content_hash 变化）不会让别名失效。
 */
export const NOTE_ALIASES: Record<string, string> = {
  'book-knowledge-base-engineering': 'B5-科技科普__《知识库工程学》-朱宝',
  'book-investment-discipline': 'B6-投资理财__《投资的纪律》-朱宝',
  'book-ai-era-learning': 'B3-认知成长__《AI时代，如何真正学会》-朱宝',
  'book-one-in-a-thousand': 'B3-认知成长__《千分之一的你》-朱宝',
};
