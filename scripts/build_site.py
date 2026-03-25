from __future__ import annotations

from pathlib import Path

from shared import (
    PUBLIC_DIR,
    ensure_public_dirs,
    load_notes,
    markdown_to_html,
    site_shell,
    write_json,
)


# ── 9 大分类定义 ──────────────────────────────────────────────
CATEGORIES = [
    {
        "id": "01",
        "name": "文学虚构类",
        "emoji": "📖",
        "desc": "审美体验、情感共鸣、人性探索",
        "keywords": ["文学与审美"],
    },
    {
        "id": "02",
        "name": "实用技能类",
        "emoji": "🛠",
        "desc": "创业技能、时间管理、效率提升",
        "keywords": ["创业与增长", "组织与管理"],
    },
    {
        "id": "03",
        "name": "认知成长类",
        "emoji": "🧠",
        "desc": "心理认知、学习成长、思维升级",
        "keywords": ["学习方法", "心理与认知"],
    },
    {
        "id": "04",
        "name": "历史社科类",
        "emoji": "🏛",
        "desc": "历史洞察、社会规律、人文思辨",
        "keywords": ["文明与历史", "系统思考"],
    },
    {
        "id": "05",
        "name": "科技科普类",
        "emoji": "🔬",
        "desc": "技术前沿、科普知识、创新思维",
        "keywords": ["技术前沿"],
    },
    {
        "id": "06",
        "name": "投资理财类",
        "emoji": "💰",
        "desc": "财富观念、价值投资、金融智慧",
        "keywords": ["价值投资", "长期主义"],
    },
    {
        "id": "07",
        "name": "传记人物类",
        "emoji": "👤",
        "desc": "人物传记、榜样力量、人生智慧",
        "keywords": ["人物传记"],
    },
    {
        "id": "08",
        "name": "艺术美学类",
        "emoji": "🎨",
        "desc": "艺术修养、美学理论、审美品味",
        "keywords": ["文学与审美"],
    },
    {
        "id": "09",
        "name": "哲学宗教类",
        "emoji": "🕉",
        "desc": "哲学思辨、精神追求、智慧启蒙",
        "keywords": ["哲学修养"],
    },
]

CATEGORY_MAP = {c["name"]: c for c in CATEGORIES}

