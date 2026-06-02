/**
 * Extracts per-kanji etymology from the Kanji Networks "Etymological Dictionary
 * of Han/Chinese Characters" PDF into data/kanjinetworks.json.
 *
 * Source PDF (place under data/):
 *   https://github.com/acoomans/kanjinetworks/tree/master/kanjinetworks/data
 *   → etymologicaldictionaryofhanchinesecharacters-*.pdf
 *
 * Pipeline:
 *   1. `pdftotext -layout <pdf> data/kanjinetworks.txt` (poppler-utils). This
 *      script runs it automatically if the .txt is absent and `pdftotext` is on
 *      PATH; otherwise generate the .txt yourself and re-run.
 *   2. Segment the text by headword. The dictionary lists each entry beginning
 *      with a single Han headword character at the start of a line, followed by
 *      its etymology prose until the next headword.
 *
 * ⚠️ This segmentation is HEURISTIC. PDF text extraction is lossy and the exact
 * layout varies, so ALWAYS spot-check data/kanjinetworks.json against a few
 * known entries before running import-kanjinetworks.ts. Tune HEADWORD_RE / the
 * cleanup below to fit the actual extracted text.
 *
 * Usage:
 *   npx tsx scripts/extract-kanjinetworks.ts [path/to/source.pdf]
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const DATA_DIR = 'data';
const TXT_FILE = join(DATA_DIR, 'kanjinetworks.txt');
const OUT_FILE = join(DATA_DIR, 'kanjinetworks.json');

// A Han ideograph (CJK Unified + Extension A + Compatibility).
const HAN = '\\u4E00-\\u9FFF\\u3400-\\u4DBF\\uF900-\\uFAFF';
// A headword line: a single Han character at line start, optionally followed by
// readings / punctuation. Captures the headword in group 1.
const HEADWORD_RE = new RegExp(`^[\\t >]*([${HAN}])(?![${HAN}])`);

function resolvePdf(argPath?: string): string | null {
	if (argPath) return existsSync(argPath) ? argPath : null;
	if (!existsSync(DATA_DIR)) return null;
	const pdf = readdirSync(DATA_DIR).find(
		(f) => /etymolog/i.test(f) && f.toLowerCase().endsWith('.pdf')
	);
	return pdf ? join(DATA_DIR, pdf) : null;
}

function ensureText(pdfArg?: string): string {
	if (existsSync(TXT_FILE)) return readFileSync(TXT_FILE, 'utf-8');

	const pdf = resolvePdf(pdfArg);
	if (!pdf) {
		throw new Error(
			`No ${TXT_FILE} and no source PDF found. Place the etymology PDF in ${DATA_DIR}/ ` +
				`(or pass its path), or pre-generate the text with:\n` +
				`  pdftotext -layout <pdf> ${TXT_FILE}`
		);
	}
	console.log(`Converting ${pdf} → ${TXT_FILE} via pdftotext...`);
	try {
		execFileSync('pdftotext', ['-layout', pdf, TXT_FILE]);
	} catch {
		throw new Error(
			`pdftotext failed or is not installed (apt-get install poppler-utils). ` +
				`Alternatively generate ${TXT_FILE} manually.`
		);
	}
	return readFileSync(TXT_FILE, 'utf-8');
}

/** Collapse whitespace and drop obvious page-furniture lines. */
function cleanup(lines: string[]): string {
	return lines
		.map((l) => l.replace(/\s+/g, ' ').trim())
		.filter((l) => l.length > 0)
		.filter((l) => !/^\d+$/.test(l)) // bare page numbers
		.join('\n')
		.trim();
}

function main() {
	const pdfArg = process.argv[2];
	const text = ensureText(pdfArg);
	const lines = text.split(/\r?\n/);

	const entries: Record<string, string[]> = {};
	let current: string | null = null;

	for (const line of lines) {
		const m = line.match(HEADWORD_RE);
		if (m) {
			current = m[1];
			if (!entries[current]) entries[current] = [];
			// keep the remainder of the headword line (readings/start of prose)
			const rest = line.replace(HEADWORD_RE, '').trim();
			if (rest) entries[current].push(rest);
		} else if (current) {
			entries[current].push(line);
		}
	}

	const out: Record<string, string> = {};
	for (const [literal, body] of Object.entries(entries)) {
		const cleaned = cleanup(body);
		if (cleaned.length > 0) out[literal] = cleaned;
	}

	writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf-8');
	const keys = Object.keys(out);
	console.log(`Wrote ${keys.length} entries → ${OUT_FILE}`);
	console.log('Spot-check sample headwords:', keys.slice(0, 12).join(' '));
	console.log('⚠️  Verify a few entries before importing — see file header.');
}

main();
