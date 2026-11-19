/**
 * 公开发布策略的纯判定函数。
 * 私人 IndexedDB / 私有 Obsidian 仓库 / 公开静态产物是三条独立数据边界；
 * 这里只决定「哪些内容可以进入公开产物」，不负责抓网络、不改文件。
 */

/** allowlist 模式下：默认拒绝；deny 永远优先；支持按 slug / 分类 / 标签授权。 */
export function isNoteAllowed(note, policy) {
  if (policy.mode === 'allow_all_legacy') return !isDenied(note, policy);
  if (policy.mode !== 'allowlist') throw new Error(`未知发布模式：${policy.mode}`);
  if (isDenied(note, policy)) return false;
  const bySlug = (policy.allow || []).includes(note.slug);
  const byCategory = (policy.category_allow || []).includes(note.category);
  return bySlug || byCategory;
}

function isDenied(note, policy) {
  if ((policy.deny || []).includes(note.slug)) return true;
  const tags = note.tags || [];
  return tags.some((tag) => (policy.tag_deny || []).includes(tag));
}

/** 只返回命中的规则名与位置，不把正文写进报告（报告可能被公开）。 */
export function scanSensitive(note, policy) {
  const hits = [];
  for (const rule of policy.sensitive_patterns || []) {
    const regex = new RegExp(rule.pattern, 'g');
    const hay = [note.title, note.body, JSON.stringify(note.tags || [])].join('\n');
    let match;
    while ((match = regex.exec(hay)) !== null) {
      hits.push({ rule: rule.name, slug: note.slug, offset: match.index });
      regex.lastIndex = match.index + match[0].length;
      if (hits.length >= 20) return hits;
    }
  }
  return hits;
}

export function evaluate(notes, policy) {
  const allowed = [];
  const blocked = [];
  const sensitive = [];
  for (const note of notes) {
    if (!isNoteAllowed(note, policy)) {
      blocked.push({ slug: note.slug, reason: '未授权' });
      continue;
    }
    const hits = scanSensitive(note, policy);
    if (hits.length) {
      sensitive.push(...hits);
      blocked.push({ slug: note.slug, reason: '敏感信息' });
      continue;
    }
    allowed.push(note.slug);
  }
  return { mode: policy.mode, total: notes.length, allowed, blocked, sensitive };
}

/** 音频必须跟随正文权限：正文被挡下的笔记，音频也不得留在公开产物里。 */
export function audioOrphans(audioFiles, allowedSlugs, hashToSlug) {
  return audioFiles
    .map((file) => ({ file, slug: hashToSlug[file] }))
    .filter((item) => !item.slug || !allowedSlugs.includes(item.slug))
    .map((item) => item.file);
}
