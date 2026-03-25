from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parents[2]
BOOKLIST_PATH = WORKSPACE / "knowledge" / "我的书单.md"
SOURCE_NOTES_DIR = WORKSPACE / "读书笔记"
BOOKLIST_DIR = ROOT / "content" / "01-经典书单"
NOTES_DIR = ROOT / "content" / "02-深度笔记"
CARDS_DIR = ROOT / "content" / "03-知识卡片"


CATEGORY_GUIDE = {
    "文学虚构类": "通过人物、叙事和冲突理解人性、命运与时代情绪。",
    "实用技能类": "把书中的方法论转化为工作流、清单和可执行动作。",
    "认知成长类": "围绕决策、学习、习惯和自我管理建立个人操作系统。",
    "历史社科类": "把个人问题放回制度、文明与长期周期中重新理解。",
    "科技科普类": "理解关键技术、底层原理与未来趋势，避免只追热点。",
    "投资理财类": "建立概率思维、风险意识和长期复利框架。",
    "传记人物类": "从关键人物的抉择、性格与时代关系中抽取可复用启发。",
    "艺术美学类": "提升观看、感受、判断与表达的审美能力。",
    "哲学宗教类": "围绕意义、自由、德性、修养与精神秩序做长期思考。",
}

THEME_MAP = {
    "长期主义": ["长期", "复利", "长期主义", "周期", "终身", "长期持有"],
    "决策与判断": ["决策", "判断", "理性", "选择", "风险", "概率"],
    "系统思考": ["系统", "复杂", "全景", "底层逻辑", "结构", "框架"],
    "学习方法": ["学习", "阅读", "刻意练习", "成长", "训练", "终身学习"],
    "心理与认知": ["心理", "认知", "情绪", "自我", "心流", "行为"],
    "组织与管理": ["组织", "管理", "企业", "领导", "执行", "文化"],
    "创业与增长": ["创业", "产品", "增长", "营销", "商业模式", "创新"],
    "价值投资": ["投资", "价值", "估值", "资产", "财务", "财富"],
    "文明与历史": ["文明", "历史", "制度", "社会", "战争", "国家"],
    "技术前沿": ["AI", "机器学习", "深度学习", "算法", "大模型", "技术"],
    "健康与跑步": ["跑步", "长寿", "运动", "健康", "医学", "配速"],
    "哲学修养": ["哲学", "斯多葛", "道家", "佛", "理性", "意义"],
    "文学与审美": ["文学", "小说", "诗", "艺术", "审美", "叙事"],
    "人物传记": ["传记", "人物", "自传", "领袖", "企业家", "人生"],
}

CARD_EXPLAINERS = {
    "长期主义": "以更长时间尺度配置注意力、资源与行动，避免被短期波动牵引。",
    "决策与判断": "在不确定条件下识别信息质量、偏差来源和可逆性，提升选择质量。",
    "系统思考": "不只看单点问题，而是追踪结构、反馈回路与长期后果。",
    "学习方法": "把输入、理解、练习、输出和复盘串成稳定学习回路。",
    "心理与认知": "理解情绪、偏差、动机与行为机制，减少自我消耗与误判。",
    "组织与管理": "通过机制、文化和角色协同，让团队在复杂环境中持续运转。",
    "创业与增长": "围绕用户价值、验证、传播和留存构建增长飞轮。",
    "价值投资": "在安全边际、企业质量和长期复利框架中做资本配置。",
    "文明与历史": "用历史与制度视角理解当下问题，避免局部和短期视角。",
    "技术前沿": "理解关键技术原理、应用边界和长期产业影响，而不是只追概念。",
    "健康与跑步": "把训练、恢复、姿势、强度和长期身体状态统一起来。",
    "哲学修养": "围绕意义、德性、自由与修养建立稳定的精神秩序。",
    "文学与审美": "通过叙事、意象、形式与风格提升感受力和表达力。",
    "人物传记": "从关键人物的性格、抉择与时代关系中抽取可迁移经验。",
}


