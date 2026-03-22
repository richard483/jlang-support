import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const jlpt = url.searchParams.get('jlpt');
	const grade = url.searchParams.get('grade');
	const radical = url.searchParams.get('radical');
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const pageSize = 60;
	const offset = (page - 1) * pageSize;

	const conditions: string[] = [];
	const values: (string | number)[] = [];
	let i = 1;

	if (jlpt) {
		conditions.push(`jlpt_level = $${i++}`);
		values.push(Number(jlpt));
	}
	if (grade) {
		conditions.push(`grade = $${i++}`);
		values.push(Number(grade));
	}
	if (radical) {
		conditions.push(`literal IN (SELECT kanji_literal FROM kanji_radicals WHERE radical = $${i++})`);
		values.push(radical);
	}

	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const [kanjiResult, countResult] = await Promise.all([
		db.query(
			`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
			 FROM kanji ${where}
			 ORDER BY frequency ASC NULLS LAST, literal
			 LIMIT $${i} OFFSET $${i + 1}`,
			[...values, pageSize, offset]
		),
		db.query(`SELECT COUNT(*) FROM kanji ${where}`, values)
	]);

	return {
		kanji: kanjiResult.rows,
		total: Number(countResult.rows[0].count),
		page,
		pageSize,
		filters: { jlpt, grade, radical }
	};
};
