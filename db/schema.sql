-- jlang-support database schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pre-loaded from KanjiDic2 XML
CREATE TABLE IF NOT EXISTS kanji (
    id SERIAL PRIMARY KEY,
    literal CHAR(1) UNIQUE NOT NULL,
    stroke_count INT,
    grade INT,          -- 1-6 elementary, 7-8 middle school, 9-10 names
    jlpt_level INT,     -- 5=N5 (easiest) through 1=N1 (hardest)
    frequency INT,      -- newspaper frequency rank (lower = more common)
    meanings TEXT[],
    on_readings TEXT[],
    kun_readings TEXT[],
    nanori TEXT[],
    radical_number INT,
    svg_file TEXT,      -- KanjiVG filename, e.g. "04e2c.svg"
    svg_content TEXT,   -- inline SVG XML content (served via /kanjivg/[file])
    -- Dynamic enrichment (KanjiAlive / kanjiapi.dev), populated lazily on first view
    kanjialive_checked BOOLEAN NOT NULL DEFAULT FALSE, -- looked up against KanjiAlive yet?
    additional_data JSONB,        -- examples, references, media, _validation history
    enriched_at TIMESTAMPTZ
);

-- Apply the enrichment columns to pre-existing kanji tables (idempotent)
ALTER TABLE kanji ADD COLUMN IF NOT EXISTS kanjialive_checked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE kanji ADD COLUMN IF NOT EXISTS additional_data JSONB;
ALTER TABLE kanji ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

-- Pre-loaded from KRADFILE
CREATE TABLE IF NOT EXISTS kanji_radicals (
    kanji_literal CHAR(1) REFERENCES kanji(literal) ON DELETE CASCADE,
    radical CHAR(1) NOT NULL,
    PRIMARY KEY (kanji_literal, radical)
);

-- Kanji etymology, extracted from the Kanji Networks etymological dictionary.
-- Read-only reference data (replaces the former user-authored kanji_mnemonics).
CREATE TABLE IF NOT EXISTS kanji_etymology (
    kanji_literal CHAR(1) PRIMARY KEY REFERENCES kanji(literal) ON DELETE CASCADE,
    etymology     TEXT NOT NULL,
    source        TEXT DEFAULT 'kanjinetworks'
);

-- Vocabulary / compound words (from JMdict)
CREATE TABLE IF NOT EXISTS vocab (
    id          INT PRIMARY KEY,      -- JMdict ent_seq
    word        TEXT NOT NULL,        -- primary kanji form, e.g. 青春
    alt_forms   TEXT[],               -- additional kanji forms
    readings    TEXT[] NOT NULL,      -- hiragana readings, e.g. {せいしゅん}
    meanings    TEXT[] NOT NULL,      -- English glosses
    pos_tags    TEXT[] NOT NULL DEFAULT '{}',
    is_common   BOOLEAN NOT NULL DEFAULT FALSE
);

-- Junction: which kanji characters appear in each vocab word?
CREATE TABLE IF NOT EXISTS vocab_kanji (
    vocab_id    INT REFERENCES vocab(id) ON DELETE CASCADE,
    kanji_char  CHAR(1) NOT NULL,
    PRIMARY KEY (vocab_id, kanji_char)
);

CREATE INDEX IF NOT EXISTS idx_vocab_kanji_char ON vocab_kanji(kanji_char);
CREATE INDEX IF NOT EXISTS idx_vocab_word       ON vocab(word);
CREATE INDEX IF NOT EXISTS idx_vocab_common     ON vocab(is_common) WHERE is_common = TRUE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kanji_jlpt ON kanji(jlpt_level);
CREATE INDEX IF NOT EXISTS idx_kanji_grade ON kanji(grade);
CREATE INDEX IF NOT EXISTS idx_kanji_frequency ON kanji(frequency);
CREATE INDEX IF NOT EXISTS idx_kanji_alive_checked ON kanji(kanjialive_checked);