# ── 精选书单数据 ─────────────────────────────────────────────
CURATED_LISTS = [
    {
        "slug": "rushidao",
        "title": "儒释道经典",
        "summary": "儒家、佛家、道家核心经典全景导读，覆盖四书五经、大乘佛典与道藏精华",
        "sections": [
            {
                "name": "一、儒家经典",
                "books": [
                    (
                        "《大学》",
                        "儒家“四书”之首，系统阐释了“格物致知、诚意正心、修身齐家治国平天下”的儒家成德进阶路径。",
                    ),
                    (
                        "《中庸》",
                        "以“中庸”为核心道德准则，阐释了不偏不倚、过犹不及的处世智慧，以及天人合一的终极理念。",
                    ),
                    (
                        "《论语》",
                        "儒家思想奠基之作，记录孔子及其弟子言行，集中体现伦理思想、教育原则与政治主张。",
                    ),
                    (
                        "《孟子》",
                        "提出“性善论”“仁政”“民贵君轻”等核心主张，完善了儒家政治与伦理体系。",
                    ),
                    (
                        "《诗经》",
                        "中国现存最早的诗歌总集，收录西周至春秋 305 篇诗歌，承载儒家礼乐教化理念。",
                    ),
                    (
                        "《尚书》",
                        "中国现存最早的历史文献汇编，记录上古至商周的重要历史事件与政治思想。",
                    ),
                    (
                        "《礼记》",
                        "系统记录先秦礼仪制度与伦理规范，《大学》《中庸》原篇均出自此书。",
                    ),
                    (
                        "《周易》",
                        "儒家“五经”之首，以卦爻符号阐释宇宙变化规律与阴阳相生哲学。",
                    ),
                    (
                        "《春秋》",
                        "中国现存最早编年体史书，相传孔子修订，以微言大义记录春秋历史。",
                    ),
                    (
                        "《孝经》",
                        "系统阐释“孝”的伦理内涵与社会价值，是中国传统孝道文化的奠基之作。",
                    ),
                    (
                        "《传习录》",
                        "明代王阳明语录与书信集，集中体现“心即理”“知行合一”“致良知”的心学核心思想。",
                    ),
                    (
                        "《荀子》",
                        "提出“性恶论”“礼法并重”“天行有常”等思想，融合儒法理念发展儒家治国与修身学说。",
                    ),
                ],
            },
            {
                "name": "二、释家（佛家）经典",
                "books": [
                    (
                        "《心经》",
                        "260 字浓缩“诸法空相”的般若空性核心思想，汉传佛教流传最广的般若经典。",
                    ),
                    (
                        "《金刚经》",
                        "阐释“凡所有相，皆是虚妄”的空性智慧，汉传佛教最具影响力的经典之一。",
                    ),
                    (
                        "《法华经》",
                        "以“开权显实、会三归一”为核心，阐释“一切众生皆可成佛”，天台宗根本经典。",
                    ),
                    (
                        "《华严经》",
                        "系统阐释“法界缘起、事事无碍”的核心思想，被誉为“经中之王”。",
                    ),
                    (
                        "《六祖坛经》",
                        "唯一由中国僧人创作被尊为“经”的典籍，阐释“明心见性、顿悟成佛”的禅宗核心思想。",
                    ),
                    (
                        "《维摩诘经》",
                        "以在家居士维摩诘示疾说法为核心，阐释“不二法门”的般若思想。",
                    ),
                    (
                        "《佛说阿弥陀经》",
                        "详细介绍西方极乐世界与持名念佛往生净土的修行法门。",
                    ),
                    (
                        "《菩提道次第广论》",
                        "系统梳理从凡夫到成佛的完整修行路径，藏传佛教修学核心纲领。",
                    ),
                    (
                        "《瑜伽师地论》",
                        "全面阐释十七种修行境界与唯识思想，佛教修行的百科全书式典籍。",
                    ),
                ],
            },
            {
                "name": "三、道家 / 道教经典",
                "books": [
                    (
                        "《道德经》",
                        "道家奠基之作，以“道”为核心阐释“道法自然”“无为而治”，中国流传最广的哲学经典之一。",
                    ),
                    (
                        "《庄子》",
                        "以汪洋恣肆的寓言阐释“逍遥游”“齐物论”，追求精神绝对自由，哲学与文学的巅峰之作。",
                    ),
                    (
                        "《列子》",
                        "以寓言故事阐释道家“贵虚”“顺应自然”思想，《愚公移山》《杞人忧天》均出自此书。",
                    ),
                    (
                        "《周易参同契》",
                        "被誉为“万古丹经王”，以《周易》卦象阐释内外丹修炼原理与方法。",
                    ),
                    (
                        "《黄庭经》",
                        "以七言韵文阐释道教存思修炼法门，提出“三丹田”“脏腑诸神”理念。",
                    ),
                    (
                        "《悟真篇》",
                        "以诗词形式系统阐释内丹修炼次第与方法，与《周易参同契》并称“丹经双璧”。",
                    ),
                    (
                        "《阴符经》",
                        "篇幅简短却意蕴深厚，融合道家宇宙观、兵家谋略与道教修炼思想。",
                    ),
                    (
                        "《抱朴子》",
                        "内篇为道教丹鼎派核心经典，系统阐释炼丹养生与神仙方术。",
                    ),
                    (
                        "《云笈七签》",
                        "被誉为“小道藏”，系统摘录道藏核心内容，是了解道教文化的百科全书。",
                    ),
                ],
            },
        ],
    },
]

