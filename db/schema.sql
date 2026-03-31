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
    svg_content TEXT    -- inline SVG XML content (served via /kanjivg/[file])
);

-- Pre-loaded from KRADFILE
CREATE TABLE IF NOT EXISTS kanji_radicals (
    kanji_literal CHAR(1) REFERENCES kanji(literal) ON DELETE CASCADE,
    radical CHAR(1) NOT NULL,
    PRIMARY KEY (kanji_literal, radical)
);

-- User-authored mnemonics/etymology notes
CREATE TABLE IF NOT EXISTS kanji_mnemonics (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    kanji_literal CHAR(1) REFERENCES kanji(literal) ON DELETE CASCADE,
    mnemonic TEXT NOT NULL,
    etymology TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarked kanji scoped to the authenticated user
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    kanji_literal CHAR(1) REFERENCES kanji(literal) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, kanji_literal)
);

-- Vocabulary / compound words (from JMdict)
CREATE TABLE IF NOT EXISTS vocab (
    id          INT PRIMARY KEY,      -- JMdict ent_seq
    word        TEXT NOT NULL,        -- primary kanji form, e.g. 青春
    alt_forms   TEXT[],               -- additional kanji forms
    readings    TEXT[] NOT NULL,      -- hiragana readings, e.g. {せいしゅん}
    meanings    TEXT[] NOT NULL,      -- English glosses
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
CREATE INDEX IF NOT EXISTS idx_kanji_mnemonics_user_id ON kanji_mnemonics(user_id);
CREATE INDEX IF NOT EXISTS idx_kanji_mnemonics_user_literal ON kanji_mnemonics(user_id, kanji_literal);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
