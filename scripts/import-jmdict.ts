/**
 * One-time import script: parse JMdict XML into vocab + vocab_kanji tables.
 *
 * Usage:
 *   1. Download JMdict_e.gz from https://www.edrdg.org/pub/Nihongo/JMdict_e.gz
 *   2. Decompress: gunzip -k JMdict_e.gz → data/JMdict_e
 *   3. DATABASE_URL=postgres://... npx tsx scripts/import-jmdict.ts
 *
 * Only entries with at least one kanji form (k_ele) are imported.
 * Pure-kana entries (~120k) are skipped.
 */

import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

const DATA_FILE = 'data/JMdict_e';

const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;
const COMMON_TAGS = new Set(['news1', 'ichi1', 'spec1', 'gai1']);

interface VocabEntry {
	id: number;
	word: string;
	altForms: string[];
	readings: string[];
	meanings: string[];
	isCommon: boolean;
	kanjiChars: string[];
}

function parseJMdict(xml: string): VocabEntry[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_',
		isArray: (name) =>
			['entry', 'k_ele', 'r_ele', 'sense', 'gloss', 'ke_pri', 're_pri', 're_restr'].includes(name)
	});

	const result = parser.parse(xml);
	const entries: VocabEntry[] = [];

	for (const entry of result?.JMdict?.entry ?? []) {
		const kEles: { keb: string; ke_pri?: string[] }[] = entry.k_ele ?? [];
		if (kEles.length === 0) continue; // skip pure-kana entries

		const id = Number(entry.ent_seq);
		const word = String(kEles[0].keb);
		const altForms = kEles.slice(1).map((k) => String(k.keb));

		const rEles: { reb: string; re_pri?: string[] }[] = entry.r_ele ?? [];
		const readings = rEles.map((r) => String(r.reb));

		// Collect all English glosses across all senses
		const senses: { gloss?: { '#text'?: string; '@_xml:lang'?: string } | string | (string | { '#text'?: string; '@_xml:lang'?: string })[] }[] =
			entry.sense ?? [];
		const meanings: string[] = [];
		for (const sense of senses) {
			const glosses = Array.isArray(sense.gloss) ? sense.gloss : sense.gloss ? [sense.gloss] : [];
			for (const g of glosses) {
				const lang = typeof g === 'object' ? g['@_xml:lang'] : undefined;
				if (lang && lang !== 'eng') continue; // skip non-English
				const text = typeof g === 'string' ? g : g['#text'];
				if (text) meanings.push(text);
			}
		}

		// Common if any priority tag is in the common set
		const allPriTags = [
			...(kEles.flatMap((k) => k.ke_pri ?? [])),
			...(rEles.flatMap((r) => r.re_pri ?? []))
		].map(String);
		const isCommon = allPriTags.some((t) => COMMON_TAGS.has(t));

		// Extract unique kanji characters from word + alt forms
		const allText = [word, ...altForms].join('');
		const kanjiChars = [...new Set(allText.match(KANJI_RE) ?? [])];
		if (kanjiChars.length === 0) continue; // no kanji characters at all

		entries.push({ id, word, altForms, readings, meanings, isCommon, kanjiChars });
	}

	return entries;
}

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	console.log(`Reading ${DATA_FILE}...`);
	let xml = readFileSync(DATA_FILE, 'utf-8');

	// JMdict has hundreds of DOCTYPE entity definitions that exceed fast-xml-parser's
	// default entity limit. Strip the entire DOCTYPE block before parsing.
	xml = xml.replace(/<!DOCTYPE[^[]*\[[\s\S]*?\]>/m, '');

	console.log('Parsing JMdict...');
	const entries = parseJMdict(xml);
	console.log(`Parsed ${entries.length} vocab entries with kanji forms`);

	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		await client.query('DELETE FROM vocab_kanji');
		await client.query('DELETE FROM vocab');

		let inserted = 0;
		for (const entry of entries) {
			await client.query(
				`INSERT INTO vocab (id, word, alt_forms, readings, meanings, is_common)
				 VALUES ($1, $2, $3, $4, $5, $6)
				 ON CONFLICT (id) DO UPDATE SET
				   word = EXCLUDED.word, alt_forms = EXCLUDED.alt_forms,
				   readings = EXCLUDED.readings, meanings = EXCLUDED.meanings,
				   is_common = EXCLUDED.is_common`,
				[entry.id, entry.word, entry.altForms, entry.readings, entry.meanings, entry.isCommon]
			);

			for (const ch of entry.kanjiChars) {
				await client.query(
					'INSERT INTO vocab_kanji (vocab_id, kanji_char) VALUES ($1, $2) ON CONFLICT DO NOTHING',
					[entry.id, ch]
				);
			}

			inserted++;
			if (inserted % 2000 === 0) process.stdout.write(`  ${inserted}/${entries.length}\r`);
		}

		await client.query('COMMIT');
		console.log(`\nDone! Imported ${inserted} vocab entries.`);
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
