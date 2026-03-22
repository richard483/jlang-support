import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const literal = body?.literal?.trim();
	const mnemonic = body?.mnemonic?.trim();
	const etymology = body?.etymology?.trim() ?? null;

	if (!literal || literal.length !== 1) error(400, 'Invalid kanji literal');
	if (!mnemonic) error(400, 'Mnemonic is required');

	const { rows } = await db.query(
		`INSERT INTO kanji_mnemonics (kanji_literal, mnemonic, etymology)
		 VALUES ($1, $2, $3)
		 RETURNING id, created_at`,
		[literal, mnemonic, etymology]
	);

	return json(rows[0], { status: 201 });
};

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	if (!id) error(400, 'id is required');

	const { rows } = await db.query(
		'DELETE FROM kanji_mnemonics WHERE id = $1 RETURNING id',
		[id]
	);
	if (rows.length === 0) error(404, 'Mnemonic not found');
	return json({ deleted: true });
};
