import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) return json({ results: [] });

	// Match by kanji literal, meaning (case-insensitive), or reading (on/kun)
	const { rows } = await db.query(
		`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
		 FROM kanji
		 WHERE literal = $1
		    OR $1 = ANY(on_readings)
		    OR $1 = ANY(kun_readings)
		    OR EXISTS (
		        SELECT 1 FROM unnest(meanings) m WHERE m ILIKE $2
		    )
		 ORDER BY
		    CASE WHEN literal = $1 THEN 0 ELSE 1 END,
		    frequency ASC NULLS LAST
		 LIMIT 50`,
		[q, `%${q}%`]
	);

	return json({ results: rows });
};
