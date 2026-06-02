# jlang-support

A personal Japanese language learning platform built with SvelteKit. Provides enhanced kanji lookup with radicals, stroke order diagrams, etymology, verb conjugation, and boards — with integration with [rein-flashcard](https://github.com/richard483/rein-flashcard).

## Features

- **Kanji search** — by character, reading (on/kun), or English meaning
- **Kanji detail** — meanings, readings, JLPT/grade level, stroke order diagram, radical decomposition, external link to Tanoshii Japanese
- **Dynamic enrichment** — on first view, each kanji is revalidated (stroke count, grade) and enriched with usage examples + audio against the [Kanji alive API](https://app.kanjialive.com/api/docs) and [kanjiapi.dev](https://kanjiapi.dev/), then cached. Looked up once per kanji, ever.
- **Etymology** — per-kanji etymology sourced (read-only) from the Kanji Networks etymological dictionary
- **Browse** — grid view filtered by JLPT level (N5–N1) or school grade
- **Verb conjugation** — godan, ichidan, する, くる — 14 conjugation forms
- **References** — `/references` credits every data source

## Tech Stack

- [SvelteKit 2](https://kit.svelte.dev/) + Svelte 5 (runes)
- [Tailwind CSS 4](https://tailwindcss.com/)
- PostgreSQL via `pg`
- Data: [KanjiDic2](https://www.edrdg.org/kanjidic/kanjidic2_doc.html), [KRADFILE](https://www.edrdg.org/krad/kradinf.html), [KanjiVG](https://kanjivg.tagaini.net/)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set the required variables (see Environment Variables below)
```

### 3. Initialize the database

```bash
npm run db:schema
```

### 4. Download and import kanji data

**KanjiDic2** (meanings, readings, JLPT/grade):
```bash
curl -L https://www.edrdg.org/kanjidic/kanjidic2.xml.gz | gunzip > data/kanjidic2.xml
npm run import:kanjidic
```

**KRADFILE** (radical decomposition):
```bash
# Download kradzip.zip from http://ftp.edrdg.org/pub/Nihongo/kradzip.zip
# Extract and convert encoding:
python3 -c "import zipfile; zipfile.ZipFile('kradzip.zip').extractall('data/')"
iconv -f EUC-JP -t UTF-8 data/kradfile  > data/kradfile-utf8
iconv -f EUC-JP -t UTF-8 data/kradfile2 > data/kradfile2-utf8
npm run import:kradfile
```

**KanjiVG** (stroke order SVGs):
```bash
# Download kanjivg-<version>-all.zip from https://github.com/KanjiVG/kanjivg/releases
# Extract the kanji/ folder into data/kanjivg-raw/kanji/
npm run import:kanjivg
```

**Kanji Networks etymology** (read-only etymology section, ~6.6k kanji):
```bash
# Pulls the structured Kanji Networks "notes" (Lawrence J. Howell) from the
# acoomans/kanjinetworks repo — no PDF tooling needed.
npm run extract:etymology   # download + parse → data/kanjinetworks.json
npm run import:etymology    # data/kanjinetworks.json → kanji_etymology
```

### 5. Start the dev server

```bash
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgres://user:pass@host:5432/jlang` |
| `KANJIALIVE_API_KEY` | No | RapidAPI key for [Kanji alive](https://rapidapi.com/KanjiAlive/api/learn-to-read-and-write-japanese-kanji). When unset, kanji enrichment stays dormant (no external calls). |
| `HOST` | No | Server bind address (default: `0.0.0.0`) |
| `PORT` | No | Server port (default: `3000`) |

See `.env.example` for the auth / flashcard-board service variables (`PRIVATE_AUTH_BASE_URL`, `PRIVATE_FLASHCARD_API_URL`, …).

## Docker

```bash
docker build -t jlang-support .
docker run -p 3000:3000 -e DATABASE_URL=postgres://user:pass@host:5432/jlang jlang-support
```

> The KanjiVG stroke SVGs must be imported before building the image (`npm run import:kanjivg`), as they are bundled into the image from `static/kanjivg/`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run check` | TypeScript + Svelte type checking |
| `npm run db:schema` | Apply database schema |
| `npm run import:kanjidic` | Import KanjiDic2 XML → DB |
| `npm run import:kradfile` | Import KRADFILE radicals → DB |
| `npm run import:kanjivg` | Copy KanjiVG SVGs to static/ and update DB |
| `npm run extract:etymology` | Extract Kanji Networks PDF → `data/kanjinetworks.json` |
| `npm run import:etymology` | Import `data/kanjinetworks.json` → `kanji_etymology` |
