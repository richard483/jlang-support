import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

// Unicode range for CJK unified ideographs (kanji)
const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) return json({ results: [] });

	// Extract individual kanji characters from the query (handles 楽しい → ['楽'])
	const kanjiChars = q.match(KANJI_RE) ?? [];

	const { rows } = await db.query(
		`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
		 FROM kanji
		 WHERE literal = ANY($1)
		    OR $2 = ANY(on_readings)
		    OR $2 = ANY(kun_readings)
		    OR EXISTS (
		        SELECT 1 FROM unnest(meanings) m WHERE m ILIKE $3
		    )
		 ORDER BY
		    CASE WHEN literal = ANY($1) THEN 0 ELSE 1 END,
		    frequency ASC NULLS LAST
		 LIMIT 50`,
		[
			kanjiChars.length > 0 ? kanjiChars : [q],
			q,
			`%${q}%`
		]
	);

	return json({ results: rows });
};
