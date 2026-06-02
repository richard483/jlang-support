/**
 * Lazy, idempotent kanji enrichment + revalidation.
 *
 * On the first view of a kanji we look it up against external sources, correct
 * any wrong scalar data we hold (stroke count, grade), cache usage examples /
 * audio / references, and flip `kanjialive_checked` so we never look it up again
 * — even when the kanji isn't covered.
 *
 * Sources:
 *   - KanjiAlive (RapidAPI, gated behind KANJIALIVE_API_KEY): examples, audio,
 *     radical detail, references. Only ~1,235 kanji are covered.
 *   - kanjiapi.dev (free, no key, ~13k kanji): stroke_count / grade / readings
 *     cross-validation. Same KanjiDic lineage as our data, so formats match.
 *
 * Enrichment must NEVER break page load — callers wrap this in try/catch, and we
 * also swallow our own network errors here.
 */
import db from './db';

const KANJIALIVE_HOST = 'kanjialive-api.p.rapidapi.com';
const KANJIALIVE_URL = `https://${KANJIALIVE_HOST}/api/public/kanji`;
const KANJIAPI_URL = 'https://kanjiapi.dev/v1/kanji';
const FETCH_TIMEOUT_MS = 6000;

/** A single field that was found to disagree with an external source. */
export interface ValidationEntry {
	field: string;
	old: unknown;
	new: unknown;
	source: string;
	corrected: boolean; // did we overwrite our DB value?
	at: string;
}

/** Shape of kanji.additional_data (JSONB). */
export interface KanjiAdditionalData {
	kanjialive?: {
		covered: boolean;
		references?: { grade?: number | null; kodansha?: string; classic_nelson?: string };
		radical?: unknown;
		media?: { poster?: string; mp4?: string; webm?: string };
		examples?: {
			japanese: string;
			meaning: string;
			audio: { mp3?: string; ogg?: string; aac?: string; opus?: string };
		}[];
		fetched_at: string;
	};
	_validation?: ValidationEntry[];
}

// In-process guard so concurrent loads of the same kanji don't double-fetch.
const inFlight = new Set<string>();

interface KanjiAliveResponse {
	kanji?: {
		character?: string;
		// KanjiAlive returns strokes as an object { count, timings, images }
		strokes?: { count?: number };
		video?: { poster?: string; mp4?: string; webm?: string };
	};
	radical?: unknown;
	references?: { grade?: number; kodansha?: string; classic_nelson?: string };
	examples?: {
		japanese?: string;
		meaning?: { english?: string };
		audio?: { mp3?: string; ogg?: string; aac?: string; opus?: string };
	}[];
	error?: string;
}

interface KanjiApiResponse {
	kanji?: string;
	grade?: number | null;
	stroke_count?: number;
	on_readings?: string[];
	kun_readings?: string[];
}

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, { headers, signal: ctrl.signal });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

function sameSet(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
	const sa = new Set(a ?? []);
	const sb = new Set(b ?? []);
	if (sa.size !== sb.size) return false;
	for (const x of sa) if (!sb.has(x)) return false;
	return true;
}

/**
 * Enrich a single kanji. No-op if already checked, or if no API key is set
 * (dormant mode — the flow is fully built but never reaches out until a key
 * is provided, and nothing is written to the DB in that case).
 */
