import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const { rows } = await db.query(
		`SELECT b.id, b.kanji_literal, b.notes, b.created_at,
		        k.meanings, k.on_readings, k.kun_readings, k.jlpt_level, k.grade
		 FROM bookmarks b
		 JOIN kanji k ON k.literal = b.kanji_literal
		 ORDER BY b.created_at DESC`
	);
	return json({ bookmarks: rows });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const literal = body?.literal?.trim();
	const notes = body?.notes?.trim() ?? null;

	if (!literal || literal.length !== 1) error(400, 'Invalid kanji literal');

	const { rows } = await db.query(
		`INSERT INTO bookmarks (kanji_literal, notes)
		 VALUES ($1, $2)
		 ON CONFLICT (kanji_literal) DO UPDATE SET notes = EXCLUDED.notes
		 RETURNING id`,
		[literal, notes]
	);

	return json({ id: rows[0].id }, { status: 201 });
};
