#!/usr/bin/env python3
"""扫描本机合法 EPUB/PDF → 产出可部署到 GitHub Pages 子路径的静态书库。

设计边界（不要越过）：
  * 只扫描 `book-library/books/` 里的文件，**不下载任何书**、不联网。
  * 只做静态产物：目录 JSON + 阅读页 + 书文件副本。没有服务端、没有账号、没有密钥。
  * 版权由放书的人负责：README 里写明「只放你有权公开分发的书」。
  * 大文件硬线：GitHub 单文件 >100 MiB 直接拦截、>50 MiB 告警；超线拒绝生成并点名文件。

产物：uRead/dist/books/{library.html,reader.html,catalog.json,books/*,vendor/foliate-js/*}
注意：index.html 由 scripts/build-books-index.mjs 生成，避免覆盖。
"""

from __future__ import annotations

import hashlib
import html
import json
import pathlib
import re
import shutil
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parent
BOOKS_IN = ROOT / "books"
VENDOR_IN = ROOT / "vendor" / "foliate-js"
DIST = REPO / "dist" / "books"
WARN_MIB = 50
HARD_MIB = 100

EPUB_TITLE = re.compile(r"<dc:title[^>]*>(.*?)</dc:title>", re.S | re.I)
EPUB_AUTHOR = re.compile(r"<dc:creator[^>]*>(.*?)</dc:creator>", re.S | re.I)
EPUB_LANG = re.compile(r"<dc:language[^>]*>(.*?)</dc:language>", re.S | re.I)
PDF_NAME = re.compile(r"《([^》]+)》\s*[-—_]?\s*(.*)")
PDF_PAGE = re.compile(rb"/Type\s*/Page[^s]")


def plain(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value)).strip()


def epub_meta(path: pathlib.Path) -> dict:
    cover = None
    with zipfile.ZipFile(path) as archive:
        container = archive.read("META-INF/container.xml").decode("utf-8", "replace")
        opf = re.search(r'full-path="([^"]+)"', container)
        if not opf:
            raise ValueError("META-INF/container.xml 里找不到 OPF 路径")
        manifest = archive.read(opf.group(1)).decode("utf-8", "replace")
        cover_id = re.search(r'<meta[^>]+name=["\']cover["\'][^>]+content=["\']([^"\']+)', manifest, re.I)
        cover_href = None
        if cover_id:
            item = re.search(r'<item[^>]+id=["\']' + re.escape(cover_id.group(1)) + r'["\'][^>]+href=["\']([^"\']+)', manifest, re.I)
            cover_href = item.group(1) if item else None
        if not cover_href:
            item = re.search(r'<item[^>]+href=["\']([^"\']+)["\'][^>]+properties=["\'][^"\']*cover-image', manifest, re.I)
            cover_href = item.group(1) if item else None
        if cover_href:
            base = pathlib.posixpath.dirname(opf.group(1))
            name = pathlib.posixpath.normpath(pathlib.posixpath.join(base, cover_href))
            try:
                data = archive.read(name)
                ext = pathlib.Path(name).suffix.lower() or '.jpg'
                if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
                    ext = '.jpg'
                cover = (data, ext)
            except KeyError:
                cover = None
    pick = lambda rx: plain(rx.search(manifest).group(1)) if rx.search(manifest) else ""
    return {
        "title": pick(EPUB_TITLE) or path.stem,
        "author": pick(EPUB_AUTHOR),
        "language": pick(EPUB_LANG),
        "pages": None,
        "cover": cover,
    }


def pdf_meta(path: pathlib.Path) -> dict:
    # 58 MB 的书不整本训进内存：只看前 2 MB 找嵌入元数据，页数用流式计数。
    head = path.open("rb").read(2_000_000)
    title = author = ""
    for key in (b"/Title", b"/Author"):
        match = re.search(re.escape(key) + rb"\s*\(([^)]{0,200})\)", head)
        if match:
            value = match.group(1).decode("utf-8", "replace").strip()
            if key == b"/Title":
                title = value
            else:
                author = value
    if not title:
        named = PDF_NAME.match(path.stem)
        title = f"《{named.group(1)}》" if named else path.stem
        author = author or (named.group(2).strip() if named and named.group(2) else "")
    pages = 0
    with path.open("rb") as handle:
        while chunk := handle.read(8 << 20):
            pages += len(PDF_PAGE.findall(chunk))
    return {"title": title, "author": author, "language": "", "pages": pages or None}