# ── CSS 样式 ─────────────────────────────────────────────────
STYLES = """
:root {
  --bg: #faf8f3;
  --bg-warm: #f5f0e8;
  --paper: #ffffff;
  --paper-hover: #fffdf8;
  --ink: #1a1a1a;
  --ink-light: #555;
  --muted: #8a8a8a;
  --accent: #c0553a;
  --accent-light: rgba(192,85,58,0.08);
  --accent-bg: rgba(192,85,58,0.05);
  --border: #e8e2d8;
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.06);
  --shadow-lg: 0 16px 48px rgba(0,0,0,0.08);
  --radius: 12px;
  --radius-lg: 20px;
  --nav-h: 60px;
  --max-w: 1140px;
  --transition: 0.2s ease;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; scroll-padding-top: calc(var(--nav-h) + 24px); }

body {
  color: var(--ink);
  background: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
               "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 15px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); text-decoration: none; transition: color var(--transition); }
a:hover { color: #a04030; }

code {
  background: #f0ece4;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.88em;
}

/* ── NAV ──────────────────────────────────────────────────── */
.nav {
  position: sticky; top: 0; z-index: 100;
  height: var(--nav-h);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(1rem, 3vw, 2rem);
  background: rgba(250,248,243,0.88);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  border-bottom: 1px solid var(--border);
}
.nav-brand {
  font-size: 1.25rem; font-weight: 700; color: var(--ink);
  letter-spacing: 0.03em;
}
.nav-brand:hover { color: var(--ink); }
.nav-links { display: flex; gap: 0.15rem; }
.nav-links a {
  padding: 0.35rem 0.75rem; border-radius: 8px;
  color: var(--ink-light); font-size: 0.88rem; font-weight: 500;
  transition: all var(--transition);
}
.nav-links a:hover { background: var(--accent-light); color: var(--accent); }
.nav-links a.active { background: var(--accent-light); color: var(--accent); }

/* hamburger */
.nav-toggle { display: none; background: none; border: none; cursor: pointer; padding: 0.5rem; }
.nav-toggle span {
  display: block; width: 20px; height: 2px; background: var(--ink);
  margin: 5px 0; border-radius: 2px; transition: all 0.3s;
}
.nav-toggle.open span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
.nav-toggle.open span:nth-child(2) { opacity: 0; }
.nav-toggle.open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

/* ── CONTAINER ────────────────────────────────────────────── */
.container { width: min(var(--max-w), calc(100% - 2rem)); margin: 0 auto; padding: 2rem 0 4rem; }

/* ── HERO ─────────────────────────────────────────────────── */
.hero {
  background: var(--paper); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
  padding: clamp(2rem, 5vw, 3.5rem); margin-bottom: 2rem;
}
.hero h1 { font-size: clamp(1.8rem, 4vw, 2.8rem); line-height: 1.2; margin-bottom: 0.75rem; }
.hero p { color: var(--ink-light); font-size: 1.05rem; max-width: 640px; }
.hero-eyebrow {
  display: inline-block; color: var(--accent);
  font-size: 0.75rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.14em;
  margin-bottom: 0.75rem;
}

/* ── STATS ────────────────────────────────────────────────── */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem; margin-bottom: 2rem;
}
.stat {
  background: var(--paper); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.2rem;
  text-align: center; box-shadow: var(--shadow-sm);
}
.stat-num { font-size: 1.75rem; font-weight: 700; color: var(--accent); line-height: 1; }
.stat-label { font-size: 0.78rem; color: var(--muted); margin-top: 0.3rem; }

/* ── SECTION HEADER ───────────────────────────────────────── */
.section-header {
  display: flex; justify-content: space-between; align-items: center;
  gap: 1rem; margin: 2.5rem 0 1rem; flex-wrap: wrap;
}
.section-header h2 { font-size: 1.35rem; font-weight: 700; }
.section-header h2 .emoji { margin-right: 0.4rem; }
.view-all {
  font-size: 0.82rem; font-weight: 600; color: var(--accent);
  display: flex; align-items: center; gap: 0.25rem;
}
.view-all::after { content: "→"; transition: transform var(--transition); }
.view-all:hover::after { transform: translateX(3px); }

/* ── CATEGORY NAV ─────────────────────────────────────────── */
.cat-nav {
  display: flex; flex-wrap: wrap; gap: 0.4rem;
  margin-bottom: 1.5rem; padding: 0.5rem 0;
}
.cat-nav a {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.3rem 0.65rem; border-radius: 999px;
  background: var(--paper); border: 1px solid var(--border);
  font-size: 0.8rem; font-weight: 500; color: var(--ink-light);
  transition: all var(--transition); white-space: nowrap;
}
.cat-nav a .emoji { font-size: 0.85rem; }
.cat-nav a:hover { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.cat-nav a.active { background: var(--accent); border-color: var(--accent); color: #fff; }

/* ── CARD ─────────────────────────────────────────────────── */
.card {
  background: var(--paper); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow-sm);
  padding: 1.25rem; transition: all var(--transition);
  display: flex; flex-direction: column;
}
.card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); border-color: transparent; }
.card-eyebrow {
  color: var(--accent); font-size: 0.72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;
}
.card h3 { font-size: 1.05rem; margin-bottom: 0.4rem; line-height: 1.35; }
.card h3 a { color: var(--ink); }
.card h3 a:hover { color: var(--accent); }
.card p { color: var(--muted); font-size: 0.85rem; line-height: 1.6; flex: 1; }
.card-author { color: var(--muted); font-size: 0.78rem; margin-top: 0.5rem; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

/* ── PILL ─────────────────────────────────────────────────── */
.pill {
  display: inline-block; margin: 0.15rem 0.3rem 0.15rem 0;
  padding: 0.2rem 0.5rem; border-radius: 999px;
  background: var(--accent-light); color: var(--accent);
  font-size: 0.78rem; font-weight: 500;
}

/* ── CATEGORY SECTION ─────────────────────────────────────── */
.cat-section { margin-bottom: 2.5rem; }
.cat-title {
  font-size: 1.15rem; font-weight: 700; padding-bottom: 0.6rem;
  margin-bottom: 1rem; border-bottom: 2px solid var(--border);
  display: flex; align-items: center; gap: 0.5rem;
}
.cat-title .emoji { font-size: 1.2rem; }
.cat-title .count {
  font-size: 0.75rem; font-weight: 500; color: var(--muted);
  background: var(--bg-warm); padding: 0.15rem 0.5rem; border-radius: 999px;
}

/* ── NOTE (DETAIL) ────────────────────────────────────────── */
.note {
  background: var(--paper); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
  padding: clamp(1.5rem, 4vw, 2.5rem); max-width: 860px;
}
.note h1 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.25; margin-bottom: 0.5rem; }
.note h2 { font-size: 1.3rem; margin-top: 2rem; margin-bottom: 0.75rem; }
.note h3 { font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
.note-meta { color: var(--muted); font-size: 0.85rem; margin-bottom: 1rem; }
.note p, .note li { font-size: 1rem; line-height: 1.85; }
.note ul { padding-left: 1.25rem; margin: 0.5rem 0; }
.note blockquote {
  margin: 1rem 0; padding: 0.8rem 1rem;
  border-left: 4px solid var(--accent);
  background: var(--accent-bg); border-radius: 0 8px 8px 0;
}
.note .tag-row { margin: 0.75rem 0 1.5rem; }
.wikilink { color: var(--accent); border-bottom: 1px dashed rgba(192,85,58,0.4); }

/* ── BOOK LIST (CURATED) ──────────────────────────────────── */
.list-section { margin-bottom: 2rem; }
.list-section-title {
  font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 0.75rem;
  padding-bottom: 0.4rem; border-bottom: 1px solid var(--border);
}
.list-item {
  display: flex; gap: 0.75rem; padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.92rem; line-height: 1.65;
}
.list-item:last-child { border-bottom: none; }
.list-num {
  flex-shrink: 0; width: 1.8rem; text-align: right;
  color: var(--muted); font-weight: 600; font-size: 0.82rem;
  padding-top: 0.15rem;
}
.list-book-title { font-weight: 600; color: var(--ink); }
.list-desc { color: var(--ink-light); }
.list-card {
  background: var(--paper); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
  padding: clamp(1.25rem, 3vw, 2rem); margin-bottom: 1.5rem;
  transition: all var(--transition);
}
.list-card:hover { box-shadow: var(--shadow-md); }
.list-card h3 { font-size: 1.1rem; margin-bottom: 0.3rem; }
.list-card h3 a { color: var(--ink); }
.list-card h3 a:hover { color: var(--accent); }
.list-card p { color: var(--muted); font-size: 0.85rem; }
.list-card-meta { display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.78rem; color: var(--muted); }

/* ── PREVIEW GRID (homepage cards) ────────────────────────── */
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}

/* ── FOOTER ───────────────────────────────────────────────── */
.footer {
  text-align: center; padding: 2rem;
  color: var(--muted); font-size: 0.82rem;
  border-top: 1px solid var(--border); margin-top: 2rem;
}
.footer a { color: var(--accent); }

/* ── RESPONSIVE ───────────────────────────────────────────── */
@media (max-width: 768px) {
  .nav-links {
    display: none; position: absolute;
    top: var(--nav-h); left: 0; right: 0;
    flex-direction: column; gap: 0;
    background: rgba(250,248,243,0.97);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-md);
    padding: 0.5rem 0;
  }
  .nav-links.open { display: flex; }
  .nav-links a { padding: 0.65rem 1.5rem; border-radius: 0; }
  .nav-links a:hover { background: var(--accent-light); }
  .nav-toggle { display: block; }

  .grid { grid-template-columns: 1fr; }
  .preview-grid { grid-template-columns: 1fr; }
  .stats { grid-template-columns: repeat(2, 1fr); }

  .hero h1 { font-size: 1.6rem; }

  .cat-nav { gap: 0.3rem; }
  .cat-nav a { font-size: 0.75rem; padding: 0.25rem 0.5rem; }
}

@media (max-width: 480px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .hero { padding: 1.25rem; }
  .note { padding: 1.25rem; }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
  .preview-grid { grid-template-columns: repeat(2, 1fr); }
}
"""


