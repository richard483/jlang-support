/**
 * One-time import script: parse KRADFILE into kanji_radicals table.
 *
 * Usage:
 *   1. Download KRADFILE from https://www.edrdg.org/krad/kradinf.html
 *      Direct link: https://www.edrdg.org/krad/kradfile.gz
 *      Also get kradfile2.gz for additional kanji.
 *   2. Decompress into data/kradfile and optionally data/kradfile2
 *   3. DATABASE_URL=postgres://... npx tsx scripts/import-kradfile.ts
 *
 * File format (EUC-JP encoded, convert to UTF-8 first if needed):
 *   亜 : 二 口 一
 *   Lines starting with # are comments.
 */

import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

const FILES = ['data/kradfile-utf8', 'data/kradfile2-utf8'];

function parseKradfile(content: string): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		// Format: kanji : rad1 rad2 rad3 ...
		const colonIdx = trimmed.indexOf(':');
		if (colonIdx === -1) continue;

		const kanji = trimmed.slice(0, colonIdx).trim();
		const radicals = trimmed
			.slice(colonIdx + 1)
			.trim()
			.split(/\s+/)
			.filter(Boolean);

		if (kanji && radicals.length > 0) {
			map.set(kanji, radicals);
		}
	}
	return map;
}

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	// Load available kanji from DB to skip entries not in our kanji table
	const client = await pool.connect();
	try {
		const { rows } = await client.query<{ literal: string }>('SELECT literal FROM kanji');
		const knownKanji = new Set(rows.map((r) => r.literal));
		console.log(`Loaded ${knownKanji.size} kanji from DB`);

		// Collect all mappings from available files
		const allMappings = new Map<string, string[]>();
		for (const file of FILES) {
			if (!existsSync(file)) {
				console.log(`Skipping ${file} (not found)`);
				continue;
			}
			console.log(`Reading ${file}...`);
			const content = readFileSync(file, 'utf-8');
			const parsed = parseKradfile(content);
			console.log(`  Parsed ${parsed.size} entries`);
			for (const [k, v] of parsed) allMappings.set(k, v);
		}

		if (allMappings.size === 0) {
			console.error('No KRADFILE data found. Download the files first.');
			process.exit(1);
		}

		await client.query('BEGIN');
		await client.query('DELETE FROM kanji_radicals');

		let inserted = 0;
		for (const [kanji, radicals] of allMappings) {
			if (!knownKanji.has(kanji)) continue;
			for (const radical of radicals) {
				await client.query(
					'INSERT INTO kanji_radicals (kanji_literal, radical) VALUES ($1, $2) ON CONFLICT DO NOTHING',
					[kanji, radical]
				);
			}
			inserted++;
		}

		await client.query('COMMIT');
		console.log(`Done! Imported radicals for ${inserted} kanji.`);
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
