/**
 * 正文 → 展示用纯文本：只用于摘要 / meta / RSS，绝不回写 Obsidian 原文。
 * Obsidian 的 ![[图片]] 不应把文件名漏进摘要，普通 [[wikilink]] 只保留显示名。
 */
export function excerptFromBody(body, max = 160) {
  return String(body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[\[[^\]\n]+\]\]/g, ' ')
    .replace(/\[\[([^\]\n]+)\]\]/g, (_, target) => String(target).split('|').pop()?.trim() ?? '')
    .replace(/!?\[([^\]]*)\]\(([^)]*)\)/g, (_, label) => label || '')
    .replace(/^\s*[#>\s*+-]+/gm, '')
    .replace(/[*`~_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
