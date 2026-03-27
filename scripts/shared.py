from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content"
PUBLIC_DIR = ROOT / "public"


def ensure_public_dirs() -> None:
    for path in [
        PUBLIC_DIR,
        PUBLIC_DIR / "books",
        PUBLIC_DIR / "cards",
        PUBLIC_DIR / "lists",
        PUBLIC_DIR / "api",
        PUBLIC_DIR / "jsonld",
        PUBLIC_DIR / "vectors",
    ]:
        path.mkdir(parents=True, exist_ok=True)


def slugify(text: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE).strip().lower()
    return re.sub(r"[-\s]+", "-", cleaned)


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---\n"):
        return {}, text
    parts = text.split("\n---\n", 1)
    if len(parts) != 2:
        return {}, text
    raw_meta, body = parts
    meta_lines = raw_meta.splitlines()[1:]
    meta: dict[str, Any] = {}
    current_key: str | None = None
    list_values: list[str] | None = None
    for line in meta_lines:
        if not line.strip():
            continue
        if line.startswith("  - ") and current_key and list_values is not None:
            list_values.append(line[4:].strip())
            continue
        if ": " in line:
            key, value = line.split(": ", 1)
        elif line.endswith(":"):
            key, value = line[:-1], ""
        else:
            continue
        current_key = key.strip()
        parsed = parse_scalar(value.strip())
        if parsed == []:
            list_values = []
            meta[current_key] = list_values
        else:
            list_values = None
            meta[current_key] = parsed
    return meta, body


def parse_scalar(value: str) -> Any:
    if value == "":
        return []
    stripped = value.strip('"').strip("'")
    if stripped.lower() == "true":
        return True
    if stripped.lower() == "false":
        return False
    if re.fullmatch(r"\d+", stripped):
        return int(stripped)
    if re.fullmatch(r"\d+\.\d+", stripped):
        return float(stripped)
    return stripped


