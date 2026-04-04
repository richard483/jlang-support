import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const selectedRadical = url.searchParams.get('radical') ?? null;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const pageSize = 60;
	const offset = (page - 1) * pageSize;

	const radicalsResult = await db.query(`
		SELECT radical, COUNT(*) as kanji_count
		FROM kanji_radicals
		GROUP BY radical
		ORDER BY radical
	`);

	let kanji: any[] = [];
	let total = 0;

	if (selectedRadical) {
		const [kanjiResult, countResult] = await Promise.all([
			db.query(
				`SELECT k.literal, k.meanings, k.on_readings, k.kun_readings,
				        k.jlpt_level, k.grade, k.stroke_count
				 FROM kanji k
				 JOIN kanji_radicals kr ON kr.kanji_literal = k.literal
				 WHERE kr.radical = $1
				 ORDER BY k.frequency ASC NULLS LAST, k.literal
				 LIMIT $2 OFFSET $3`,
				[selectedRadical, pageSize, offset]
			),
			db.query(
				`SELECT COUNT(*) FROM kanji_radicals WHERE radical = $1`,
				[selectedRadical]
			)
		]);
		kanji = kanjiResult.rows;
		total = Number(countResult.rows[0].count);
	}

	return {
		radicals: radicalsResult.rows as { radical: string; kanji_count: number }[],
		selectedRadical,
		kanji,
		total,
		page,
		pageSize
	};
};
