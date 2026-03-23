import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { rows } = await db.query<{
		literal: string;
		meanings: string[];
		on_readings: string[];
		jlpt_level: number | null;
		stroke_count: number | null;
	}>(
		`SELECT literal, meanings, on_readings, jlpt_level, stroke_count
		 FROM kanji
		 WHERE jlpt_level IS NOT NULL
		   AND meanings IS NOT NULL
		   AND array_length(meanings, 1) > 0
		 ORDER BY RANDOM()
		 LIMIT 8`
	);
	return { featured: rows };
};
