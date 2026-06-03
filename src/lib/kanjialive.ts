/**
 * Shared KanjiAlive enrichment types + payload builder.
 *
 * Kanji are enriched in a one-time batch (scripts/import-kanjialive.ts), not
 * lazily at request time. This module holds the response shapes, the
 * `additional_data` JSONB shape rendered by the kanji page, and the pure
 * `buildAdditionalData()` that turns an API response into the stored payload +
 * the scalar corrections (stroke count / grade) to apply, keeping a validation
 * history. No DB or server-only imports, so it's safe to import anywhere.
 *
 * Cross-validation uses kanjiapi.dev (free, ~13k kanji, same KanjiDic lineage).
 */

/** A single field that disagreed with an external source. */
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
		mnemonic?: string; // KanjiAlive mn_hint (may contain <span class='note'> markup)
		examples?: {
			japanese: string;
			meaning: string;
			audio: { mp3?: string; ogg?: string; aac?: string; opus?: string };
		}[];
		fetched_at: string;
	};
	_validation?: ValidationEntry[];
}

/** KanjiAlive `/api/public/kanji/:character` response (subset we use). */
export interface KanjiAliveResponse {
	kanji?: {
		character?: string;
		// KanjiAlive returns strokes as an object { count, timings, images }
		strokes?: { count?: number };
		video?: { poster?: string; mp4?: string; webm?: string };
	};
	radical?: unknown;
	references?: { grade?: number; kodansha?: string; classic_nelson?: string };
	mn_hint?: string;
	examples?: {
		japanese?: string;
		meaning?: { english?: string };
		audio?: { mp3?: string; ogg?: string; aac?: string; opus?: string };
	}[];
	error?: string;
}

/** kanjiapi.dev `/v1/kanji/:character` response (subset we use). */
export interface KanjiApiResponse {
	kanji?: string;
	grade?: number | null;
	stroke_count?: number;
	on_readings?: string[];
	kun_readings?: string[];
}

/** Our current DB values, used to detect corrections. */
export interface CurrentKanji {
	stroke_count: number | null;
	grade: number | null;
	on_readings: string[] | null;
	kun_readings: string[] | null;
}

export interface BuildResult {
	additional: KanjiAdditionalData;
	/** column -> new value, to apply via UPDATE (stroke_count / grade / readings) */
	corrections: Record<string, unknown>;
}

function sameSet(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
	const sa = new Set(a ?? []);
	const sb = new Set(b ?? []);
	if (sa.size !== sb.size) return false;
	for (const x of sa) if (!sb.has(x)) return false;
	return true;
}

/**
 * Build the additional_data payload + scalar corrections from external sources.
 * `alive`/`api` may be null (network failure / not covered). Pure — no I/O.
 */
export function buildAdditionalData(
	alive: KanjiAliveResponse | null,
	api: KanjiApiResponse | null,
	cur: CurrentKanji,
	now: string = new Date().toISOString()
): BuildResult {
	const covered = !!(alive && alive.kanji && !alive.error);
	const validation: ValidationEntry[] = [];
	const corrections: Record<string, unknown> = {};

	// ── Scalar revalidation (stroke_count, grade): correct, keep history ──
	const aliveStrokes = alive?.kanji?.strokes?.count ?? null;
	const apiStrokes = api?.stroke_count ?? null;
	const authStrokes = apiStrokes ?? aliveStrokes; // kanjiapi.dev has full coverage
	if (authStrokes != null && authStrokes !== cur.stroke_count) {
		validation.push({
			field: 'stroke_count',
			old: cur.stroke_count,
			new: authStrokes,
			source: apiStrokes != null ? 'kanjiapi.dev' : 'kanjialive',
			corrected: true,
			at: now
		});
		corrections.stroke_count = authStrokes;
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
		corrections.grade = authGrade;
	}

	// ── Readings: non-destructive. Fill if empty, else only flag a mismatch. ──
	const checkReadings = (col: 'on_readings' | 'kun_readings', apiVal?: string[]) => {
		if (!apiVal || apiVal.length === 0) return;
		const ours = cur[col];
		if (sameSet(ours, apiVal)) return;
		const empty = !ours || ours.length === 0;
		validation.push({ field: col, old: ours, new: apiVal, source: 'kanjiapi.dev', corrected: empty, at: now });
		if (empty) corrections[col] = apiVal;
	};
	checkReadings('on_readings', api?.on_readings);
	checkReadings('kun_readings', api?.kun_readings);

	const additional: KanjiAdditionalData = {
		kanjialive: {
			covered,
			fetched_at: now,
			...(covered
				? {
						references: alive!.references,
						radical: alive!.radical,
						media: alive!.kanji?.video,
						mnemonic: alive!.mn_hint || undefined,
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

	return { additional, corrections };
}
