import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const { rows } = await db.query(
		`SELECT b.id, b.kanji_literal, b.notes, b.created_at,
		        k.meanings, k.on_readings, k.kun_readings, k.jlpt_level, k.grade
		 FROM bookmarks b
		 JOIN kanji k ON k.literal = b.kanji_literal
		 WHERE b.user_id = $1
		 ORDER BY b.created_at DESC`
		,
		[locals.user.id]
	);
	return json({ bookmarks: rows });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const literal = body?.literal?.trim();
	const notes = body?.notes?.trim() ?? null;

	if (!literal || literal.length !== 1) error(400, 'Invalid kanji literal');

	const { rows } = await db.query(
		`INSERT INTO bookmarks (user_id, kanji_literal, notes)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id, kanji_literal) DO UPDATE SET notes = EXCLUDED.notes
		 RETURNING id`,
		[locals.user.id, literal, notes]
	);

	return json({ id: rows[0].id }, { status: 201 });
};
