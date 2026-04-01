import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;
const KANA_RE = /^[\u3040-\u30FF\uFF65-\uFF9F]+$/;

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) return json({ results: [], vocab: [] });

	const kanjiChars = q.match(KANJI_RE) ?? [];
	const hasKanji = kanjiChars.length > 0;
	const isKana = KANA_RE.test(q);
	// Anything that's not kanji and not kana — treat as English meaning search
	const isEnglish = !hasKanji && !isKana;

	let kanjiRes, vocabRes;

	if (hasKanji) {
		// ── Kanji input (e.g. 日本) ──────────────────────────────────────────────
		// Show the component kanji as a breakdown, and vocab containing the full string.
		[kanjiRes, vocabRes] = await Promise.all([
			db.query(
				`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
				 FROM kanji
				 WHERE literal = ANY($1)
				 ORDER BY frequency ASC NULLS LAST
				 LIMIT 50`,
				[kanjiChars]
			),
			db.query(
				`SELECT v.id, v.word, v.readings, v.meanings, v.pos_tags, v.is_common
				 FROM vocab v
				 WHERE v.word = $1
				    OR $1 = ANY(v.alt_forms)
				    OR v.word LIKE $2
				 ORDER BY
				    CASE WHEN v.word = $1 THEN 0
				         WHEN $1 = ANY(v.alt_forms) THEN 1
				         ELSE 2 END,
				    v.is_common DESC,
				    LENGTH(v.word) ASC
				 LIMIT 40`,
				[q, `%${q}%`]
			)
		]);
	} else if (isKana) {
		// ── Kana input (e.g. にほん, ニホン) ────────────────────────────────────
		// Match kanji by on/kun readings, vocab by readings array.
		[kanjiRes, vocabRes] = await Promise.all([
			db.query(
				`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
				 FROM kanji
				 WHERE $1 = ANY(on_readings)
				    OR $1 = ANY(kun_readings)
				 ORDER BY frequency ASC NULLS LAST
				 LIMIT 50`,
				[q]
			),
			db.query(
				`SELECT v.id, v.word, v.readings, v.meanings, v.pos_tags, v.is_common
				 FROM vocab v
				 WHERE $1 = ANY(v.readings)
				    OR v.readings::text ILIKE $2
				 ORDER BY
				    CASE WHEN $1 = ANY(v.readings) THEN 0 ELSE 1 END,
				    v.is_common DESC,
				    LENGTH(v.word) ASC
				 LIMIT 40`,
				[q, `%${q}%`]
			)
		]);
	} else {
		// ── English / romaji input (e.g. "water", "sun") ────────────────────────
		// Match kanji by meanings, vocab by meanings array.
		[kanjiRes, vocabRes] = await Promise.all([
			db.query(
				`SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
				 FROM kanji
				 WHERE EXISTS (SELECT 1 FROM unnest(meanings) m WHERE m ILIKE $1)
				 ORDER BY
				    CASE WHEN EXISTS (SELECT 1 FROM unnest(meanings) m WHERE m ILIKE $2) THEN 0 ELSE 1 END,
				    frequency ASC NULLS LAST
				 LIMIT 50`,
				[`%${q}%`, q]
			),
			db.query(
				`SELECT v.id, v.word, v.readings, v.meanings, v.pos_tags, v.is_common
				 FROM vocab v
				 WHERE EXISTS (SELECT 1 FROM unnest(v.meanings) m WHERE m ILIKE $1)
				 ORDER BY
				    CASE WHEN EXISTS (SELECT 1 FROM unnest(v.meanings) m WHERE m ILIKE $2) THEN 0 ELSE 1 END,
				    v.is_common DESC,
				    LENGTH(v.word) ASC
				 LIMIT 40`,
				[`%${q}%`, q]
			)
		]);
	}

	return json({ results: kanjiRes.rows, vocab: vocabRes.rows });
};
