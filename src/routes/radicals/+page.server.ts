import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const radicalsParam = url.searchParams.get('radicals') ?? '';
	const rawRadicals = radicalsParam.split(',').map(r => r.trim()).filter(r => r.length === 1);
	const selectedRadicals = [...new Set(rawRadicals)];

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
	let availableRadicals: string[] | null = null;

	if (selectedRadicals.length > 0) {
		const matchingKanjiSubquery = `
			SELECT kanji_literal
			FROM kanji_radicals
			WHERE radical = ANY($1)
			GROUP BY kanji_literal
			HAVING COUNT(DISTINCT radical) = $2
		`;

		const [kanjiResult, countResult, availableResult] = await Promise.all([
			db.query(
				`SELECT k.literal, k.meanings, k.on_readings, k.kun_readings,
				        k.jlpt_level, k.grade, k.stroke_count
				 FROM kanji k
				 WHERE k.literal IN (${matchingKanjiSubquery})
				 ORDER BY k.frequency ASC NULLS LAST, k.literal
				 LIMIT $3 OFFSET $4`,
				[selectedRadicals, selectedRadicals.length, pageSize, offset]
			),
			db.query(
				`SELECT COUNT(*) FROM (${matchingKanjiSubquery}) sub`,
				[selectedRadicals, selectedRadicals.length]
			),
			db.query(
				`SELECT DISTINCT kr2.radical
				 FROM kanji_radicals kr2
				 WHERE kr2.kanji_literal IN (${matchingKanjiSubquery})`,
				[selectedRadicals, selectedRadicals.length]
			)
		]);

		kanji = kanjiResult.rows;
		total = Number(countResult.rows[0].count);

		const availSet = new Set(availableResult.rows.map((r: any) => r.radical));
		for (const r of selectedRadicals) {
			availSet.add(r);
		}
		availableRadicals = [...availSet];
	}

	return {
		radicals: radicalsResult.rows as { radical: string; kanji_count: number }[],
		selectedRadicals,
		availableRadicals,
		kanji,
		total,
		page,
		pageSize
	};
};