# ═══════════════════════════════════════════════════════════════
#  BUILD
# ═══════════════════════════════════════════════════════════════


def main() -> None:
    ensure_public_dirs()
    notes = [n for n in load_notes() if n["type"] != "template"]
    books = [n for n in notes if n["type"] == "book"]
    cards = [n for n in notes if n["type"] == "concept"]

    # static assets
    (PUBLIC_DIR / "styles.css").write_text(STYLES, encoding="utf-8")

    # JSON API
    write_json(PUBLIC_DIR / "api" / "books.json", _books_api(books))
    write_json(PUBLIC_DIR / "api" / "tags.json", _tags_api(notes))
    write_json(PUBLIC_DIR / "api" / "graph.json", _graph_api(notes))

    # pages
    build_home(notes, books, cards)
    build_notes_page(books)
    build_lists_page()
    build_cards_page(cards)
    build_detail_pages("books", books)
    build_detail_pages("cards", cards)


# ═══════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════


def _books_of_cat(books: list, cat_name: str) -> list:
    return [b for b in books if b["meta"].get("theme") == cat_name]


def _cat_nav(active: str = "") -> str:
    items = []
    for c in CATEGORIES:
        cls = ' class="active"' if c["name"] == active else ""
        items.append(
            f'<a href="/uRead/books/#{c["name"]}"{cls}><span class="emoji">{c["emoji"]}</span>{c["name"]}</a>'
        )
    return f'<div class="cat-nav">{"".join(items)}</div>'


