/**
 * One-time import script: parse JMdict XML into vocab + vocab_kanji tables.
 *
 * Usage:
 *   1. Download JMdict_e.gz from https://www.edrdg.org/pub/Nihongo/JMdict_e.gz
 *   2. Decompress: gunzip -k JMdict_e.gz → data/JMdict_e
 *   3. DATABASE_URL=postgres://... npx tsx scripts/import-jmdict.ts
 *
 * Entries with at least one kanji form (k_ele) are imported.
 * Pure-kana entries are imported only if they have common priority tags (ichi1, news1, spec1, gai1).
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
	posTags: string[];
	isCommon: boolean;
	kanjiChars: string[];
}

function extractEntityMap(xml: string) {
	const entities = new Map<string, string>();
	const doctypeMatch = xml.match(/<!DOCTYPE[^[]*\[([\s\S]*?)\]>/m);
	if (!doctypeMatch) {
		return entities;
	}

	const entityRegex = /<!ENTITY\s+(\S+)\s+"([^"]+)">/g;
	let match: RegExpExecArray | null;
	while ((match = entityRegex.exec(doctypeMatch[1])) !== null) {
		entities.set(match[1], match[2]);
	}

	return entities;
}

function resolveEntityReferences(value: string, entityMap: Map<string, string>) {
	return value.replace(/&([\w.-]+);/g, (fullMatch, name) => entityMap.get(name) ?? fullMatch);
}

function getTextValue(
	value:
		| string
		| {
				'#text'?: string;
				'@_xml:lang'?: string;
		  }
		| undefined
) {
	return typeof value === 'string' ? value : value?.['#text'] ?? '';
}

function parseJMdict(xml: string, entityMap: Map<string, string>): VocabEntry[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_',
		isArray: (name) =>
			['entry', 'k_ele', 'r_ele', 'sense', 'gloss', 'ke_pri', 're_pri', 're_restr', 'pos'].includes(name)
	});

	const result = parser.parse(xml);
	const entries: VocabEntry[] = [];

	for (const entry of result?.JMdict?.entry ?? []) {
		const kEles: { keb: string; ke_pri?: string[] }[] = entry.k_ele ?? [];
		const rEles: { reb: string; re_pri?: string[] }[] = entry.r_ele ?? [];

		let word: string;
		let altForms: string[];

		if (kEles.length > 0) {
			word = String(kEles[0].keb);
			altForms = kEles.slice(1).map((k) => String(k.keb));
		} else {
			if (rEles.length === 0) continue;
			word = String(rEles[0].reb);
			altForms = rEles.slice(1).map((r) => String(r.reb));
		}

		const id = Number(entry.ent_seq);
		const readings = rEles.map((r) => String(r.reb));

		// Collect all English glosses across all senses
		const senses: {
			gloss?:
				| { '#text'?: string; '@_xml:lang'?: string }
				| string
				| (string | { '#text'?: string; '@_xml:lang'?: string })[];
			pos?:
				| { '#text'?: string; '@_xml:lang'?: string }
				| string
				| (string | { '#text'?: string; '@_xml:lang'?: string })[];
		}[] =
			entry.sense ?? [];
		const meanings: string[] = [];
		const posTags: string[] = [];
		for (const sense of senses) {
			const glosses = Array.isArray(sense.gloss) ? sense.gloss : sense.gloss ? [sense.gloss] : [];
			for (const g of glosses) {
				const lang = typeof g === 'object' ? g['@_xml:lang'] : undefined;
				if (lang && lang !== 'eng') continue; // skip non-English
				const text = getTextValue(g);
				if (text) meanings.push(text);
			}

			const sensePos = Array.isArray(sense.pos) ? sense.pos : sense.pos ? [sense.pos] : [];
			for (const pos of sensePos) {
				const resolved = resolveEntityReferences(getTextValue(pos), entityMap).trim();
				if (resolved && !posTags.includes(resolved)) {
					posTags.push(resolved);
				}
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

		// For kana-only entries, only keep common ones to avoid importing 120k obscure entries
		if (kEles.length === 0 && !isCommon) continue;

		entries.push({ id, word, altForms, readings, meanings, posTags, isCommon, kanjiChars });
	}

	return entries;
}

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	console.log(`Reading ${DATA_FILE}...`);
	let xml = readFileSync(DATA_FILE, 'utf-8');
	const entityMap = extractEntityMap(xml);

	// JMdict has hundreds of DOCTYPE entity definitions that exceed fast-xml-parser's
	// default entity limit. Strip the entire DOCTYPE block before parsing.
	xml = xml.replace(/<!DOCTYPE[^[]*\[[\s\S]*?\]>/m, '');
	xml = xml.replace(/&([\w.-]+);/g, (fullMatch, name) => entityMap.get(name) ?? fullMatch);

	console.log('Parsing JMdict...');
	const entries = parseJMdict(xml, entityMap);
	console.log(`Parsed ${entries.length} vocab entries with kanji forms`);

	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		await client.query('DELETE FROM vocab_kanji');
		await client.query('DELETE FROM vocab');

		let inserted = 0;
		for (const entry of entries) {
			await client.query(
				`INSERT INTO vocab (id, word, alt_forms, readings, meanings, pos_tags, is_common)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT (id) DO UPDATE SET
				   word = EXCLUDED.word, alt_forms = EXCLUDED.alt_forms,
				   readings = EXCLUDED.readings, meanings = EXCLUDED.meanings,
				   pos_tags = EXCLUDED.pos_tags, is_common = EXCLUDED.is_common`,
				[
					entry.id,
					entry.word,
					entry.altForms,
					entry.readings,
					entry.meanings,
					entry.posTags,
					entry.isCommon
				]
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