@dataclass
class BookEntry:
    title: str
    author: str
    category: str
    desc: str = ""
    source_target: str = ""
    source_note: Path | None = None
    core_theme: str = ""
    reading_goal: str = ""
    categories: set[str] = field(default_factory=set)
    tags: list[str] = field(default_factory=list)


def main() -> None:
    books = parse_booklist(BOOKLIST_PATH.read_text(encoding="utf-8"))
    source_index = build_source_index()
    for book in books.values():
        book.source_note = resolve_source(book, source_index)
        book.tags = infer_tags(book)

    write_booklist_pages(books)
    write_book_notes(books)
    write_cards(books)
    print(f"books={len(books)} cards={count_cards(books)}")


def parse_booklist(text: str) -> dict[str, BookEntry]:
    current_category = ""
    books: dict[str, BookEntry] = {}
    current_key = ""
    lines = text.splitlines()

    for index, line in enumerate(lines):
        category_match = re.match(r"^###\s+(.+?)（\d+本）", line.strip())
        if category_match:
            current_category = clean_category(category_match.group(1))
            continue

        item_match = re.match(r"^\d+\.\s+\[\[(.+?)\]\]\s*(.*)$", line.strip())
        if not item_match:
            continue

        link_inner = item_match.group(1).strip()
        desc = item_match.group(2).strip()
        source_target, display = split_link(link_inner)
        title, author = extract_title_author(display)
        if not title:
            continue

        key = normalize_key(title)
        entry = books.get(key)
        if entry is None:
            entry = BookEntry(
                title=title,
                author=author,
                category=current_category or "未分类",
                desc=desc,
                source_target=source_target,
            )
            entry.categories.add(entry.category)
            books[key] = entry
        else:
            entry.categories.add(current_category or entry.category)
            if entry.category == "未分类" and current_category and current_category != "未分类":
                entry.category = current_category
            if not entry.desc and desc:
                entry.desc = desc
            if not entry.author and author:
                entry.author = author
            if source_target.startswith("读书笔记/") and not entry.source_target.startswith("读书笔记/"):
                entry.source_target = source_target

        current_key = key

        if index + 1 < len(lines):
            theme_match = re.match(r"^\s*-\s+\*\*核心主题：\*\*\s*(.+)$", lines[index + 1])
            if theme_match and current_key in books:
                books[current_key].core_theme = theme_match.group(1).strip(" ：:")
        if index + 2 < len(lines):
            goal_match = re.match(r"^\s*-\s+\*\*阅读目标：\*\*\s*(.+)$", lines[index + 2])
            if goal_match and current_key in books:
                books[current_key].reading_goal = goal_match.group(1).strip(" ：:")

    return books


def clean_category(raw: str) -> str:
    text = raw.strip()
    match = re.search(r"([\u4e00-\u9fff].*)", text)
    cleaned = match.group(1) if match else text
    return cleaned.strip() or "未分类"


def split_link(link_inner: str) -> tuple[str, str]:
    if "|" in link_inner:
        left, right = link_inner.split("|", 1)
        return left.strip(), right.strip()
    return link_inner.strip(), link_inner.strip()


def extract_title_author(raw: str) -> tuple[str, str]:
    cleaned = raw.replace(".md", "").strip()
    match = re.search(r"《([^》]+)》\s*[-·：: ]*\s*(.*)$", cleaned)
    if match:
        title = match.group(1).strip()
        author = match.group(2).strip(" -")
        return title, author
    return cleaned.strip(), ""


def normalize_key(text: str) -> str:
    return re.sub(r"\s+", "", re.sub(r"[《》\-—·：:,.，。()（）/]+", "", text)).lower()


def build_source_index() -> dict[str, Path]:
    index: dict[str, Path] = {}
    for path in SOURCE_NOTES_DIR.rglob("*.md"):
        title, _ = extract_title_author(path.stem)
        if title:
            index.setdefault(normalize_key(title), path)
    return index


