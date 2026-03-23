import { error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { conjugate, type VerbGroup, type ConjugationResult } from '$lib/utils/conjugation';
import type { PageServerLoad } from './$types';

// Godan verb okurigana endings (kana that follow the kanji reading)
const GODAN_OKURI = new Set(['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む']);

interface WordForm {
	word: string;        // full word, e.g. 楽しい
	reading: string;     // hiragana reading of word
	type: 'verb-ichidan' | 'verb-godan' | 'adjective-i';
	conjugation: ConjugationResult | null;
	adjForms: { label: string; form: string }[] | null;
}

function deriveForms(literal: string, kunReadings: string[]): WordForm[] {
	const forms: WordForm[] = [];

	for (const raw of kunReadings) {
		// KanjiDic2 kun readings use '.' to split kanji-reading from okurigana
		// e.g. "か.く" → kanji reading "か", okurigana "く"
		//      "たの.しい" → kanji reading "たの", okurigana "しい"
		//      "いそが.しい" → "いそが", "しい"
		// Readings without '.' are standalone (no okurigana) — skip for forms
		const dotIdx = raw.indexOf('.');
		if (dotIdx === -1) continue;

		const kanjiReading = raw.slice(0, dotIdx);
		const okurigana = raw.slice(dotIdx + 1);
		const fullReading = kanjiReading + okurigana;
		const fullWord = literal + okurigana;

		if (okurigana.endsWith('い') && !okurigana.endsWith('る')) {
			// i-adjective (e.g. たの.しい → 楽しい)
			const stem = `${literal}${okurigana.slice(0, -1)}`; // drop final い
			forms.push({
				word: fullWord,
				reading: fullReading,
				type: 'adjective-i',
				conjugation: null,
				adjForms: [
					{ label: 'Plain', form: fullWord },
					{ label: 'Negative', form: `${stem}くない` },
					{ label: 'Past', form: `${stem}かった` },
					{ label: 'Past negative', form: `${stem}くなかった` },
					{ label: 'Te-form', form: `${stem}くて` },
					{ label: 'Adverbial', form: `${stem}く` },
					{ label: 'Nominalized', form: `${stem}さ` }
				]
			});
		} else if (okurigana === 'る') {
			// Single る okurigana → treat as godan-る (e.g. 帰る、走る)
			forms.push({
				word: fullWord,
				reading: fullReading,
				type: 'verb-godan',
				conjugation: conjugate(fullWord, 'godan'),
				adjForms: null
			});
		} else if (okurigana.endsWith('る') && okurigana.length > 1) {
			// Multi-mora okurigana ending in る → ichidan (e.g. 食べる、起きる)
			forms.push({
				word: fullWord,
				reading: fullReading,
				type: 'verb-ichidan',
				conjugation: conjugate(fullWord, 'ichidan'),
				adjForms: null
			});
		} else if (GODAN_OKURI.has(okurigana.slice(-1)) && okurigana.slice(-1) !== 'い') {
			// Ends in a godan consonant kana (く、ぐ、す、etc.)
			forms.push({
				word: fullWord,
				reading: fullReading,
				type: 'verb-godan',
				conjugation: conjugate(fullWord, 'godan'),
				adjForms: null
			});
		}
	}

	return forms;
}

export const load: PageServerLoad = async ({ params }) => {
	const { literal } = params;
	if (!literal || [...literal].length !== 1) error(400, 'Invalid kanji');

	const [kanjiResult, radicalsResult, mnemonicsResult, bookmarkResult, vocabResult] = await Promise.all([
		db.query('SELECT * FROM kanji WHERE literal = $1', [literal]),
		db.query('SELECT radical FROM kanji_radicals WHERE kanji_literal = $1', [literal]),
		db.query(
			'SELECT id, mnemonic, etymology, created_at FROM kanji_mnemonics WHERE kanji_literal = $1 ORDER BY created_at DESC',
			[literal]
		),
		db.query('SELECT id FROM bookmarks WHERE kanji_literal = $1', [literal]),
		db.query(
			`SELECT v.word, v.readings, v.meanings, v.is_common
			 FROM vocab v
			 JOIN vocab_kanji vk ON vk.vocab_id = v.id
			 WHERE vk.kanji_char = $1
			 ORDER BY v.is_common DESC, LENGTH(v.word) ASC
			 LIMIT 30`,
			[literal]
		)
	]);

	if (kanjiResult.rows.length === 0) error(404, `Kanji "${literal}" not found`);

	const kanji = kanjiResult.rows[0] as {
		literal: string;
		stroke_count: number | null;
		grade: number | null;
		jlpt_level: number | null;
		frequency: number | null;
		meanings: string[];
		on_readings: string[];
		kun_readings: string[];
		nanori: string[];
		radical_number: number | null;
		svg_file: string | null;
	};

	const wordForms = deriveForms(kanji.literal, kanji.kun_readings);

	return {
		kanji,
		radicals: radicalsResult.rows.map((r) => r.radical as string),
		mnemonics: mnemonicsResult.rows as {
			id: number;
			mnemonic: string;
			etymology: string | null;
			created_at: string;
		}[],
		bookmarked: bookmarkResult.rows.length > 0,
		wordForms,
		vocab: vocabResult.rows as {
			word: string;
			readings: string[];
			meanings: string[];
			is_common: boolean;
		}[]
	};
};
