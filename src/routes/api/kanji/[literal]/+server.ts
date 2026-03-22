import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { literal } = params;
	if (!literal || literal.length !== 1) error(400, 'Invalid kanji literal');

	const [kanjiResult, radicalsResult, mnemonicsResult, bookmarkResult] = await Promise.all([
		db.query('SELECT * FROM kanji WHERE literal = $1', [literal]),
		db.query('SELECT radical FROM kanji_radicals WHERE kanji_literal = $1', [literal]),
		db.query(
			'SELECT id, mnemonic, etymology, created_at FROM kanji_mnemonics WHERE kanji_literal = $1 ORDER BY created_at DESC',
			[literal]
		),
		db.query('SELECT id FROM bookmarks WHERE kanji_literal = $1', [literal])
	]);

	if (kanjiResult.rows.length === 0) error(404, 'Kanji not found');

	return json({
		kanji: kanjiResult.rows[0],
		radicals: radicalsResult.rows.map((r) => r.radical),
		mnemonics: mnemonicsResult.rows,
		bookmarked: bookmarkResult.rows.length > 0
	});
};