def related_notes(title: str, author: str, notes: list[dict]) -> list[dict]:
    """按书名/作者找出相关公开笔记；匹配不到就留空，不编造关联。"""
    def norm(value: str) -> str:
        return re.sub(r"[^\w\u4e00-\u9fff]", "", value).lower()
    wanted = norm(title)
    hits = []
    for note in notes:
        hay = norm(note.get("title", "")) + norm(note.get("author", ""))
        if wanted and (wanted in hay or hay in wanted) or (author and norm(author) in hay):
            hits.append({"slug": note["slug"], "title": note["title"]})
        if len(hits) >= 5:
            break
    return hits


def scan() -> list[dict]:
    if not BOOKS_IN.exists():
        return []
    notes_path = REPO / "public" / "notes" / "notes.json"
    notes = json.loads(notes_path.read_text(encoding="utf-8")) if notes_path.exists() else []
    records = []
    for path in sorted(BOOKS_IN.iterdir()):
        if not path.is_file() or path.suffix.lower() not in (".epub", ".pdf"):
            continue
        size = path.stat().st_size
        mib = size / 1024 / 1024
        if mib > HARD_MIB:
            raise SystemExit(f"拒绝生成：{path.name} 有 {mib:.1f} MiB，超过 GitHub 单文件 {HARD_MIB} MiB 硬线")
        if mib > WARN_MIB:
            print(f"  警告：{path.name} 有 {mib:.1f} MiB，GitHub 会告警；建议压缩或改用 Release 外链")
        fmt = path.suffix.lower()[1:]
        meta = epub_meta(path) if fmt == "epub" else pdf_meta(path)
        book_id = hashlib.sha256(path.name.encode()).hexdigest()[:12]
        if meta.get("cover"):
            cover_dir = ROOT / "covers"
            cover_dir.mkdir(exist_ok=True)
            (cover_dir / f"{book_id}{meta['cover'][1]}").write_bytes(meta["cover"][0])
        records.append({
            "id": book_id,
            "title": meta["title"],
            "author": meta["author"],
            "language": meta["language"],
            "format": fmt,
            "size_bytes": size,
            "pages_estimate": meta["pages"],
            "path": f"books/{book_id}.{fmt}",
            "source_filename": path.name,
            "cover": f"covers/{book_id}{meta['cover'][1]}" if meta.get("cover") else "",
            "related_notes": related_notes(meta["title"], meta["author"], notes),
            "rights": "由放书人声明合法持有并有权公开分发；本站不承担版权责任",
        })
        print(f"  收录：{meta['title'][:36]}｜{fmt}｜{mib:.1f} MiB")
    return records


