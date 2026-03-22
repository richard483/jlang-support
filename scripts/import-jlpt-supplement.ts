/**
 * Supplements JLPT data using davidluzgouveia/kanji-data JSON.
 * KanjiDic2 uses an old 4-level scale with no N3; this fills the gap.
 *
 * Usage:
 *   1. curl -L https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json \
 *        -o data/kanji-jlpt.json
 *   2. DATABASE_URL=postgres://... npx tsx scripts/import-jlpt-supplement.ts
 */

import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;
const DATA_FILE = 'data/kanji-jlpt.json';

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	console.log(`Reading ${DATA_FILE}...`);
	const data: Record<string, { jlpt_new?: number }> = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));

	const entries = Object.entries(data)
		.filter(([, v]) => v.jlpt_new != null)
		.map(([literal, v]) => ({ literal, jlptLevel: v.jlpt_new as number }));

	console.log(`Found ${entries.length} kanji with jlpt_new data`);

	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		let updated = 0;
		for (const { literal, jlptLevel } of entries) {
			const result = await client.query(
				'UPDATE kanji SET jlpt_level = $1 WHERE literal = $2',
				[jlptLevel, literal]
			);
			if (result.rowCount && result.rowCount > 0) updated++;
		}

		await client.query('COMMIT');
		console.log(`Updated JLPT level for ${updated} kanji.`);

		// Show final distribution
		const { rows } = await client.query(
			'SELECT jlpt_level, COUNT(*) FROM kanji WHERE jlpt_level IS NOT NULL GROUP BY jlpt_level ORDER BY jlpt_level'
		);
		console.log('JLPT distribution after update:');
		for (const r of rows) console.log(`  N${r.jlpt_level}: ${r.count}`);
	} catch (e) {
		await client.query('ROLLBACK');
		throw e;
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