def _card_html(note: dict, base: str) -> str:
    author = note["meta"].get("author", "")
    author_html = f'<div class="card-author">{author}</div>' if author else ""
    return f'''<article class="card">
  <div class="card-eyebrow">{note["meta"].get("theme", note["section"])}</div>
  <h3><a href="{base}/{note["slug"]}/">{note["title"]}</a></h3>
  <p>{note["summary"]}</p>
  {author_html}
</article>'''


# ═══════════════════════════════════════════════════════════════
#  HOME
# ═══════════════════════════════════════════════════════════════


def build_home(notes, books, cards) -> None:
    tag_count = len({t for n in notes for t in n["meta"].get("tags", [])})

    # stats
    stats = [
        ("深度笔记", str(len(books))),
        ("知识卡片", str(len(cards))),
        ("标签数量", str(tag_count)),
        ("精选书单", str(len(CURATED_LISTS))),
    ]
    stats_html = "\n".join(
        f'<div class="stat"><div class="stat-num">{v}</div><div class="stat-label">{l}</div></div>'
        for l, v in stats
    )

    # category sections (show up to 6 per cat)
    cat_sections = ""
    for c in CATEGORIES:
        cat_books = _books_of_cat(books, c["name"])[:6]
        if not cat_books:
            continue
        grid = "\n".join(_card_html(b, "/uRead/books") for b in cat_books)
        cat_sections += f"""
<section class="cat-section">
  <div class="cat-title"><span class="emoji">{c["emoji"]}</span>{c["name"]}<span class="count">{len(_books_of_cat(books, c["name"]))}</span></div>
  <div class="grid">{grid}</div>
</section>"""

    # curated list preview
    list_cards = ""
    for lst in CURATED_LISTS:
        total = sum(len(s["books"]) for s in lst["sections"])
        list_cards += f"""<article class="list-card">
  <h3><a href="/uRead/lists/{lst["slug"]}/">{lst["title"]}</a></h3>
  <p>{lst["summary"]}</p>
  <div class="list-card-meta"><span>{len(lst["sections"])} 个分类</span><span>{total} 本经典</span></div>
</article>"""

    # cards preview
    cards_preview = "\n".join(_card_html(c, "/uRead/cards") for c in cards[:6])

    body = f"""
<section class="hero">
  <div class="hero-eyebrow">Open Reading OS</div>
  <h1>盘活经典书单资产<br>打造可发布、可检索的深度读书笔记</h1>
  <p>uRead 用 GitHub 维护内容，用结构化元数据和静态 API 提升可读性、复用性与机器可用性。</p>
</section>

<div class="stats">{stats_html}</div>

{_cat_nav()}

<div class="section-header"><h2>精选书单</h2><a href="/uRead/lists/" class="view-all">查看全部</a></div>
<div class="preview-grid">{list_cards}</div>

{cat_sections}

<div class="section-header"><h2>知识卡片</h2><a href="/uRead/cards/" class="view-all">查看全部</a></div>
<div class="grid">{cards_preview}</div>
"""
    (PUBLIC_DIR / "index.html").write_text(
        site_shell(
            "uRead — 深度读书笔记", body, "结构化深度读书笔记与 Agent 友好知识资产"
        ),
        encoding="utf-8",
    )


