-- Migration: Add user_id to kanji_mnemonics for multi-user support.
-- WARNING: Existing mnemonics are deleted because they cannot be mapped to auth users retroactively.

DELETE FROM kanji_mnemonics;

ALTER TABLE kanji_mnemonics ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE kanji_mnemonics ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kanji_mnemonics_user_id ON kanji_mnemonics(user_id);
CREATE INDEX IF NOT EXISTS idx_kanji_mnemonics_user_literal ON kanji_mnemonics(user_id, kanji_literal);
