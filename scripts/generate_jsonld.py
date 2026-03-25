from __future__ import annotations

from shared import PUBLIC_DIR, ensure_public_dirs, load_notes, write_json


def main() -> None:
    ensure_public_dirs()
    notes = [note for note in load_notes() if note["type"] in {"book", "concept"}]
    for note in notes:
        note_type = "Book" if note["type"] == "book" else "DefinedTerm"
        payload = {
            "@context": "https://schema.org",
            "@type": note_type,
            "name": note["title"],
            "description": note["summary"],
            "keywords": note["meta"].get("tags", []),
            "inLanguage": "zh-CN",
            "url": build_public_url(note),
            "author": note["meta"].get("author", "uRead"),
            "dateModified": note["updatedAt"],
            "isAccessibleForFree": bool(note["meta"].get("agents_public", False)),
        }
        write_json(PUBLIC_DIR / "jsonld" / f'{note["slug"]}.json', payload)


def build_public_url(note) -> str:
    section = "books" if note["type"] == "book" else "cards"
    return f'https://zhubao315.github.io/uRead/{section}/{note["slug"]}/'


if __name__ == "__main__":
    main()
