/**
 * One-time batch import of KanjiAlive enrichment into kanji.additional_data.
 *
 * Replaces the old lazy per-request enrichment: KanjiAlive only covers ~1,234
 * kanji, so we fetch them all up front. For each covered kanji we cache examples
 * (with audio), references, radical detail, media and the mnemonic hint, and
 * revalidate stroke count / grade against kanjiapi.dev (keeping a _validation
 * history). The deployed app then needs no API key at runtime.
 *
 * Usage:
 *   KANJIALIVE_API_KEY=... DATABASE_URL=... npx tsx scripts/import-kanjialive.ts
 */

import pg from 'pg';
import {
	buildAdditionalData,
	type KanjiAliveResponse,
	type KanjiApiResponse,
	type CurrentKanji
} from '../src/lib/kanjialive';

const { Pool } = pg;
const HOST = 'kanjialive-api.p.rapidapi.com';
const KA_DATA_CSV =
	'https://raw.githubusercontent.com/kanjialive/kanji-data-media/master/language-data/ka_data.csv';
const KANJIAPI_URL = 'https://kanjiapi.dev/v1/kanji';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
	try {
		const res = await fetch(url, { headers });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

/** The ~1,234 kanji KanjiAlive covers, from its published dataset. */
async function coveredKanji(): Promise<string[]> {
	const res = await fetch(KA_DATA_CSV);
	if (!res.ok) throw new Error(`ka_data.csv -> HTTP ${res.status}`);
	const csv = await res.text();
	const out: string[] = [];
	for (const line of csv.split(/\r?\n/).slice(1)) {
		const k = line.split(',')[0]?.trim(); // kanji is the first column, a single char
		if (k && [...k].length === 1) out.push(k);
	}
	return out;
}

async function main() {
	const apiKey = process.env.KANJIALIVE_API_KEY;
	if (!apiKey) throw new Error('KANJIALIVE_API_KEY is required');

	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const kanji = await coveredKanji();
	console.log(`KanjiAlive covers ${kanji.length} kanji; importing…`);

	const client = await pool.connect();
	let done = 0;
	let updated = 0;
	let corrected = 0;
	try {
		for (const k of kanji) {
			const { rows } = await client.query(
				'SELECT stroke_count, grade, on_readings, kun_readings FROM kanji WHERE literal = $1',
				[k]
			);
			if (rows.length === 0) continue; // not in our DB
			const cur = rows[0] as CurrentKanji;

			const [alive, api] = await Promise.all([
				fetchJson<KanjiAliveResponse>(`https://${HOST}/api/public/kanji/${encodeURIComponent(k)}`, {
					'x-rapidapi-host': HOST,
					'x-rapidapi-key': apiKey
				}),
				fetchJson<KanjiApiResponse>(`${KANJIAPI_URL}/${encodeURIComponent(k)}`)
			]);

			const { additional, corrections } = buildAdditionalData(alive, api, cur);

			const sets: string[] = [];
			const vals: unknown[] = [];
			let p = 1;
			for (const [col, val] of Object.entries(corrections)) {
				sets.push(`${col} = $${p++}`);
				vals.push(val);
			}
			sets.push(`additional_data = $${p++}`);
			vals.push(JSON.stringify(additional));
			sets.push('kanjialive_checked = true');
			sets.push('enriched_at = now()');
			vals.push(k);

			await client.query(`UPDATE kanji SET ${sets.join(', ')} WHERE literal = $${p}`, vals);
			updated++;
			if (Object.keys(corrections).length > 0) corrected++;

			done++;
			if (done % 100 === 0) console.log(`  ${done}/${kanji.length}…`);
			await sleep(60); // be polite to the APIs
		}
		console.log(`Done. Updated ${updated} kanji (${corrected} had data corrections).`);
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
