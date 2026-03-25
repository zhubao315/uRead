from __future__ import annotations

from shared import PUBLIC_DIR, ensure_public_dirs, load_notes, write_json


def main() -> None:
    ensure_public_dirs()
    notes = [note for note in load_notes() if note["type"] in {"book", "concept"}]
    chunks = []
    for note in notes:
        for index, chunk in enumerate(split_chunks(note["body"], 280)):
            chunks.append(
                {
                    "id": f'{note["slug"]}-{index}',
                    "title": note["title"],
                    "type": note["type"],
                    "tags": note["meta"].get("tags", []),
                    "summary": note["summary"],
                    "chunk": chunk,
                    "embedding": [],
                }
            )
    write_json(
        PUBLIC_DIR / "vectors" / "manifest.json",
        {
            "provider": "placeholder",
            "description": "当前环境未接入真实 Embedding 模型，先输出可供后续向量化处理的分块清单。",
            "count": len(chunks),
            "items": chunks,
        },
    )


def split_chunks(text: str, size: int) -> list[str]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []
    return [cleaned[i : i + size] for i in range(0, len(cleaned), size)]


if __name__ == "__main__":
    main()
