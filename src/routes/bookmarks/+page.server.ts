import { redirect } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const loginUrl = new URL('/login', url);
		loginUrl.searchParams.set('redirectTo', '/bookmarks');
		redirect(303, loginUrl.pathname + loginUrl.search);
	}

	const { rows } = await db.query(
		`SELECT b.id, b.kanji_literal, b.notes, b.created_at,
		        k.meanings, k.on_readings, k.kun_readings, k.jlpt_level, k.grade, k.stroke_count
		 FROM bookmarks b
		 JOIN kanji k ON k.literal = b.kanji_literal
		 WHERE b.user_id = $1
		 ORDER BY b.created_at DESC`
		,
		[locals.user.id]
	);
	return { bookmarks: rows };
};
