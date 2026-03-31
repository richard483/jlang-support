import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const { rows } = await db.query(
		'DELETE FROM bookmarks WHERE kanji_literal = $1 AND user_id = $2 RETURNING id',
		[params.id, locals.user.id]
	);
	if (rows.length === 0) error(404, 'Bookmark not found');
	return json({ deleted: true });
};
