<div align="center">

# uRead · Personal Reading Library

**READ · REFLECT · REVISIT**

A home for the books you have read — and the passages worth returning to.

[![version](https://img.shields.io/badge/version-0.33.1-2457A6?style=flat-square)](CHANGELOG.md)
[![license](https://img.shields.io/badge/license-MIT-C58B42?style=flat-square)](LICENCE)
[![site](https://img.shields.io/badge/site-GitHub%20Pages-17243A?style=flat-square)](https://zhubao315.github.io/uRead/)

[中文](README.md) · [English](README.en.md)

</div>

---

## Contents

1. [What this is](#1-what-this-is)
2. [Page map](#2-page-map)
3. [The public reading portal](#3-the-public-reading-portal)
4. [The local-first workspace](#4-the-local-first-workspace)
5. [Where the data comes from](#5-where-the-data-comes-from)
6. [Publishing governance and automation](#6-publishing-governance-and-automation)
7. [Quality gates](#7-quality-gates)
8. [Tech stack](#8-tech-stack)
9. [Quick start](#9-quick-start)
10. [Repository layout](#10-repository-layout)
11. [Deployment](#11-deployment)
12. [Known limitations](#12-known-limitations)
13. [License](#13-license)

---

## 1. What this is

uRead is two products that share one site:

| | Public reading portal | Local-first workspace |
| --- | --- | --- |
| Entry points | `/`, `/read`, `/booklists`, `/books/`, `/find` | `/workspace`, `/workspace/library`, `/workspace/notes`, `/workspace/cards`, `/workspace/booklists`, `/workspace/search` |
| Data | Read-only build-time JSON and static HTML | Browser IndexedDB (eight data categories) |
| Secrets | None | None |
| Purpose | A reading archive you can share | Your own books, notes, cards and reading history |

> Current version: **0.33.1** (see [`CHANGELOG.md`](CHANGELOG.md)).

**Real content baseline** (from the current build, not a roadmap):

| Content | Count |
| --- | --- |
| Public reading notes | 1595 |
| Themed reading collections | 10 |
| Curated booklists | 39 |
| Aggregated book records | 1818 |
| Redistributable ebooks (EPUB/PDF) | 2 |

**Deliberately out of scope**: AI summaries, knowledge extraction, recommendation models, RAG / vector search, cloud sync, and connecting to a private GitHub repository from the browser. These are boundaries, not upcoming features — private-repo tokens never reach the frontend, and retrieval/knowledge work belongs to other products in the workspace.

> Early scaffolding documents described "AI recommendations / AI-generated cards / PDF parsing" that never existed; they were moved to `_archive/legacy-docs/`. This README only describes behavior verifiable in the current source.

---

## 2. Page map

| URL | What you get |
| --- | --- |
| `/uRead/` | Editorial home: featured books, booklists, latest notes, themed entry points |
| `/uRead/read/` | Public notes (read-only), browsable by category, searchable, listenable |
| `/uRead/booklists/` | Unified themes + booklists hub (legacy `/themes`, `/lists` still work) |
| `/uRead/books/` | Book index, book profiles, ebook library and reader (static HTML) |
| `/uRead/find/` | Site-wide search grouped by books / notes / booklists / themes |
| `/uRead/workspace/` | Local workspace: library, notes, cards, booklists, search |
| `/uRead/docs/` | Documentation site (Hugo + OINK, same Pages artifact) |

Legacy paths `/library`, `/notes`, `/cards`, `/search` redirect to `/workspace/*` with query parameters preserved.

---

## 3. The public reading portal

### 3.1 Home and discovery

The homepage is an editorial reading magazine, not a database front end. The hero uses featured book IDs from `publishing/homepage.json`; featured booklists and themes use consistent 16:9 abstract artwork; latest notes stay in a compact list. Every featured ID resolves to real content, with a safe fallback if an ID ever goes stale.

### 3.2 Notes and listening

- Note bodies load one at a time from `detail/<content_hash>.json`. Lists only download a 1.5 MB index instead of the full 22 MB dataset.
- Every note has a **收听 (Listen)** button: it speaks the text with the browser's `speechSynthesis` — **no files, no network, no note upload**. Unsupported browsers get an explicit compatibility hint instead of a fake player.
- A real EPUB cover is used when available; otherwise a deterministic SVG theme visual is shown, clearly labeled `uRead · THEME VISUAL` so it cannot be mistaken for a publisher cover.
- `[[wikilinks]]` are clickable only when the target is also in the public set. Private-repository blob URLs would 404 for visitors, so the detail page shows only the directory and git SHA for verification.

### 3.3 Themes, booklists and books

- All 39 booklists and 10 themes have 16:9 abstract artwork cards and a banner on their detail pages. Titles, authors, recommendations and note links remain real HTML text — images never replace content.
- The book index has 1868 records, each with a deterministic SVG cover. An online-reader link appears only when a real ebook exists.
- The ebook library uses **foliate-js v1.0.1** (MIT, vendored, no network at build time): EPUBs are laid out in the browser, PDFs use the browser's built-in viewer.

### 3.4 Media system

Image assets are kept separate from Obsidian notes, booklist source files and publication approval:

| Role | Path |
| --- | --- |
| Curated manifest | `media/curated-manifest.json` + `media/manifest.schema.json` (1489 book covers) |
| Note cover sync | `npm run books:covers -- --from <vault>/07-SOURCES/71-书籍/assets/covers` → `public/media/books/<id>.jpg` |
| Inline image map | `media/wiki-images.json`: note `![[image.jpg]]` → `dist/media/wiki-images.json`, rendered as `<img>` by `SafeMarkdown` |
| Note list covers | `media/note-covers.json`: note slug → cover, shown as thumbnails on `/read` |
| Own-book covers | `media/own-book-covers.json` + `public/media/own-books/*.webp` (from the portfolio `/books/`, served locally) |
| Booklist artwork | `media/booklist-art-plan.json` + `public/media/booklists/<id>.webp` (`npm run booklist-art:generate`, 49 distinct visuals) |
| Book theme visuals | `dist/media/books/<id>.svg` (2:3, seeded by book ID; used when no note cover exists) |
| Collection artwork | `dist/media/collections/<kind>-<id>.svg` (16:9) |
| Real covers | `dist/books/covers/*` (from redistributable EPUBs only) |

`MediaImage`, `BookCover` and `CollectionArtwork` centralize aspect ratios, `loading="lazy"`, `decoding="async"` and a single-step fallback; the hero image uses `fetchpriority="high"` and is never lazy. See [`docs/design/media-system.md`](docs/design/media-system.md).

---

## 4. The local-first workspace

The workspace never writes public artifacts, and public notes never enter the eight IndexedDB stores.

| Capability | Status | Verify with |
| --- | --- | --- |
| Library: create/delete books, paste source text, track reading status | ✅ implemented | `npm test` |
| Notes: create/filter/delete, with page and quote anchors | ✅ implemented | `npm test` |
| **Public notes**: synced from Obsidian to a read-only view, 30 s version checks | ✅ implemented | `npm test -- tests/views/public-notes.test.tsx` |
| **Listen**: native device speech works without a WAV; a real player only appears for real audio | ✅ implemented | `npm test -- tests/views/public-notes.test.tsx` |
| **Incremental sync**: GitHub tree + blob cache, token read from env only | ✅ implemented | `npm test -- tests/data/public-notes-format.test.ts` |
| Knowledge cards: create/delete/verify, linked to source notes | ✅ implemented | `npm test` |
| Booklists: create/delete, add or remove library items | ✅ implemented | `npm test -- tests/views/pages.test.tsx` |
| Booklist cards list real titles with reading status | ✅ implemented | `npm test -- tests/views/booklist-books.test.tsx` |
| Notes pointing at deleted books: explain why, filter as "unassigned", reassign | ✅ implemented | `npm test -- tests/views/orphan-notes.test.tsx` |
| Knowledge relations (`derived_from`, etc.) | ✅ implemented | `npm test` |
| IndexedDB persistence with migrations and indexes | ✅ implemented | `tests/data/repository.test.ts` |
| JSON backup (all eight categories) / Markdown export (notes + cards only) | ✅ implemented | `npm test -- tests/data/repository.test.ts` |
| Site-wide search and in-list filtering (multi-term AND, 200 ms debounce) | ✅ implemented | `npm test -- tests/components/search-and-state.test.tsx` |
| Filters and "new" entry points encoded in the URL | ✅ implemented | `npm test -- tests/views/pages.test.tsx` |
| Loading / empty / error states are distinct; errors are retryable | ✅ implemented | `npm test -- tests/components/state-and-feedback.test.tsx` |
| Every write reports success or failure | ✅ implemented | `tests/store/errors.test.ts` |
| Destructive actions require two-step confirmation | ✅ implemented | `npm test -- tests/components/state-and-feedback.test.tsx` |
| Keyboard accessible: focus rings, accessible names, `aria-live` | ✅ implemented | `npm run lint` + component tests |
| Synthetic demo library, load/clear in one click | ✅ implemented | `tests/data/sample.test.ts` |
| Alignment with shared contract enums | ✅ implemented | `npm test -- tests/data/contract-alignment.test.ts` |
| Unsubmitted form fields staged locally and labeled as unsaved | ✅ implemented | `npm test -- tests/views/drafts.test.tsx` |
| AI summaries, extraction, recommendations | ⛔ not implemented | — |
| PDF/EPUB parsing inside the workspace | ⛔ not implemented; the site's book library uses foliate-js | — |
| Browser-direct private repo access / cloud sync | ⛔ deliberately excluded | — |
| Retrieval / RAG / vector store | ⛔ handled by uAI Core, not here | — |
| Undo / recycle bin | ⛔ not implemented (deletion is permanent, hence confirmation) | — |

### 4.1 What a backup really covers

| Method | Coverage | Use |
| --- | --- | --- |
| JSON export (`uread-library` v2) | All eight categories — books, notes, cards, booklists, reading sessions, highlights, annotations, relations | **The only complete restore** |
| Markdown export | Notes and knowledge cards only | Human review / version control, **not a backup** |

### 4.2 Drafts and URL state

Form fields are staged in `localStorage` (`uread:draft:v1:`). Drafts never enter IndexedDB, JSON backups or Markdown exports; recovery is explicitly labeled "not yet saved"; blocked storage is reported instead of failing silently. List filters and "new" form state live in the URL (`/notes?q=...`, `/library?new=1`), implemented once and shared by four views.

### 4.3 Synthetic demo library

| Content | Count | Notes |
| --- | --- | --- |
| Example books | 3 | Read/unread/in-progress states |
| Reading notes | 6 | Each with a `text_quote` anchor and verbatim quote |
| Knowledge cards | 5 | Mixed types and verification states |
| Knowledge relations | 5 | Card → note `derived_from` |
| Booklist | 1 | Contains all example books |

This is **not real reading history**; every item carries the `synthetic-demo` tag, and clearing it removes only tagged items.

---

## 5. Where the data comes from

Public content is synced from a private Obsidian vault by local scripts. **The browser never sees a token.**

```bash
npm run notes:sync:dry      # preview, no writes
npm run lists:sync:dry

GITHUB_TOKEN=... npm run notes:sync -- --no-audio
GITHUB_TOKEN=... npm run lists:sync

node scripts/sync-notes.mjs --local=/path/to/07-SOURCES/71-书籍 --no-audio
npm run build               # public/ → dist/
```

| Variable / flag | Purpose | Default |
| --- | --- | --- |
| `GITHUB_TOKEN` | Read-only PAT; **env only**, never in code, artifacts or logs | required in GitHub mode |
| `NOTES_REPO` / `NOTES_BRANCH` / `NOTES_PATH` | Source repository, branch, note directory | `zhubao315/obsidian-vault` / `main` / `07-SOURCES/71-书籍` |
| `TTS_BASE_URL` / `TTS_MODEL` / `TTS_VOICE` | Optional audio-generation endpoint | local service |
| `--audio-limit=N` / `AUDIO_LIMIT` | Max new audio files per run, cached by content hash | `10` |
| `--no-audio` / `--dry-run` | Skip audio / plan only | off |

> **Public-scope warning**: the current configuration publishes **the entire `07-SOURCES/71-书籍` directory**, including the body text of all 1595 notes. Once published to Pages, search engines and third-party caches **cannot be guaranteed to forget it**. Only `public/notes/` and `public/lists/` are public; `.notes-cache/` and `.lists-cache/` are gitignored and never shipped.

> Audio note: the TTS service is down, so all automatic syncs use `--no-audio`. Every note is still listenable through native device speech; a few existing WAVs remain as optional caches. No audio is faked.

---

## 6. Publishing governance and automation

```bash
npm run publish:preview            # diff against the approved baseline, read-only
npm run publish:check -- --strict  # fail on unapproved changes, new sensitive hits or orphan audio
APPROVE=1 npm run publish:approve  # human confirmation updates the approved baseline
```

`require_approval` is enforced. `deploy.yml` runs release reconciliation and a strict publish check after building; failure blocks deployment. `publish:approve` is never called in CI. Policy lives in `publishing/policy.json` and currently uses `allow_all_legacy` (the confirmed temporary full-public state); the tooling never deletes or edits files under `public/`.

| Workflow | Schedule | Job |
| --- | --- | --- |
| `auto-sync.yml` | Daily 02:00 UTC (10:00 Beijing) | Notes (`--no-audio`) |
| `lists-sync.yml` | Mondays 03:00 UTC (11:00 Beijing) | Themes and booklists |
| `ci.yml` | on push | typecheck, lint, tests, build, docs check |
| `deploy.yml` | push / dispatch | reconciliation, strict publish check, Pages deploy |

Both sync workflows can be run manually and share the `content-sync` concurrency group. Before committing, they compare manifest versions: if only `generated_at` timestamps changed, they skip the commit and deployment instead of producing an empty commit. Required secret: `OBSIDIAN_TOKEN` (read-only PAT).

---

## 7. Quality gates

```bash
npm run typecheck
npm run lint
npm test                 # 229 passed, 1 skipped across 33 files
npm run build
npm run docs:build
npm run docs:check
npm run media:validate
npm run media:audit
npm run verify:release
npm run publish:check -- --strict
npx playwright test      # desktop + mobile Chromium
```

The repository-wide gate is `ROUND=<n> bash ../scripts/quality_round.sh` (latest: **37/37**). `python3 ../scripts/mutation_check.py` reintroduces fixed bugs one by one and requires the matching test to fail — a test that can never fail is not a test.

---

## 8. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React 19.3 + TypeScript 5.9 |
| Build | Vite 8.3 (Rolldown) |
| Router | React Router 7 (`basename=/uRead`) |
| State | Zustand 5 (UI) + repository layer (persistence) |
| Styling | Tailwind CSS 3.4 + design tokens |
| Storage | IndexedDB (`fake-indexeddb` in tests) |
| Testing | Vitest 5 + ESLint 9 + `tsc --noEmit` + Playwright |
| Reader | foliate-js v1.0.1 (MIT, vendored) |
| Docs | Hugo Extended 0.168 + OINK (vendored, zero CDN) |
| Deployment | GitHub Pages (official Actions, `base=/uRead/`, `404.html`) |

---

## 9. Quick start

```bash
npm ci
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm test
npm run build
npm run docs:build   # requires Hugo Extended 0.168+
npm run docs:check
```

---

## 10. Repository layout

```
uRead/
├── src/
│   ├── data/            # domain types, IndexedDB, repositories, public data loaders
│   ├── domain/          # note sections, speech segmentation, media resolution
│   ├── services/speech/ # native device speech engine
│   ├── hooks/           # useDraft / useUrlSync / useSpeechPlayer
│   ├── components/      # UI and media/ image components
│   └── views/           # public portal + workspace pages
├── public/              # notes, lists, optional audio, brand, built media
├── media/               # curated media manifest and schema
├── publishing/          # policy, approved baseline, homepage curation
├── scripts/             # sync, build, audit and publish checks
├── book-library/        # EPUB/PDF builder and foliate-js
├── docs/                # Hugo content directory
├── tests/               # Vitest + Playwright
├── .github/workflows/   # ci / deploy / auto-sync / lists-sync
└── _archive/            # historical scaffolding (not built)
```

---

## 11. Deployment

The site is served from **https://zhubao315.github.io/uRead/**. `vite.config.ts` uses the same `SITE_BASE` as the router, and `404.html` keeps deep links working on refresh. The docs site builds to `docs-site/` and is copied into `dist/docs/` by the same `deploy.yml`, so the app and docs share one Pages artifact. Hugo warnings are treated as errors (except the theme's libsass deprecation notice).

---

## 12. Known limitations

- **Public scope cannot be reclaimed**: the current state is full-public; published content may be cached by search engines or third parties.
- **TTS service is down**: no new audio; listening depends on the browser's native speech engine and its voices.
- **No real-device regression**: E2E uses desktop/mobile Chromium viewports, not physical phones.
- **Audit docs are point-in-time snapshots**: current status is this README and `docs/PROJECT-STATUS.md`.
- **Book covers are not publisher covers**: all 1868 records use uRead theme visuals; only one EPUB has a real embedded cover, and it does not match any aggregated record.

---

## 13. License

MIT — see [`LICENCE`](LICENCE). Third-party components (foliate-js, OINK, etc.) retain their own licenses.