def write_outputs(records: list[dict]) -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "books").mkdir(parents=True)
    (DIST / "vendor").mkdir(parents=True)
    if (ROOT / "covers").exists():
        shutil.copytree(ROOT / "covers", DIST / "covers", dirs_exist_ok=True)
    for record in records:
        shutil.copy2(BOOKS_IN / record["source_filename"], DIST / record["path"])
    if VENDOR_IN.exists():
        shutil.copytree(VENDOR_IN, DIST / "vendor" / "foliate-js",
                        ignore=shutil.ignore_patterns("tests", "*.md", "*.json", "rollup*", "eslint*"))
    else:
        raise SystemExit("缺少 foliate-js vendor；先在 book-library/ 里执行 npm install")

    payload = json.dumps(records, ensure_ascii=False, indent=2)
    (DIST / "catalog.json").write_text(payload, encoding="utf-8")
    version = hashlib.sha256(payload.encode()).hexdigest()[:16]
    (DIST / "manifest.json").write_text(
        json.dumps({"version": version, "count": len(records)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    rows = "\n".join(
        '<li>{cover}<a href="reader.html?id={id}">{title}</a><span>{author} · {fmt} · {mib:.1f} MiB{pages}</span>'
        '<a class="download" href="{path}" download>下载原文</a>{related}</li>'.format(
            id=html.escape(r["id"]),
            title=html.escape(r["title"]),
            author=html.escape(r["author"] or "作者未标注"),
            fmt=r["format"].upper(),
            mib=r["size_bytes"] / 1024 / 1024,
            pages=f" · 约 {r['pages_estimate']} 页（估算）" if r["pages_estimate"] else "",
            path=html.escape(r["path"]),
            cover=(f'<img class="cover" src="{html.escape(r["cover"])}" alt="">'
                   if r.get("cover") else ""),
            related=("　相关笔记：" + "、".join(
                f'<a href="/uRead/read/{html.escape(n["slug"])}">{html.escape(n["title"])}</a>'
                for n in r.get("related_notes", []))) if r.get("related_notes") else "",
        )
        for r in records
    ) or "<li>书库还没有书。</li>"
    (DIST / "library.html").write_text(INDEX_HTML.format(rows=rows, count=len(records)), encoding="utf-8")
    shutil.copy2(ROOT / "reader.html", DIST / "reader.html")
    assert 'id="book-search"' in (DIST / "library.html").read_text(encoding="utf-8"), "书库搜索框没进产物"
    print(f"书库已生成：{len(records)} 本，版本 {version}，产物 {DIST}")


INDEX_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>电子书库 · uRead</title>
<style>
body{{font-family:system-ui,-apple-system,"PingFang SC",sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;color:#1f2937}}
h1{{font-size:1.8rem}} ul{{list-style:none;padding:0}} li{{border:1px solid #e5e7eb;border-radius:12px;padding:1rem;margin:.75rem 0}}
a{{color:#1d4ed8;text-decoration:none}} a:hover{{text-decoration:underline}}
li span{{display:block;color:#6b7280;font-size:.9rem;margin:.35rem 0}}
.cover{{float:left;width:72px;height:100px;object-fit:cover;margin:0 1rem 1rem 0;border-radius:6px}}
li:after{{content:"";display:block;clear:both}}
.download{{font-size:.85rem}} footer{{margin-top:2rem;color:#6b7280;font-size:.8rem}}
input[type=search]{{width:100%;max-width:24rem;padding:.55rem .8rem;border:1px solid #d1d5db;border-radius:.5rem;font:inherit;margin:.5rem 0 1rem}}
.sr-only{{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}
@media(max-width:640px){{h1{{font-size:1.5rem}} li{{padding:.8rem}}}}
</style>
</head>
<body>
<h1>可在线阅读的电子书</h1>
<p>共 {count} 本。点击书名在线阅读；EPUB 在浏览器里排版，PDF 用浏览器自带阅读器。</p>
<label for="book-search" class="sr-only">搜索书名或作者</label>
<input id="book-search" type="search" placeholder="搜索书名或作者" aria-label="搜索书名或作者" autocomplete="off">
<ul id="book-list">{rows}</ul>
<script>
  const q = document.getElementById('book-search');
  q.value = new URLSearchParams(location.search).get('q') || '';
  q.dispatchEvent(new Event('input'));
  q.addEventListener('input', () => {{
    const word = q.value.trim().toLowerCase();
    for (const li of document.querySelectorAll('#book-list li')) {{
      li.hidden = !!word && !li.textContent.toLowerCase().includes(word);
    }}
  }});
</script>
<footer>只收录放书人声明有权公开分发的书。GitHub 对单文件 >50 MiB 会告警、>100 MiB 直接拦截。</footer>
</body>
</html>
"""


def budget_check() -> None:
    """ Pages 仓库预算：公开产物（笔记音频 + 书）不超过 300 MiB。 """
    total = 0
    for folder in (REPO / "public" / "audio", BOOKS_IN):
        if folder.exists():
            total += sum(p.stat().st_size for p in folder.iterdir() if p.is_file())
    mib = total / 1024 / 1024
    print(f"  体积预算：{mib:.1f} MiB / 300 MiB")
    if mib > 300:
        raise SystemExit("体积超预算：请先压缩音频或把大书改放到 GitHub Release 再外链")


def main() -> int:
    print("扫描书库：")
    budget_check()
    records = scan()
    write_outputs(records)
    return 0


if __name__ == "__main__":
    sys.exit(main())
