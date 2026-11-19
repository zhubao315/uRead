/** 相关阅读：只用真实分类/标签做规则关联，匹配不到就明说，不编造「可能喜欢」。 */

export interface RelatedCandidate {
  slug: string;
  title: string;
  category: string;
  tags: string[];
}

export interface RelatedNote extends RelatedCandidate {
  reason: string;
}

export function relatedNotes(current: RelatedCandidate, pool: RelatedCandidate[], limit = 5): RelatedNote[] {
  const mine = new Set((current.tags ?? []).map((tag) => tag.toLowerCase()));
  const scored = pool
    .filter((note) => note.slug !== current.slug)
    .map((note) => {
      const shared = (note.tags ?? []).filter((tag) => mine.has(tag.toLowerCase()));
      const sameCategory = !!current.category && note.category === current.category;
      return {
        ...note,
        reason: shared.length
          ? `共享标签：${shared.slice(0, 2).join('、')}`
          : sameCategory ? `同分类：${note.category}` : '',
        score: shared.length * 10 + (sameCategory ? 1 : 0),
      };
    })
    .filter((note) => note.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-Hans-CN'))
    .slice(0, limit);
  return scored.map(({ score: _score, ...note }) => note);
}
