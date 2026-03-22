import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { rows } = await db.query(
		`SELECT b.id, b.kanji_literal, b.notes, b.created_at,
		        k.meanings, k.on_readings, k.kun_readings, k.jlpt_level, k.grade, k.stroke_count
		 FROM bookmarks b
		 JOIN kanji k ON k.literal = b.kanji_literal
		 ORDER BY b.created_at DESC`
	);
	return { bookmarks: rows };
};