def load_notes() -> list[dict[str, Any]]:
    notes: list[dict[str, Any]] = []
    for path in sorted(CONTENT_DIR.rglob("*.md")):
        raw = path.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(raw)
        title = str(meta.get("title") or path.stem)
        note_type = meta.get("type") or infer_type(path)
        note = {
            "title": title,
            "slug": slugify(title),
            "path": str(path.relative_to(ROOT)).replace("\\", "/"),
            "sourcePath": path,
            "section": infer_section(path),
            "type": note_type,
            "meta": meta,
            "summary": str(meta.get("summary", "")),
            "body": body.strip(),
            "links": extract_wiki_links(body),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        notes.append(note)
    return notes


def infer_type(path: Path) -> str:
    parts = path.parts
    if any("知识卡片" in part for part in parts):
        return "concept"
    if any("深度笔记" in part for part in parts):
        return "book"
    if "templates" in parts:
        return "template"
    return "page"


def infer_section(path: Path) -> str:
    return path.parent.name


def extract_wiki_links(body: str) -> list[str]:
    return re.findall(r"\[\[([^\]]+)\]\]", body)


def markdown_to_html(body: str) -> str:
    lines = body.splitlines()
    html_lines: list[str] = []
    in_list = False
    in_quote = False
    in_code = False

    def close_blocks() -> None:
        nonlocal in_list, in_quote
        if in_list:
            html_lines.append("</ul>")
            in_list = False
        if in_quote:
            html_lines.append("</blockquote>")
            in_quote = False

    for raw_line in lines:
        line = raw_line.rstrip()
        if line.startswith("```"):
            if in_code:
                html_lines.append("</code></pre>")
                in_code = False
            else:
                close_blocks()
                in_code = True
                lang = line[3:].strip()
                la = f' class="language-{lang}"' if lang else ""
                html_lines.append(f"<pre><code{la}>")
            continue
        if in_code:
            html_lines.append(escape(line))
            continue
        if not line:
            close_blocks()
            continue
        if line.startswith("#"):
            close_blocks()
            level = min(len(line) - len(line.lstrip("#")), 6)
            html_lines.append(
                f"<h{level}>{render_inline(line[level:].strip())}</h{level}>"
            )
            continue
        if line.startswith("- ") or line.startswith("* "):
            if in_quote:
                html_lines.append("</blockquote>")
                in_quote = False
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            html_lines.append(f"<li>{render_inline(line[2:].strip())}</li>")
            continue
        if line.startswith(">"):
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            if not in_quote:
                html_lines.append("<blockquote>")
                in_quote = True
            html_lines.append(f"<p>{render_inline(line[1:].strip())}</p>")
            continue
        if re.match(r"^[-*_]{3,}\s*$", line):
            close_blocks()
            html_lines.append("<hr>")
            continue
        close_blocks()
        html_lines.append(f"<p>{render_inline(line)}</p>")
    close_blocks()
    return "\n".join(html_lines)


def render_inline(text: str) -> str:
    text = escape(text)
    text = re.sub(
        r"\[\[([^\]]+)\]\]",
        lambda m: f'<span class="wl">{escape(m.group(1))}</span>',
        text,
    )
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(
        r"!\[([^\]]*)\]\(([^)]+)\)", r'<img src="\2" alt="\1" loading="lazy">', text
    )
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def site_shell(title: str, body: str, description: str = "") -> str:
    dm = escape(description or title)
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{dm}">
  <meta name="theme-color" content="#133D72">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=MiSans:wght@400;500;600;700&family=Lora:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/uRead/styles.css">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23FF6B35'/%3E%3Cstop offset='100%25' stop-color='%23FFB380'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='6' fill='%23133D72'/%3E%3Cpath d='M10 8h6c3.5 0 6 2.5 6 6 0 2-1 4-3 5l4 6h-5l-3-4.5h-3v4.5H10V8z' fill='url(%23g)'/%3E%3C/svg%3E">
</head>
<body>
  <nav class="nav" id="top">
    <a href="/uRead/" class="brand" aria-label="uRead 首页">
      <svg viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="120" height="32">
        <defs>
          <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF6B35"/>
            <stop offset="100%" stop-color="#FFB380"/>
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="6" fill="#133D72"/>
        <path d="M9 7h6.5c3 0 5.5 2 5.5 5.5 0 1.5-.8 3-2 4l3.5 5.5h-5.5l-2.5-4h-3v4H9V7z" fill="url(#lg)"/>
        <text x="38" y="15" font-family="MiSans,MiSans Web,sans-serif" font-size="14" font-weight="700" fill="white">uRead</text>
        <text x="38" y="26" font-family="MiSans,MiSans Web,sans-serif" font-size="7" fill="rgba(255,255,255,0.45)">Open Reading OS</text>
        <text x="98" y="15" font-family="MiSans,MiSans Web,sans-serif" font-size="7" fill="rgba(255,255,255,0.35)" font-style="italic">让知识可复用</text>
      </svg>
    </a>
    <button class="nav-burger" onclick="this.classList.toggle('on');document.querySelector('.nav-links').classList.toggle('open')" aria-label="菜单">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-links">
      <a href="/uRead/">首页</a>
      <a href="/uRead/books/">深度笔记</a>
      <a href="/uRead/lists/">精选书单</a>
      <a href="/uRead/cards/">知识卡片</a>
      <a href="#" class="nav-random" onclick="jumpRandom()" title="随机漫游">🎲 随机</a>
      <a href="/uRead/api/books.json" class="nav-api">API</a>
    </div>
    <script>
    async function jumpRandom() {{
      try {{
        const res = await fetch('/uRead/api/books.json');
        const data = await res.json();
        const books = data.filter(b => b.title);
        const rand = books[Math.floor(Math.random() * books.length)];
        if (rand && rand.url) window.location.href = rand.url;
      }} catch(e) {{ console.error(e); }}
    }}
    </script>
  </nav>
  <main class="main">{body}</main>
  <footer class="foot">
    <div class="foot-inner">
      <div class="foot-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
          <rect width="32" height="32" rx="8" fill="#133D72"/>
          <path d="M9 7h6.5c3 0 5.5 2 5.5 5.5 0 1.5-.8 3-2 4l3.5 5.5h-5.5l-2.5-4h-3v4H9V7z" fill="url(#lg)"/>
        </svg>
        <span>uRead</span>
      </div>
      <p class="foot-brand">让知识如同代码和资产一样可被机器解析、调用与变现</p>
      <p class="foot-links">
        <a href="https://github.com/zhubao315/uRead">GitHub</a>
        <span class="dot">·</span>
        <a href="/uRead/api/books.json">Books API</a>
        <span class="dot">·</span>
        <a href="/uRead/api/tags.json">Tags API</a>
        <span class="dot">·</span>
        <a href="/uRead/api/graph.json">Graph API</a>
      </p>
      <p class="foot-copy">© 2024 uRead · Made with ❤️ for Open Knowledge</p>
    </div>
  </footer>
</body>
</html>"""
