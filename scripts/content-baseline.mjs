/** 迁移前后对账：只比较计数与哈希，不读正文，不改任何文件。 */
export function compareBaseline(current, baseline) {
  const problems = [];
  for (const [key, value] of Object.entries(baseline.counts)) {
    if (current.counts[key] !== value) {
      problems.push(`数量 ${key}: 基线 ${value} → 当前 ${current.counts[key]}`);
    }
  }
  for (const key of ['notes', 'lists', 'audio']) {
    const before = baseline.hashes[key] ?? [];
    const after = current.hashes[key] ?? [];
    const idOf = (item) => item.id ?? item.file;
    const beforeMap = new Map(before.map((item) => [idOf(item), item.hash]));
    const afterMap = new Map(after.map((item) => [idOf(item), item.hash]));
    for (const [id, hash] of beforeMap) {
      if (!afterMap.has(id)) problems.push(`缺失 ${key}: ${id}`);
      else if (afterMap.get(id) !== hash) problems.push(`内容变更 ${key}: ${id}`);
    }
    for (const id of afterMap.keys()) {
      if (!beforeMap.has(id)) problems.push(`新增 ${key}: ${id}（须重新确认基线）`);
    }
  }
  return problems;
}