export async function enrichKanji(literal: string): Promise<void> {
	if (!literal || [...literal].length !== 1) return;

	const apiKey = process.env.KANJIALIVE_API_KEY;
	// Dormant mode: without a key there is no point looking anything up. We do
	// NOT flip the flag, so enrichment runs for real once a key is added.
	if (!apiKey) return;

	if (inFlight.has(literal)) return;
	inFlight.add(literal);
	try {
		const { rows } = await db.query(
			'SELECT stroke_count, grade, on_readings, kun_readings, kanjialive_checked FROM kanji WHERE literal = $1',
			[literal]
		);
		if (rows.length === 0) return; // unknown kanji — nothing to enrich
		const cur = rows[0] as {
			stroke_count: number | null;
			grade: number | null;
			on_readings: string[] | null;
			kun_readings: string[] | null;
			kanjialive_checked: boolean;
		};
		if (cur.kanjialive_checked) return; // already done — the once-ever guarantee

		const [alive, api] = await Promise.all([
			fetchJson<KanjiAliveResponse>(`${KANJIALIVE_URL}/${encodeURIComponent(literal)}`, {
				'X-RapidAPI-Key': apiKey,
				'X-RapidAPI-Host': KANJIALIVE_HOST
			}),
			fetchJson<KanjiApiResponse>(`${KANJIAPI_URL}/${encodeURIComponent(literal)}`)
		]);

		const covered = !!(alive && alive.kanji && !alive.error);
		const validation: ValidationEntry[] = [];
		const now = new Date().toISOString();

		// ── Scalar revalidation (stroke_count, grade): correct, keep history ──
		const sets: string[] = [];
		const vals: unknown[] = [];
		let p = 1;
		const setCol = (col: string, value: unknown) => {
			sets.push(`${col} = $${p++}`);
			vals.push(value);
		};

		const aliveStrokes = alive?.kanji?.strokes?.count ?? null;
		const apiStrokes = api?.stroke_count ?? null;
		// kanjiapi.dev has full coverage; KanjiAlive corroborates when present.
		const authStrokes = apiStrokes ?? aliveStrokes;
		if (authStrokes != null && authStrokes !== cur.stroke_count) {
			validation.push({
				field: 'stroke_count',
				old: cur.stroke_count,
				new: authStrokes,
				source: apiStrokes != null ? 'kanjiapi.dev' : 'kanjialive',
				corrected: true,
				at: now
			});
			setCol('stroke_count', authStrokes);
		}

		const authGrade = api?.grade ?? alive?.references?.grade ?? null;
		if (authGrade != null && authGrade !== cur.grade) {
			validation.push({
				field: 'grade',
				old: cur.grade,
				new: authGrade,
				source: api?.grade != null ? 'kanjiapi.dev' : 'kanjialive',
				corrected: true,
				at: now
			});
			setCol('grade', authGrade);
		}

		// ── Readings: non-destructive. Fill if empty, else only flag a mismatch.
		// (Readings are format-sensitive and already KanjiDic-derived, so we don't
		// overwrite good data — we surface the discrepancy for manual review.)
		const checkReadings = (col: 'on_readings' | 'kun_readings', apiVal?: string[]) => {
			if (!apiVal || apiVal.length === 0) return;
			const ours = cur[col];
			if (sameSet(ours, apiVal)) return;
			const empty = !ours || ours.length === 0;
			validation.push({
				field: col,
				old: ours,
				new: apiVal,
				source: 'kanjiapi.dev',
				corrected: empty,
				at: now
			});
			if (empty) setCol(col, apiVal);
		};
		checkReadings('on_readings', api?.on_readings);
		checkReadings('kun_readings', api?.kun_readings);

		// ── Build additional_data payload ──
		const additional: KanjiAdditionalData = {
			kanjialive: {
				covered,
				fetched_at: now,
				...(covered
					? {
							references: alive!.references,
							radical: alive!.radical,
							media: alive!.kanji?.video,
							examples: (alive!.examples ?? []).map((ex) => ({
								japanese: ex.japanese ?? '',
								meaning: ex.meaning?.english ?? '',
								audio: {
									mp3: ex.audio?.mp3,
									ogg: ex.audio?.ogg,
									aac: ex.audio?.aac,
									opus: ex.audio?.opus
								}
							}))
						}
					: {})
			}
		};
		if (validation.length > 0) additional._validation = validation;

		// Always set the flag + payload so we never re-hit, covered or not.
		setCol('additional_data', JSON.stringify(additional));
		setCol('kanjialive_checked', true);
		setCol('enriched_at', now);

		vals.push(literal);
		await db.query(`UPDATE kanji SET ${sets.join(', ')} WHERE literal = $${p}`, vals);
	} finally {
		inFlight.delete(literal);
	}
}
