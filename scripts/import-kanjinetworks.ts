/**
 * Imports kanji etymology into the kanji_etymology table.
 *
 * Reads data/kanjinetworks.json — a flat map of { "<kanji>": "<etymology text>" }
 * produced by scripts/extract-kanjinetworks.ts — and upserts each entry. Only
 * kanji that already exist in the `kanji` table are imported (FK constraint);
 * anything else is skipped and counted.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/import-kanjinetworks.ts
 */

import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;
const DATA_FILE = 'data/kanjinetworks.json';
const SOURCE = 'kanjinetworks';

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	console.log(`Reading ${DATA_FILE}...`);
	const data: Record<string, string> = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
	const entries = Object.entries(data)
		.map(([literal, etymology]) => ({ literal, etymology: (etymology ?? '').trim() }))
		.filter((e) => [...e.literal].length === 1 && e.etymology.length > 0);

	console.log(`Found ${entries.length} usable etymology entries`);

	const client = await pool.connect();
	try {
		// Restrict to kanji we actually have, to respect the FK.
		const { rows: known } = await client.query('SELECT literal FROM kanji');
		const knownSet = new Set(known.map((r) => r.literal as string));

		await client.query('BEGIN');
		let imported = 0;
		let skipped = 0;
		for (const { literal, etymology } of entries) {
			if (!knownSet.has(literal)) {
				skipped++;
				continue;
			}
			await client.query(
				`INSERT INTO kanji_etymology (kanji_literal, etymology, source)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (kanji_literal)
				 DO UPDATE SET etymology = EXCLUDED.etymology, source = EXCLUDED.source`,
				[literal, etymology, SOURCE]
			);
			imported++;
		}
		await client.query('COMMIT');
		console.log(`Imported/updated ${imported} etymology entries (${skipped} skipped — no matching kanji).`);
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
