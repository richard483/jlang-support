import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const literal = body?.literal?.trim();
	const mnemonic = body?.mnemonic?.trim();
	const etymology = body?.etymology?.trim() ?? null;

	if (!literal || literal.length !== 1) error(400, 'Invalid kanji literal');
	if (!mnemonic) error(400, 'Mnemonic is required');

	const { rows } = await db.query(
		`INSERT INTO kanji_mnemonics (user_id, kanji_literal, mnemonic, etymology)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, created_at`,
		[locals.user.id, literal, mnemonic, etymology]
	);

	return json(rows[0], { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) error(400, 'id is required');

	const { rows } = await db.query(
		'DELETE FROM kanji_mnemonics WHERE id = $1 AND user_id = $2 RETURNING id',
		[id, locals.user.id]
	);
	if (rows.length === 0) error(404, 'Mnemonic not found');
	return json({ deleted: true });
};
