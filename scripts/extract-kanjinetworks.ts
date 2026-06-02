/**
 * Extracts per-kanji etymology from the Kanji Networks data into
 * data/kanjinetworks.json — a flat map of { "<kanji>": "<etymology text>" }
 * consumed by scripts/import-kanjinetworks.ts.
 *
 * Source: the gzipped JSON "notes" exports in the acoomans/kanjinetworks repo
 * (https://github.com/acoomans/kanjinetworks/tree/master/kanjinetworks/data),
 * which are the same Kanji Networks etymology (Lawrence J. Howell) served at
 * rtega.be/chmn. Each note's `text` begins with the kanji headword in brackets,
 * e.g. "[水] A depiction of a long, winding flow of water." We key on that
 * headword and keep the remaining prose. Where a kanji appears in more than one
 * source, the most recently updated note wins.
 *
 * No PDF tooling required — the notes are already structured JSON.
 *
 * Usage:
 *   npx tsx scripts/extract-kanjinetworks.ts
 */

import { gunzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SOURCES = [
	'https://raw.githubusercontent.com/acoomans/kanjinetworks/master/kanjinetworks/data/test3.japanese',
	'https://raw.githubusercontent.com/acoomans/kanjinetworks/master/kanjinetworks/data/test4.japanese'
];
const OUT_FILE = 'data/kanjinetworks.json';

// A Han ideograph (CJK Unified + Extension A + Compatibility).
const HAN = /[一-鿿㐀-䶿豈-﫿]/;
// Leading "[headword] body" — captures the bracketed headword and the prose.
const HEADWORD = /^\s*\[([^\]]+)\]\s*([\s\S]*)$/;

interface Note {
	text?: string;
	updatedAt?: string;
	id?: string;
}

async function fetchNotes(url: string): Promise<Note[]> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
	const buf = Buffer.from(await res.arrayBuffer());
	const parsed = JSON.parse(gunzipSync(buf).toString('utf-8')) as {
		notes: Record<string, Note> | Note[];
	};
	const { notes } = parsed;
	return Array.isArray(notes) ? notes : Object.entries(notes).map(([id, n]) => ({ id, ...n }));
}

async function main() {
	const all: Note[] = [];
	for (const url of SOURCES) {
		const notes = await fetchNotes(url);
		console.log(`Fetched ${notes.length} notes from ${url}`);
		all.push(...notes);
	}

	const best = new Map<string, { text: string; updatedAt: string }>();
	let skipped = 0;
	for (const n of all) {
		const t = (n.text ?? '').trim();
		const m = HEADWORD.exec(t);
		if (!m) {
			skipped++;
			continue;
		}
		let head = m[1].trim();
		if ([...head].length !== 1 || !HAN.test(head)) {
			const k = [...head].find((c) => HAN.test(c));
			if (!k) {
				skipped++;
				continue;
			}
			head = k;
		}
		const body = m[2].replace(/\s+/g, ' ').trim();
		if (!body) {
			skipped++;
			continue;
		}
		const upd = n.updatedAt ?? '';
		const prev = best.get(head);
		if (!prev || upd > prev.updatedAt) best.set(head, { text: body, updatedAt: upd });
	}

	const out: Record<string, string> = {};
	for (const [k, v] of best) out[k] = v.text;

	writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf-8');
	console.log(`Wrote ${Object.keys(out).length} unique kanji → ${OUT_FILE} (${skipped} notes skipped)`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
