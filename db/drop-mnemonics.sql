-- One-off migration: remove the former user-authored mnemonics feature.
-- The mnemonic section is now sourced read-only from kanji_etymology
-- (see db/schema.sql). Safe to run on existing databases.
DROP TABLE IF EXISTS kanji_mnemonics;
