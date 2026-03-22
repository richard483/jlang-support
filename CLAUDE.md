# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**jlang-support** is a personal Japanese language learning platform built with SvelteKit. It provides enhanced kanji lookup (radicals, stroke diagrams, mnemonics, conjugation forms), bookmarking, and flashcard integration with the existing `fc.nephren.xyz` app.

**Data sources:** KanjiDic2 (meanings/readings), KRADFILE (radicals), KanjiVG (stroke SVGs) — all pre-imported into PostgreSQL. tanoshiijapanese.com is linked as an external reference per kanji.

## Commands

```bash
npm run dev           # start dev server
npm run build         # production build
npm run check         # TypeScript + Svelte type checking
npm run db:schema     # apply DB schema (requires DATABASE_URL)
npm run import:kanjidic  # import KanjiDic2 XML → DB
npm run import:kradfile  # import KRADFILE → DB
npm run import:kanjivg   # copy KanjiVG SVGs to static/ + update DB
```

Scripts use `npx tsx`. Data files go in `data/` (gitignored).

## Environment

Copy `.env.example` to `.env`:
```
DATABASE_URL=postgres://user:password@localhost:5432/jlang
```

## Architecture

**SvelteKit 2 + Svelte 5 (runes mode)**, Tailwind CSS 4, PostgreSQL via `pg`, adapter-node.

All DB access goes through `src/lib/server/db.ts` (pg pool, reads `DATABASE_URL`).

### Key routes

| Route | Purpose |
|---|---|
| `/` | Search kanji by literal, reading, or meaning |
| `/kanji/[literal]` | Kanji detail — readings, radicals, stroke SVG, mnemonics, bookmark toggle |
| `/browse` | Grid browse with JLPT/grade filters and pagination |
| `/bookmarks` | Saved kanji list |
| `/conjugate` | Verb conjugation tool (pure client-side) |

### API routes

- `GET /api/kanji/search?q=` — full-text search
- `GET /api/kanji/[literal]` — full kanji data
- `GET/POST /api/bookmarks`, `DELETE /api/bookmarks/[literal]`
- `POST/DELETE /api/mnemonics`

### Conjugation engine

`src/lib/utils/conjugation.ts` — pure TypeScript, no DB. Handles godan, ichidan, する, くる verbs. Exports `conjugate(verb, group)` → `ConjugationResult` and `FORM_LABELS`.

### Data import scripts

One-time setup — download data files first:
- **KanjiDic2:** https://www.edrdg.org/kanjidic/kanjidic2.xml.gz → `data/kanjidic2.xml`
- **KRADFILE:** http://ftp.edrdg.org/pub/Nihongo/kradzip.zip → extract to `data/`, then convert: `iconv -f EUC-JP -t UTF-8 data/kradfile > data/kradfile-utf8 && iconv -f EUC-JP -t UTF-8 data/kradfile2 > data/kradfile2-utf8`
- **KanjiVG:** https://github.com/KanjiVG/kanjivg/releases → extract `kanji/` to `data/kanjivg/`

## External Integrations

- **Flashcard app:** `https://fc.nephren.xyz/` — credentials in `my-idea.md`, repo at `https://github.com/richard483/rein-flashcard.git` (token in `/home/nephren/notes/infrastructure.md`)
- Flashcard export (Phase 5): API proxy from `/api/flashcard-export` → rein-flashcard's `POST /api/decks`