# ═══════════════════════════════════════════════════════════════
#  NOTES LIST (books)
# ═══════════════════════════════════════════════════════════════


def build_notes_page(books) -> None:
    sections = ""
    for c in CATEGORIES:
        cat_books = _books_of_cat(books, c["name"])
        if not cat_books:
            continue
        grid = "\n".join(_card_html(b, "/uRead/books") for b in cat_books)
        sections += f'''
<section class="cat-section" id="{c["name"]}">
  <div class="cat-title"><span class="emoji">{c["emoji"]}</span>{c["name"]}<span class="count">{len(cat_books)}</span></div>
  <div class="grid">{grid}</div>
</section>'''

    body = f"""
<section class="hero">
  <div class="hero-eyebrow">深度笔记</div>
  <h1>深度笔记</h1>
  <p>所有内容同时生成静态页面、JSON API 与 JSON-LD 元数据，便于读者阅读，也便于 Agent 检索。</p>
</section>
{_cat_nav()}
{sections}
"""
    (PUBLIC_DIR / "books" / "index.html").write_text(
        site_shell("深度笔记 | uRead", body, "按九大分类浏览深度读书笔记"),
        encoding="utf-8",
    )


# ═══════════════════════════════════════════════════════════════
#  CURATED LISTS
# ═══════════════════════════════════════════════════════════════


def build_lists_page() -> None:
    # lists index
    cards = ""
    for lst in CURATED_LISTS:
        total = sum(len(s["books"]) for s in lst["sections"])
        cards += f"""<article class="card">
  <h3><a href="/uRead/lists/{lst["slug"]}/">{lst["title"]}</a></h3>
  <p>{lst["summary"]}</p>
  <div class="card-author">{len(lst["sections"])} 个分类 · {total} 本经典</div>
</article>"""

    body = f"""
<section class="hero">
  <div class="hero-eyebrow">精选书单</div>
  <h1>精选书单</h1>
  <p>按主题精心编排的经典著作导读，每本书附一句话定位，帮你快速建立认知地图。</p>
</section>
<div class="grid">{cards}</div>
"""
    target = PUBLIC_DIR / "lists" / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        site_shell("精选书单 | uRead", body, "按主题编排的经典著作导读"),
        encoding="utf-8",
    )

    # each list detail page
    for lst in CURATED_LISTS:
        sections_html = ""
        for sec in lst["sections"]:
            items = ""
            for i, (title, desc) in enumerate(sec["books"], 1):
                items += f"""<div class="list-item">
  <span class="list-num">{i}.</span>
  <div><span class="list-book-title">{title}</span>：<span class="list-desc">{desc}</span></div>
</div>"""
            sections_html += f"""
<div class="list-section">
  <h2 class="list-section-title">{sec["name"]}</h2>
  {items}
</div>"""

        body = f"""
<article class="note">
  <div class="hero-eyebrow">精选书单</div>
  <h1>{lst["title"]}</h1>
  <p style="color:var(--muted);margin-bottom:1.5rem">{lst["summary"]}</p>
  {sections_html}
</article>
"""
        folder = PUBLIC_DIR / "lists" / lst["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(
            site_shell(f"{lst['title']} | 精选书单 | uRead", body, lst["summary"]),
            encoding="utf-8",
        )


