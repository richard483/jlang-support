import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await db.query<{
		radical: string;
		kanji_count: number;
	}>(
		`SELECT radical, COUNT(*)::int AS kanji_count
		 FROM kanji_radicals
		 GROUP BY radical
		 ORDER BY COUNT(*) DESC, radical ASC`
	);

	return json({ radicals: result.rows });
};
