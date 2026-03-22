# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**jlang-support** is a personal Japanese language learning platform built with SvelteKit. It provides enhanced kanji lookup (radicals, stroke diagrams, mnemonics, conjugation forms), vocabulary/compound word lookup, bookmarking, and flashcard integration with the existing `fc.nephren.xyz` app.

**Data sources:** KanjiDic2 (meanings/readings), KRADFILE (radicals), KanjiVG (stroke SVGs), JMdict (vocabulary/compounds), kanji-data (JLPT N1–N5 supplement) — all pre-imported into PostgreSQL. tanoshiijapanese.com is linked as an external reference per kanji.

## Commands

```bash
npm run dev           # start dev server
npm run build         # production build
npm run check         # TypeScript + Svelte type checking
npm run db:schema     # apply DB schema (requires DATABASE_URL)
npm run import:kanjidic  # import KanjiDic2 XML → DB
npm run import:kradfile  # import KRADFILE → DB
npm run import:kanjivg   # store KanjiVG SVG content in DB
npm run import:jmdict    # import JMdict vocabulary → DB
npm run import:jlpt      # supplement JLPT N3 data from kanji-data JSON
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
| `/` | Search kanji, compounds, readings, or meanings |
| `/kanji/[literal]` | Kanji detail — readings, radicals, stroke SVG, word forms, words using it, mnemonics, bookmark toggle |
| `/vocab/[word]` | Vocabulary detail — readings, meanings, component kanji breakdown |
| `/browse` | Grid browse with JLPT/grade filters and pagination |
| `/bookmarks` | Saved kanji list |
| `/conjugate` | Verb conjugation tool (pure client-side) |

### API routes

- `GET /api/kanji/search?q=` — searches kanji + vocab, returns `{ results, vocab }`
- `GET /api/kanji/[literal]` — full kanji data
- `GET /kanjivg/[file]` — serves KanjiVG SVG from DB (e.g. `/kanjivg/0697d.svg`)
- `GET/POST /api/bookmarks`, `DELETE /api/bookmarks/[literal]`
- `POST/DELETE /api/mnemonics`

### Conjugation engine

`src/lib/utils/conjugation.ts` — pure TypeScript, no DB. Handles godan, ichidan, する, くる verbs. Exports `conjugate(verb, group)` → `ConjugationResult` and `FORM_LABELS`.

### Database tables

- `kanji` — 13,108 kanji with meanings, readings, JLPT (N1–N5), grade, stroke SVG content
- `kanji_radicals` — radical decomposition for 12,156 kanji
- `kanji_mnemonics` — user-authored memory aids
- `bookmarks` — saved kanji (single-user, no auth yet)
- `vocab` — 173,123 JMdict entries with readings and meanings
- `vocab_kanji` — junction table linking vocab entries to their component kanji characters

### Data import scripts

One-time setup — download data files first:
- **KanjiDic2:** `https://www.edrdg.org/kanjidic/kanjidic2.xml.gz` → `data/kanjidic2.xml`
- **KRADFILE:** `http://ftp.edrdg.org/pub/Nihongo/kradzip.zip` → extract to `data/`, then convert: `iconv -f EUC-JP -t UTF-8 data/kradfile > data/kradfile-utf8 && iconv -f EUC-JP -t UTF-8 data/kradfile2 > data/kradfile2-utf8`
- **KanjiVG:** `https://github.com/KanjiVG/kanjivg/releases` → extract `kanji/` to `data/kanjivg-raw/kanji/`
- **JMdict:** `https://www.edrdg.org/pub/Nihongo/JMdict_e.gz` → `data/JMdict_e`
- **JLPT supplement:** `https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json` → `data/kanji-jlpt.json`

## External Integrations

- **Flashcard app:** `https://fc.nephren.xyz/` — credentials in `my-idea.md`, repo at `https://github.com/richard483/rein-flashcard.git` (token in `/home/nephren/notes/infrastructure.md`)
- Flashcard export (Phase 5): API proxy from `/api/flashcard-export` → rein-flashcard's `POST /api/decks`
