import { error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { literal } = params;
	if (!literal || [...literal].length !== 1) error(400, 'Invalid kanji');

	const [kanjiResult, radicalsResult, mnemonicsResult, bookmarkResult] = await Promise.all([
		db.query('SELECT * FROM kanji WHERE literal = $1', [literal]),
		db.query('SELECT radical FROM kanji_radicals WHERE kanji_literal = $1', [literal]),
		db.query(
			'SELECT id, mnemonic, etymology, created_at FROM kanji_mnemonics WHERE kanji_literal = $1 ORDER BY created_at DESC',
			[literal]
		),
		db.query('SELECT id FROM bookmarks WHERE kanji_literal = $1', [literal])
	]);

	if (kanjiResult.rows.length === 0) error(404, `Kanji "${literal}" not found`);

	return {
		kanji: kanjiResult.rows[0] as {
			literal: string;
			stroke_count: number | null;
			grade: number | null;
			jlpt_level: number | null;
			frequency: number | null;
			meanings: string[];
			on_readings: string[];
			kun_readings: string[];
			nanori: string[];
			radical_number: number | null;
			svg_file: string | null;
		},
		radicals: radicalsResult.rows.map((r) => r.radical as string),
		mnemonics: mnemonicsResult.rows as {
			id: number;
			mnemonic: string;
			etymology: string | null;
			created_at: string;
		}[],
		bookmarked: bookmarkResult.rows.length > 0
	};
};