def resolve_source(book: BookEntry, source_index: dict[str, Path]) -> Path | None:
    if book.source_target.startswith("读书笔记/"):
        direct = WORKSPACE / book.source_target
        if direct.exists():
            return direct
    return source_index.get(normalize_key(book.title))


def infer_tags(book: BookEntry) -> list[str]:
    pool = " ".join(
        [
            book.category,
            book.desc,
            book.core_theme,
            book.reading_goal,
            book.title,
            book.author,
        ]
    )
    tags = [book.category]
    for tag, keywords in THEME_MAP.items():
        if any(keyword.lower() in pool.lower() for keyword in keywords):
            tags.append(tag)
    if book.author:
        tags.append(book.author)
    return dedupe(tags)[:6]


def dedupe(items: list[str]) -> list[str]:
    seen = set()
    ordered = []
    for item in items:
        if not item or item in seen:
            continue
        seen.add(item)
        ordered.append(item)
    return ordered


def safe_filename(name: str) -> str:
    return re.sub(r'[\\\\/:*?"<>|]', "-", name).strip()


def strip_frontmatter(text: str) -> str:
    if text.startswith("---\n") and "\n---\n" in text:
        return text.split("\n---\n", 1)[1].strip()
    return text.strip()


def write_booklist_pages(books: dict[str, BookEntry]) -> None:
    BOOKLIST_DIR.mkdir(parents=True, exist_ok=True)
    grouped = group_by_category(books)
    total = sum(len(items) for items in grouped.values())

    overview_lines = [
        "# uRead 经典书单导航",
        "",
        f"当前根据 `我的书单.md` 同步生成了 **{total}** 本结构化深度笔记。",
        "",
        "| 分类 | 数量 | 核心阅读价值 |",
        "|---|---:|---|",
    ]
    for category, items in grouped.items():
        overview_lines.append(f"| {category} | {len(items)} | {CATEGORY_GUIDE.get(category, '建立系统理解与行动框架')} |")

    (BOOKLIST_DIR / "README.md").write_text("\n".join(overview_lines) + "\n", encoding="utf-8")

    for category, items in grouped.items():
        lines = [
            "---",
            f"title: {category}书单",
            "type: list",
            "agents_public: true",
            f"summary: {CATEGORY_GUIDE.get(category, '结构化书单索引')}",
            "---",
            "",
            f"# {category}",
            "",
            CATEGORY_GUIDE.get(category, ""),
            "",
            f"共 {len(items)} 本：",
            "",
        ]
        for item in items:
            author = f" - {item.author}" if item.author else ""
            lines.append(f"- [[{item.title}]]{author}：{item.desc or '待补充摘要'}")
        path = BOOKLIST_DIR / f"{safe_filename(category)}.md"
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_book_notes(books: dict[str, BookEntry]) -> None:
    grouped = group_by_category(books)
    for category, items in grouped.items():
        category_dir = NOTES_DIR / safe_filename(category)
        category_dir.mkdir(parents=True, exist_ok=True)
        for book in items:
            filename = safe_filename(f"{book.title}-{book.author or '佚名'}") + ".md"
            path = category_dir / filename
            path.write_text(render_book(book), encoding="utf-8")


