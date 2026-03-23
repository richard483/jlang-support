import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) return json({ results: [], vocab: [] });

	const kanjiChars = q.match(KANJI_RE) ?? [];
	const isMultiChar = q.length > 1;

	// For multi-char queries, only match the individual kanji literals (decomposition view),
	// not readings/meanings — those are only relevant for single-char lookups.
	const kanjiWhere = isMultiChar
		? `literal = ANY($1)`
		: `literal = ANY($1)
		    OR $2 = ANY(on_readings)
		    OR $2 = ANY(kun_readings)
		    OR EXISTS (SELECT 1 FROM unnest(meanings) m WHERE m ILIKE $3)`;

	const [kanjiRes, vocabRes] = await Promise.all([
		db.query(
			`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
			 FROM kanji
			 WHERE ${kanjiWhere}
			 ORDER BY
			    CASE WHEN literal = ANY($1) THEN 0 ELSE 1 END,
			    frequency ASC NULLS LAST
			 LIMIT 50`,
			isMultiChar ? [kanjiChars] : [kanjiChars.length > 0 ? kanjiChars : [q], q, `%${q}%`]
		),
		// Vocab search:
		// - multi-char query: match words that contain the full query string
		// - single kanji: match all words that use that kanji
		kanjiChars.length > 0
			? db.query(
					isMultiChar
						? `SELECT v.id, v.word, v.readings, v.meanings, v.is_common
						   FROM vocab v
						   WHERE v.word = $1
						      OR $1 = ANY(v.alt_forms)
						      OR v.word LIKE $2
						   ORDER BY
						      CASE WHEN v.word = $1 THEN 0
						           WHEN $1 = ANY(v.alt_forms) THEN 1
						           ELSE 2 END,
						      v.is_common DESC,
						      LENGTH(v.word) ASC
						   LIMIT 40`
						: `SELECT v.id, v.word, v.readings, v.meanings, v.is_common
						   FROM vocab v
						   WHERE v.id IN (
						       SELECT vocab_id FROM vocab_kanji WHERE kanji_char = ANY($1)
						   )
						   ORDER BY
						      CASE WHEN v.word = $2 THEN 0
						           WHEN $2 = ANY(v.alt_forms) THEN 1
						           ELSE 2 END,
						      v.is_common DESC,
						      LENGTH(v.word) ASC
						   LIMIT 40`,
					isMultiChar ? [q, `%${q}%`] : [kanjiChars, q]
				)
			: Promise.resolve({ rows: [] })
	]);

	return json({ results: kanjiRes.rows, vocab: vocabRes.rows });
};
