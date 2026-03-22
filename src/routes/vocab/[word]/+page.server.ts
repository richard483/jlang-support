import { error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

export const load: PageServerLoad = async ({ params }) => {
	const word = params.word;
	if (!word || word.length > 20) error(400, 'Invalid word');

	const vocabResult = await db.query(
		'SELECT * FROM vocab WHERE word = $1 OR $1 = ANY(alt_forms) LIMIT 1',
		[word]
	);
	if (vocabResult.rows.length === 0) error(404, `Word "${word}" not found`);

	const vocab = vocabResult.rows[0] as {
		id: number;
		word: string;
		alt_forms: string[];
		readings: string[];
		meanings: string[];
		is_common: boolean;
	};

	// Load kanji detail for each character in the word
	const kanjiChars = word.match(KANJI_RE) ?? [];
	const kanjiResult =
		kanjiChars.length > 0
			? await db.query(
					'SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count, svg_file FROM kanji WHERE literal = ANY($1)',
					[kanjiChars]
				)
			: { rows: [] };

	// Preserve character order
	const kanjiMap = new Map(kanjiResult.rows.map((r) => [r.literal, r]));
	const kanjiList = kanjiChars.map((c) => kanjiMap.get(c)).filter(Boolean);

	return { vocab, kanjiList };
};
