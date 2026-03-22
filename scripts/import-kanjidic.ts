/**
 * One-time import script: parse KanjiDic2 XML into PostgreSQL.
 *
 * Usage:
 *   1. Download kanjidic2.xml from https://www.edrdg.org/kanjidic/kanjidic2.xml.gz
 *   2. Decompress into data/kanjidic2.xml
 *   3. DATABASE_URL=postgres://... npx tsx scripts/import-kanjidic.ts
 */

import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

const DATA_FILE = 'data/kanjidic2.xml';

interface KanjiEntry {
	literal: string;
	strokeCount: number | null;
	grade: number | null;
	jlptLevel: number | null;
	frequency: number | null;
	meanings: string[];
	onReadings: string[];
	kunReadings: string[];
	nanori: string[];
	radicalNumber: number | null;
}

function parseKanjiDic(xmlContent: string): KanjiEntry[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_',
		isArray: (name) =>
			['character', 'reading', 'meaning', 'rad_value', 'misc', 'nanori'].includes(name)
	});

	const result = parser.parse(xmlContent);
	const characters = result?.kanjidic2?.character ?? [];
	const entries: KanjiEntry[] = [];

	for (const char of characters) {
		const literal = char.literal ?? '';
		if (!literal) continue;

		// Stroke count
		const strokeCount = char.misc?.stroke_count ?? null;

		// Grade (1-10)
		const grade = char.misc?.grade ?? null;

		// JLPT level
		const jlptLevel = char.misc?.jlpt ?? null;

		// Frequency rank
		const frequency = char.misc?.freq ?? null;

		// Radical number (classical)
		const radValues = char.radical?.rad_value ?? [];
		const classicalRad = Array.isArray(radValues)
			? radValues.find((r: { '@_rad_type': string }) => r['@_rad_type'] === 'classical')
			: null;
		const radicalNumber = classicalRad ? Number(classicalRad['#text'] ?? classicalRad) : null;

		// Readings and meanings
		const readings: { '@_r_type': string; '#text': string }[] =
			char.reading_meaning?.rmgroup?.reading ?? [];
		const meaningRaw: { '@_m_lang'?: string; '#text'?: string; [k: string]: unknown }[] =
			char.reading_meaning?.rmgroup?.meaning ?? [];
		const nanori: string[] = char.reading_meaning?.nanori ?? [];

		const onReadings = readings
			.filter((r) => r['@_r_type'] === 'ja_on')
			.map((r) => String(r['#text'] ?? r));

		const kunReadings = readings
			.filter((r) => r['@_r_type'] === 'ja_kun')
			.map((r) => String(r['#text'] ?? r));

		// English meanings only (no @_m_lang attribute = English)
		const meanings = meaningRaw
			.filter((m) => m['@_m_lang'] === undefined)
			.map((m) => String(m['#text'] ?? m));

		const nanoriList = Array.isArray(nanori) ? nanori.map(String) : [String(nanori)];

		entries.push({
			literal,
			strokeCount: strokeCount ? Number(strokeCount) : null,
			grade: grade ? Number(grade) : null,
			jlptLevel: jlptLevel ? Number(jlptLevel) : null,
			frequency: frequency ? Number(frequency) : null,
			meanings,
			onReadings,
			kunReadings,
			nanori: nanoriList,
			radicalNumber
		});
	}

	return entries;
}

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	console.log(`Reading ${DATA_FILE}...`);
	const xml = readFileSync(DATA_FILE, 'utf-8');

	console.log('Parsing KanjiDic2 XML...');
	const entries = parseKanjiDic(xml);
	console.log(`Parsed ${entries.length} kanji entries`);

	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		let inserted = 0;
		for (const entry of entries) {
			await client.query(
				`INSERT INTO kanji
					(literal, stroke_count, grade, jlpt_level, frequency, meanings, on_readings, kun_readings, nanori, radical_number)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
				 ON CONFLICT (literal) DO UPDATE SET
					stroke_count = EXCLUDED.stroke_count,
					grade = EXCLUDED.grade,
					jlpt_level = EXCLUDED.jlpt_level,
					frequency = EXCLUDED.frequency,
					meanings = EXCLUDED.meanings,
					on_readings = EXCLUDED.on_readings,
					kun_readings = EXCLUDED.kun_readings,
					nanori = EXCLUDED.nanori,
					radical_number = EXCLUDED.radical_number`,
				[
					entry.literal,
					entry.strokeCount,
					entry.grade,
					entry.jlptLevel,
					entry.frequency,
					entry.meanings,
					entry.onReadings,
					entry.kunReadings,
					entry.nanori,
					entry.radicalNumber
				]
			);
			inserted++;
			if (inserted % 1000 === 0) process.stdout.write(`  ${inserted}/${entries.length}\r`);
		}

		await client.query('COMMIT');
		console.log(`\nDone! Imported ${inserted} kanji.`);
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
