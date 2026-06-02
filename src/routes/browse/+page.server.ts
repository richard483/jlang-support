import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

function getSelectedRadicals(url: URL) {
	const rawValues = [
		...url.searchParams.getAll('radical'),
		...url.searchParams
			.getAll('radicals')
			.flatMap((value) => value.split(','))
			.map((value) => value.trim())
	];

	return rawValues.filter((radical, index, all) => {
		return radical.length > 0 && [...radical].length === 1 && all.indexOf(radical) === index;
	});
}

export const load: PageServerLoad = async ({ url }) => {
	const jlpt = url.searchParams.get('jlpt');
	const grade = url.searchParams.get('grade');
	const radicals = getSelectedRadicals(url);
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const pageSize = 60;
	const offset = (page - 1) * pageSize;

	const conditions: string[] = [];
	const values: (string | number | string[])[] = [];
	let i = 1;

	if (jlpt) {
		conditions.push(`jlpt_level = $${i++}`);
		values.push(Number(jlpt));
	}
	if (grade) {
		conditions.push(`grade = $${i++}`);
		values.push(Number(grade));
	}
	if (radicals.length > 0) {
		conditions.push(`literal IN (
			SELECT kanji_literal
			FROM kanji_radicals
			WHERE radical = ANY($${i++})
			GROUP BY kanji_literal
			HAVING COUNT(DISTINCT radical) = $${i++}
		)`);
		values.push(radicals, radicals.length);
	}

	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const [kanjiResult, countResult, radicalsResult] = await Promise.all([
		db.query(
			`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
			 FROM kanji ${where}
			 ORDER BY frequency ASC NULLS LAST, literal
			 LIMIT $${i} OFFSET $${i + 1}`,
			[...values, pageSize, offset]
		),
		db.query(`SELECT COUNT(*) FROM kanji ${where}`, values),
		db.query<{
			radical: string;
			kanji_count: number;
		}>(
			`SELECT radical, COUNT(*)::int AS kanji_count
			 FROM kanji_radicals
			 GROUP BY radical
			 ORDER BY COUNT(*) DESC, radical ASC`
		)
	]);

	return {
		kanji: kanjiResult.rows,
		total: Number(countResult.rows[0].count),
		page,
		pageSize,
		filters: { jlpt, grade, radicals },
		radicalOptions: radicalsResult.rows
	};
};
