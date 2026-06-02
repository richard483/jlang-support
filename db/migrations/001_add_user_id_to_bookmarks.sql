-- Migration: Add user_id to bookmarks for multi-user support.
-- WARNING: Existing bookmarks are deleted because they cannot be mapped to auth users retroactively.

DELETE FROM bookmarks;

ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_kanji_literal_key;
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE bookmarks ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
	ALTER TABLE bookmarks
		ADD CONSTRAINT bookmarks_user_kanji_unique UNIQUE (user_id, kanji_literal);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
