import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const { rows } = await db.query('DELETE FROM bookmarks WHERE kanji_literal = $1 RETURNING id', [
		params.id
	]);
	if (rows.length === 0) error(404, 'Bookmark not found');
	return json({ deleted: true });
};