def render_book(book: BookEntry) -> str:
    summary = book.desc or f"这是 {book.category} 领域的重要作品，适合围绕主题、结构与应用进行深度阅读。"
    goal = book.reading_goal or default_goal(book)
    themes = "、".join(book.tags[:4]) if book.tags else book.category
    related_cards = [f"[[{tag}]]" for tag in book.tags if tag in CARD_EXPLAINERS][:4]
    source_body = ""
    if book.source_note and book.source_note.exists():
        source_body = strip_frontmatter(book.source_note.read_text(encoding="utf-8"))

    lines = [
        "---",
        f"title: {book.title}",
        f"author: {book.author or '未知'}",
        "status: scaffolded",
        "rating: 0",
        "tags:",
    ]
    for tag in book.tags:
        lines.append(f"  - {tag}")
    lines.extend(
        [
            f"theme: {book.category}",
            "year: 0",
            'isbn: ""',
            f"source: {'迁移自本地读书笔记' if source_body else '根据书单自动生成'}",
            f"summary: {summary}",
            "agents_public: true",
            "---",
            "",
            "# 一句话定位",
            "",
            summary,
            "",
            "# 这本书为什么值得读",
            "",
            f"- 所属分类：{book.category}",
            f"- 主题聚焦：{book.core_theme or themes}",
            f"- 阅读价值：{CATEGORY_GUIDE.get(book.category, '建立更系统的理解框架。')}",
            "",
            "# 阅读目标",
            "",
            f"- {goal}",
            "- 提炼可复用的认知模型、方法框架或行动清单。",
            "- 建立与其他书籍、知识卡片之间的双向链接。",
            "",
            "# 核心主题",
            "",
            f"- 主题标签：{themes}",
            f"- 书单摘要：{summary}",
            f"- 推荐切入：{default_entry_point(book)}",
            "",
            "# 深度阅读框架",
            "",
            "## 作者到底在回答什么问题",
            "",
            f"围绕“{book.title} 试图解决什么核心问题”展开，优先识别作者的时代背景、对象问题和核心命题。",
            "",
            "## 书中的关键模型",
            "",
            "- 记录作者最重要的 3 个概念、判断或方法。",
            "- 区分哪些是事实描述，哪些是价值判断，哪些是行动建议。",
            "",
            "## 与我现有知识体系的连接",
            "",
            "- 这本书与哪些已读作品互补或冲突。",
            "- 哪个观点最值得沉淀为知识卡片。",
            "",
            "# 行动提炼",
            "",
            f"- 把这本书中最能落地的一条建议，转成自己的执行动作：{default_action(book)}",
            "- 如果是理论型作品，至少提炼一个可用于判断现实问题的分析框架。",
            "",
            "# 关联知识卡片",
            "",
        ]
    )

    if related_cards:
        lines.extend([f"- {card}" for card in related_cards])
    else:
        lines.append(f"- [[{book.category}]]")

    if source_body:
        lines.extend(
            [
                "",
                "# 原始笔记资产",
                "",
                "> 以下内容迁移自你在本地已有的原始读书笔记资产，可继续在此基础上精修。",
                "",
                source_body,
            ]
        )

    return "\n".join(lines) + "\n"


def default_goal(book: BookEntry) -> str:
    category_goal = {
        "文学虚构类": "从人物命运、叙事结构与时代气氛中理解更真实的人性。",
        "实用技能类": "把书中的方法直接转成流程、清单和工作习惯。",
        "认知成长类": "建立更稳固的决策、学习与自我管理框架。",
        "历史社科类": "用更长周期和更大尺度理解制度、文明与社会运行。",
        "科技科普类": "厘清关键技术原理、演化方向与真实应用边界。",
        "投资理财类": "建立风险、估值、概率和长期复利的投资框架。",
        "传记人物类": "从关键人物的抉择与命运轨迹中抽取可复用经验。",
        "艺术美学类": "训练观看力、感受力和更高分辨率的审美判断。",
        "哲学宗教类": "围绕意义、德性、自由和修养建立内在秩序。",
    }
    return category_goal.get(book.category, "围绕主题、模型和应用建立结构化理解。")


def default_entry_point(book: BookEntry) -> str:
    return {
        "文学虚构类": "先看核心人物关系、时代背景和冲突线。",
        "实用技能类": "先找方法框架，再找适用边界和失败条件。",
        "认知成长类": "先确认作者如何定义问题，再看解决机制。",
        "历史社科类": "先识别历史阶段、制度背景和长期变量。",
        "科技科普类": "先厘清技术对象、原理、约束和应用场景。",
        "投资理财类": "先梳理风险假设、估值逻辑与决策纪律。",
        "传记人物类": "先观察人物的关键选择、性格张力和时代关系。",
        "艺术美学类": "先看作品形式、观看方式和审美判断标准。",
        "哲学宗教类": "先抓核心概念，再看其对生活的实践含义。",
    }.get(book.category, "先抓住作者的核心问题意识。")