# ═══════════════════════════════════════════════════════════════
#  CARDS LIST
# ═══════════════════════════════════════════════════════════════


def build_cards_page(cards) -> None:
    grid = "\n".join(_card_html(c, "/uRead/cards") for c in cards)
    body = f"""
<section class="hero">
  <div class="hero-eyebrow">知识卡片</div>
  <h1>知识卡片</h1>
  <p>从深度阅读中提炼的核心概念、模型与方法论，便于速查与引用。</p>
</section>
<div class="grid">{grid}</div>
"""
    (PUBLIC_DIR / "cards" / "index.html").write_text(
        site_shell("知识卡片 | uRead", body, "核心概念与方法论速查"),
        encoding="utf-8",
    )


# ═══════════════════════════════════════════════════════════════
#  DETAIL PAGES
# ═══════════════════════════════════════════════════════════════


def build_detail_pages(section: str, notes) -> None:
    for note in notes:
        folder = PUBLIC_DIR / section / note["slug"]
        folder.mkdir(parents=True, exist_ok=True)

        tags_html = "".join(
            f'<span class="pill">{t}</span>' for t in note["meta"].get("tags", [])
        )
        meta = note["meta"]
        meta_text = (
            f"{meta.get('author', 'uRead')} / {meta.get('theme', note['section'])}"
        )
        rating = meta.get("rating", 0)
        if rating:
            meta_text += f" / {'★' * rating}{'☆' * (5 - rating)}"

        content_html = markdown_to_html(note["body"])

        body = f"""
<article class="note">
  <div class="hero-eyebrow">{note["type"]}</div>
  <h1>{note["title"]}</h1>
  <div class="note-meta">{meta_text}</div>
  <p style="color:var(--ink-light)">{note["summary"]}</p>
  <div class="tag-row">{tags_html}</div>
  {content_html}
</article>
"""
        (folder / "index.html").write_text(
            site_shell(f"{note['title']} | uRead", body, note["summary"]),
            encoding="utf-8",
        )


# ═══════════════════════════════════════════════════════════════
#  JSON API BUILDERS
# ═══════════════════════════════════════════════════════════════


def _books_api(books):
    return [
        {
            "title": n["title"],
            "author": n["meta"].get("author", ""),
            "slug": n["slug"],
            "summary": n["summary"],
            "tags": n["meta"].get("tags", []),
            "theme": n["meta"].get("theme", ""),
            "rating": n["meta"].get("rating", 0),
            "url": f"/uRead/books/{n['slug']}/",
            "agentsPublic": n["meta"].get("agents_public", False),
        }
        for n in books
    ]


def _tags_api(notes):
    tags: dict[str, list[str]] = {}
    for n in notes:
        for t in n["meta"].get("tags", []):
            tags.setdefault(t, []).append(n["title"])
    return [
        {"tag": t, "notes": sorted(v), "count": len(v)} for t, v in sorted(tags.items())
    ]


def _graph_api(notes):
    nodes = [{"id": n["title"], "group": n["type"]} for n in notes]
    links = []
    titles = {n["title"] for n in notes}
    for n in notes:
        for lk in n["links"]:
            if lk in titles:
                links.append({"source": n["title"], "target": lk})
    return {"nodes": nodes, "links": links}


if __name__ == "__main__":
    main()
