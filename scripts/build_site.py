from __future__ import annotations

from pathlib import Path

from shared import PUBLIC_DIR, ensure_public_dirs, load_notes, markdown_to_html, site_shell, write_json


STYLES = """
:root {
  --bg: #f3efe4;
  --paper: rgba(255, 251, 245, 0.88);
  --ink: #1f1a17;
  --muted: #665e57;
  --accent: #b6542a;
  --border: rgba(31, 26, 23, 0.08);
  --shadow: 0 24px 60px rgba(69, 49, 30, 0.12);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  color: var(--ink);
  background: radial-gradient(circle at top, #f8f3e8 0%, #ebe1cf 42%, #dfd1bc 100%);
  font-family: "Georgia", "Noto Serif SC", serif;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code {
  background: rgba(31, 26, 23, 0.06);
  padding: 0.15rem 0.35rem;
  border-radius: 0.35rem;
}
.background {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at 15% 20%, rgba(182, 84, 42, 0.14), transparent 25%),
    radial-gradient(circle at 80% 10%, rgba(93, 125, 100, 0.14), transparent 22%);
  pointer-events: none;
}
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.5rem;
  backdrop-filter: blur(14px);
  background: rgba(243, 239, 228, 0.72);
  border-bottom: 1px solid var(--border);
}
.site-header nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.brand {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.container {
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
}
.hero, .card, .note {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 1.4rem;
  box-shadow: var(--shadow);
}
.hero { padding: 2rem; margin-bottom: 1.5rem; }
.hero h1 { font-size: clamp(2.2rem, 5vw, 4.5rem); line-height: 0.96; margin: 0 0 1rem; }
.hero p { font-size: 1.08rem; color: var(--muted); max-width: 52rem; }
.stats, .grid { display: grid; gap: 1rem; }
.stats { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top: 1.5rem; }
.grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.stat, .card { padding: 1.2rem; }
.eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.78rem; }
.muted { color: var(--muted); }
.card h3, .note h1 { margin-top: 0; }
.pill {
  display: inline-block;
  margin: 0.2rem 0.35rem 0 0;
  padding: 0.24rem 0.55rem;
  border-radius: 999px;
  background: rgba(182, 84, 42, 0.1);
  color: var(--accent);
  font-size: 0.84rem;
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0 1rem;
}
.note { padding: 2rem; max-width: 860px; }
.note-meta { color: var(--muted); margin-bottom: 1rem; }
.note h1, .note h2, .note h3 { line-height: 1.15; }
.note p, .note li { font-size: 1.02rem; line-height: 1.75; }
.note ul { padding-left: 1.25rem; }
.note blockquote {
  margin: 1rem 0;
  padding: 0.8rem 1rem;
  border-left: 4px solid var(--accent);
  background: rgba(182, 84, 42, 0.06);
}
.wikilink {
  color: var(--accent);
  border-bottom: 1px dashed rgba(182, 84, 42, 0.4);
}
@media (max-width: 720px) {
  .site-header { align-items: flex-start; flex-direction: column; }
  .hero, .note { padding: 1.2rem; }
}
"""


def main() -> None:
    ensure_public_dirs()
    notes = [note for note in load_notes() if note["type"] != "template"]
    books = [note for note in notes if note["type"] == "book"]
    cards = [note for note in notes if note["type"] == "concept"]

    (PUBLIC_DIR / "styles.css").write_text(STYLES, encoding="utf-8")
    write_json(PUBLIC_DIR / "api" / "books.json", build_books_payload(books))
    write_json(PUBLIC_DIR / "api" / "tags.json", build_tags_payload(notes))
    write_json(PUBLIC_DIR / "api" / "graph.json", build_graph_payload(notes))

    build_index(notes, books, cards)
    build_list_page("books", "深度笔记", books)
    build_list_page("cards", "知识卡片", cards)
    build_detail_pages("books", books)
    build_detail_pages("cards", cards)


