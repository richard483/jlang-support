/**
 * One-time import script: read KanjiVG SVG files and store content in the DB.
 * SVGs are served at runtime via /kanjivg/[file] from the database,
 * so no static files are needed in the deployed image.
 *
 * Usage:
 *   1. Download KanjiVG from https://github.com/KanjiVG/kanjivg/releases
 *      Get kanjivg-<version>-all.zip and extract the "kanji/" folder into data/kanjivg-raw/kanji/
 *   2. DATABASE_URL=postgres://... npx tsx scripts/import-kanjivg.ts
 *
 * KanjiVG file names are Unicode codepoints in hex with leading zeros:
 *   04e00.svg = 一, 0697d.svg = 楽
 *   Files may have variants: 04e00.svg, 04e00-Kaisho.svg, etc.
 * We only import base files (no dash variant suffix).
 */

import { readdirSync, readFileSync } from 'fs';
import { existsSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

const SOURCE_DIR = 'data/kanjivg-raw/kanji';

async function main() {
	if (!existsSync(SOURCE_DIR)) {
		console.error(`Source directory ${SOURCE_DIR} not found. Download KanjiVG first.`);
		process.exit(1);
	}

	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const client = await pool.connect();

	try {
		// Load all kanji literals and their codepoints
		const { rows } = await client.query<{ literal: string }>('SELECT literal FROM kanji');
		const kanjiByCodepoint = new Map<string, string>();
		for (const { literal } of rows) {
			const codepoint = literal.codePointAt(0)!.toString(16).padStart(5, '0');
			kanjiByCodepoint.set(codepoint, literal);
		}
		console.log(`Loaded ${kanjiByCodepoint.size} kanji from DB`);

		// List only base SVG files (no variant suffix like -Kaisho)
		const svgFiles = readdirSync(SOURCE_DIR).filter(
			(f) => f.endsWith('.svg') && !f.includes('-')
		);
		console.log(`Found ${svgFiles.length} base SVG files in ${SOURCE_DIR}`);

		await client.query('BEGIN');
		let processed = 0;
		let updated = 0;

		for (const filename of svgFiles) {
			const codepoint = filename.replace('.svg', '');
			const literal = kanjiByCodepoint.get(codepoint);
			if (!literal) continue;

			const content = readFileSync(`${SOURCE_DIR}/${filename}`, 'utf-8');

			const result = await client.query(
				'UPDATE kanji SET svg_file = $1, svg_content = $2 WHERE literal = $3',
				[filename, content, literal]
			);
			if (result.rowCount && result.rowCount > 0) updated++;
			processed++;

			if (processed % 500 === 0) process.stdout.write(`  ${processed}/${svgFiles.length}\r`);
		}

		await client.query('COMMIT');
		console.log(`\nDone! Stored SVG content for ${updated} kanji in DB.`);
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
