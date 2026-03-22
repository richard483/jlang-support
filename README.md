# jlang-support

A personal Japanese language learning platform built with SvelteKit. Provides enhanced kanji lookup with radicals, stroke order diagrams, mnemonics, verb conjugation, and bookmarking — with planned integration with [rein-flashcard](https://github.com/richard483/rein-flashcard).

## Features

- **Kanji search** — by character, reading (on/kun), or English meaning
- **Kanji detail** — meanings, readings, JLPT/grade level, stroke order diagram, radical decomposition, external link to Tanoshii Japanese
- **Browse** — grid view filtered by JLPT level (N5–N1) or school grade
- **Bookmarks** — save kanji for later study
- **Mnemonics** — add personal memory aids and etymology notes per kanji
- **Verb conjugation** — godan, ichidan, する, くる — 14 conjugation forms

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
# Edit .env and set DATABASE_URL
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

### 5. Start the dev server

```bash
npm run dev
```

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