def build_index(notes, books, cards) -> None:
    stats = [
        ("示例笔记", str(len(books))),
        ("知识卡片", str(len(cards))),
        ("标签数量", str(len(build_tags_payload(notes)))),
        ("可公开检索", str(sum(1 for note in notes if note["meta"].get("agents_public", False)))),
    ]
    stats_html = "\n".join(
        f'<div class="stat hero"><div class="eyebrow">{label}</div><h2>{value}</h2></div>'
        for label, value in stats
    )
    books_html = "\n".join(render_card(note, "/uRead/books") for note in books)
    cards_html = "\n".join(render_card(note, "/uRead/cards") for note in cards)

    body = f"""
<section class="hero">
  <div class="eyebrow">Open Reading OS</div>
  <h1>盘活经典书单资产，打造可发布、可变现、可被 Agent 检索的深度读书笔记产品。</h1>
  <p>uRead 用 GitHub 维护内容，用 GitHub Pages 发布站点，用结构化元数据和静态 API 提升可读性、复用性与机器可用性。</p>
</section>
<section class="stats">{stats_html}</section>
<section class="section-title"><h2>精选深度笔记</h2><a href="/uRead/books/">查看全部</a></section>
<section class="grid">{books_html}</section>
<section class="section-title"><h2>知识卡片</h2><a href="/uRead/cards/">查看全部</a></section>
<section class="grid">{cards_html}</section>
"""
    (PUBLIC_DIR / "index.html").write_text(site_shell("uRead", body, "结构化深度读书笔记与 Agent 友好知识资产"), encoding="utf-8")


def build_list_page(section: str, title: str, notes) -> None:
    cards_html = "\n".join(render_card(note, f"/uRead/{section}") for note in notes)
    body = f"""
<section class="hero">
  <div class="eyebrow">{section}</div>
  <h1>{title}</h1>
  <p>所有内容同时生成静态页面、JSON API 与 JSON-LD 元数据，便于读者阅读，也便于 Agent 检索。</p>
</section>
<section class="grid">{cards_html}</section>
"""
    target = PUBLIC_DIR / section / "index.html"
    target.write_text(site_shell(f"{title} | uRead", body, title), encoding="utf-8")


def build_detail_pages(section: str, notes) -> None:
    for note in notes:
        folder = PUBLIC_DIR / section / note["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        tags = note["meta"].get("tags", [])
        tags_html = "".join(f'<span class="pill">{tag}</span>' for tag in tags)
        meta = note["meta"]
        meta_html = f'{meta.get("author", "uRead")} / {meta.get("theme", note["section"])} / 评分 {meta.get("rating", "-")}'
        content_html = markdown_to_html(note["body"])
        body = f"""
<article class="note">
  <div class="eyebrow">{note["type"]}</div>
  <h1>{note["title"]}</h1>
  <div class="note-meta">{meta_html}</div>
  <p class="muted">{note["summary"]}</p>
  <div>{tags_html}</div>
  {content_html}
</article>
"""
        (folder / "index.html").write_text(site_shell(f'{note["title"]} | uRead', body, note["summary"]), encoding="utf-8")


def render_card(note, base_path: str) -> str:
    tags = "".join(f'<span class="pill">{tag}</span>' for tag in note["meta"].get("tags", [])[:3])
    return f"""
<article class="card">
  <div class="eyebrow">{note["meta"].get("theme", note["section"])}</div>
  <h3><a href="{base_path}/{note["slug"]}/">{note["title"]}</a></h3>
  <p class="muted">{note["summary"]}</p>
  <div>{tags}</div>
</article>
"""


def build_books_payload(books) -> list[dict]:
    return [
        {
            "title": note["title"],
            "author": note["meta"].get("author", ""),
            "slug": note["slug"],
            "summary": note["summary"],
            "tags": note["meta"].get("tags", []),
            "theme": note["meta"].get("theme", ""),
            "rating": note["meta"].get("rating", 0),
            "url": f'/uRead/books/{note["slug"]}/',
            "agentsPublic": note["meta"].get("agents_public", False),
        }
        for note in books
    ]


def build_tags_payload(notes) -> list[dict]:
    tags: dict[str, list[str]] = {}
    for note in notes:
        for tag in note["meta"].get("tags", []):
            tags.setdefault(tag, []).append(note["title"])
    return [{"tag": tag, "notes": sorted(values), "count": len(values)} for tag, values in sorted(tags.items())]


def build_graph_payload(notes) -> dict:
    nodes = [{"id": note["title"], "group": note["type"]} for note in notes]
    links = []
    titles = {note["title"] for note in notes}
    for note in notes:
        for link in note["links"]:
            if link in titles:
                links.append({"source": note["title"], "target": link})
    return {"nodes": nodes, "links": links}


if __name__ == "__main__":
    main()
