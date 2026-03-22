/**
 * One-time import script: copy KanjiVG SVG files to static/kanjivg/ and
 * update the kanji table svg_file column.
 *
 * Usage:
 *   1. Download KanjiVG from https://github.com/KanjiVG/kanjivg/releases
 *      Get kanjivg-<version>.zip and extract the "kanji/" folder into data/kanjivg/
 *   2. DATABASE_URL=postgres://... npx tsx scripts/import-kanjivg.ts
 *
 * KanjiVG file names are Unicode codepoints in hex with leading zeros:
 *   04e2c.svg = 一 (U+4E2C... actually 4e00 = 一)
 *   Files may have variants: 04e00.svg, 04e00-Kaisho.svg, etc.
 * We only import the base files (no dash variant suffix).
 */

import { readdirSync, copyFileSync, mkdirSync } from 'fs';
import { existsSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

const SOURCE_DIR = 'data/kanjivg-raw/kanji';
const DEST_DIR = 'static/kanjivg';

async function main() {
	if (!existsSync(SOURCE_DIR)) {
		console.error(`Source directory ${SOURCE_DIR} not found. Download KanjiVG first.`);
		process.exit(1);
	}

	mkdirSync(DEST_DIR, { recursive: true });

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

		// List SVG files — only base files (no variant suffix like -Kaisho)
		const svgFiles = readdirSync(SOURCE_DIR).filter(
			(f) => f.endsWith('.svg') && !f.includes('-')
		);
		console.log(`Found ${svgFiles.length} base SVG files in ${SOURCE_DIR}`);

		await client.query('BEGIN');
		let copied = 0;
		let updated = 0;

		for (const filename of svgFiles) {
			const codepoint = filename.replace('.svg', '');
			const literal = kanjiByCodepoint.get(codepoint);
			if (!literal) continue;

			// Copy to static/
			copyFileSync(`${SOURCE_DIR}/${filename}`, `${DEST_DIR}/${filename}`);
			copied++;

			// Update DB
			const result = await client.query(
				'UPDATE kanji SET svg_file = $1 WHERE literal = $2',
				[filename, literal]
			);
			if (result.rowCount && result.rowCount > 0) updated++;

			if (copied % 500 === 0) process.stdout.write(`  ${copied}/${svgFiles.length}\r`);
		}

		await client.query('COMMIT');
		console.log(`\nCopied ${copied} SVGs, updated ${updated} DB rows.`);
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
