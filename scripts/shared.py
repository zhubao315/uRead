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
        if not line:
            close_blocks()
            continue

        if line.startswith("#"):
            close_blocks()
            level = len(line) - len(line.lstrip("#"))
            content = render_inline(line[level:].strip())
            html_lines.append(f"<h{level}>{content}</h{level}>")
            continue

        if line.startswith("- "):
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

        close_blocks()
        html_lines.append(f"<p>{render_inline(line)}</p>")

    close_blocks()
    return "\n".join(html_lines)


def render_inline(text: str) -> str:
    text = escape(text)
    text = re.sub(r"\[\[([^\]]+)\]\]", lambda m: f'<span class="wikilink">{escape(m.group(1))}</span>', text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return text


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def site_shell(title: str, body: str, description: str = "") -> str:
    description_meta = escape(description or title)
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{description_meta}">
  <link rel="stylesheet" href="/uRead/styles.css">
</head>
<body>
  <div class="background"></div>
  <header class="site-header">
    <a href="/uRead/" class="brand">uRead</a>
    <nav>
      <a href="/uRead/">首页</a>
      <a href="/uRead/books/">深度笔记</a>
      <a href="/uRead/cards/">知识卡片</a>
      <a href="/uRead/api/books.json">API</a>
    </nav>
  </header>
  <main class="container">
    {body}
  </main>
</body>
</html>
"""
