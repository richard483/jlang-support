import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) return json({ results: [], vocab: [] });

	const kanjiChars = q.match(KANJI_RE) ?? [];
	const searchChars = kanjiChars.length > 0 ? kanjiChars : [q];

	const [kanjiRes, vocabRes] = await Promise.all([
		// Single kanji search
		db.query(
			`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
			 FROM kanji
			 WHERE literal = ANY($1)
			    OR $2 = ANY(on_readings)
			    OR $2 = ANY(kun_readings)
			    OR EXISTS (SELECT 1 FROM unnest(meanings) m WHERE m ILIKE $3)
			 ORDER BY
			    CASE WHEN literal = ANY($1) THEN 0 ELSE 1 END,
			    frequency ASC NULLS LAST
			 LIMIT 50`,
			[searchChars, q, `%${q}%`]
		),
		// Vocab / compound search (only when query has kanji)
		kanjiChars.length > 0
			? db.query(
					`SELECT DISTINCT v.id, v.word, v.readings, v.meanings, v.is_common
					 FROM vocab v
					 JOIN vocab_kanji vk ON vk.vocab_id = v.id
					 WHERE vk.kanji_char = ANY($1)
					 ORDER BY
					    CASE WHEN v.word = $2 THEN 0
					         WHEN $2 = ANY(v.alt_forms) THEN 1
					         ELSE 2 END,
					    v.is_common DESC,
					    LENGTH(v.word) ASC
					 LIMIT 40`,
					[kanjiChars, q]
				)
			: Promise.resolve({ rows: [] })
	]);

	return json({ results: kanjiRes.rows, vocab: vocabRes.rows });
};
