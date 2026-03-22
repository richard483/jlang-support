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
    svg_file TEXT       -- filename in /static/kanjivg/, e.g. "04e2c.svg"
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
    kanji_literal CHAR(1) REFERENCES kanji(literal) ON DELETE CASCADE,
    mnemonic TEXT NOT NULL,
    etymology TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarked kanji (single-user for now, no auth)
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kanji_literal CHAR(1) REFERENCES kanji(literal) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kanji_literal)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kanji_jlpt ON kanji(jlpt_level);
CREATE INDEX IF NOT EXISTS idx_kanji_grade ON kanji(grade);
CREATE INDEX IF NOT EXISTS idx_kanji_frequency ON kanji(frequency);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);