def default_action(book: BookEntry) -> str:
    return {
        "文学虚构类": "写下一个最打动你的角色抉择，并解释它映照了什么现实问题。",
        "实用技能类": "把作者的方法压缩成一页清单，并在一周内试用一次。",
        "认知成长类": "挑一个判断偏差或习惯机制，应用到本周真实决策中。",
        "历史社科类": "用书中的视角重看一个当下议题，写出制度层面的解释。",
        "科技科普类": "把一个核心技术概念解释给非技术读者，检验自己是否真的理解。",
        "投资理财类": "把书中的投资原则变成自己的资产配置或决策检查表。",
        "传记人物类": "提炼人物的一条关键原则，判断它是否适合你的当前阶段。",
        "艺术美学类": "用书中的观看方式重新分析一件作品或一个场景。",
        "哲学宗教类": "选一个概念，结合现实处境写下自己的理解和保留意见。",
    }.get(book.category, "把最重要的一个观点转成可执行动作。")


def write_cards(books: dict[str, BookEntry]) -> None:
    CARDS_DIR.mkdir(parents=True, exist_ok=True)
    grouped = group_by_category(books)

    for category, items in grouped.items():
        lines = [
            "---",
            f"title: {category}",
            "type: concept",
            "tags:",
            f"  - {category}",
            "  - 主题书单",
            f"summary: {CATEGORY_GUIDE.get(category, '书单主题索引')}",
            "agents_public: true",
            "---",
            "",
            "# 定义",
            "",
            CATEGORY_GUIDE.get(category, ""),
            "",
            "# 适用场景",
            "",
            f"- 当你想系统阅读 {category} 相关内容时",
            "- 当你需要在同一主题下对比多本书时",
            "- 当你需要把分散阅读沉淀为知识结构时",
            "",
            "# 关联书籍",
            "",
        ]
        for item in items[:10]:
            lines.append(f"- [[{item.title}]]")
        (CARDS_DIR / f"{safe_filename(category)}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    theme_books: dict[str, list[BookEntry]] = defaultdict(list)
    for book in books.values():
        for tag in book.tags:
            if tag in CARD_EXPLAINERS:
                theme_books[tag].append(book)

    for tag, items in theme_books.items():
        lines = [
            "---",
            f"title: {tag}",
            "type: concept",
            "tags:",
            f"  - {tag}",
            "  - 知识卡片",
            f"summary: {CARD_EXPLAINERS[tag]}",
            "agents_public: true",
            "---",
            "",
            "# 定义",
            "",
            CARD_EXPLAINERS[tag],
            "",
            "# 在 uRead 中如何使用",
            "",
            f"- 阅读相关书籍时，优先追踪与“{tag}”相关的关键模型和案例。",
            "- 不只摘录结论，要记录适用条件、局限性和反例。",
            "- 将一本书的洞见转成自己的决策、行动或表达模板。",
            "",
            "# 关联书籍",
            "",
        ]
        for item in items[:12]:
            lines.append(f"- [[{item.title}]]")
        (CARDS_DIR / f"{safe_filename(tag)}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def group_by_category(books: dict[str, BookEntry]) -> dict[str, list[BookEntry]]:
    grouped: dict[str, list[BookEntry]] = defaultdict(list)
    for book in books.values():
        grouped[book.category].append(book)
    for items in grouped.values():
        items.sort(key=lambda item: (item.author, item.title))
    return dict(sorted(grouped.items()))


def count_cards(books: dict[str, BookEntry]) -> int:
    counter = Counter()
    for book in books.values():
        for tag in book.tags:
            if tag in CARD_EXPLAINERS:
                counter[tag] += 1
    return len(counter) + len(group_by_category(books))


if __name__ == "__main__":
    main()
