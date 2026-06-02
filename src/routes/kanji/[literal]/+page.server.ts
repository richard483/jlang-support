import { error } from '@sveltejs/kit';
import db from '$lib/server/db';
import {
	getFlashcardErrorMessage,
	listBoardsWithCards
} from '$lib/server/flashcard';
import { conjugate, type ConjugationResult } from '$lib/utils/conjugation';
import type { PageServerLoad } from './$types';

const GODAN_OKURI = new Set(['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む']);

interface WordForm {
	word: string;
	reading: string;
	altReadings: string[];
	type: 'verb-ichidan' | 'verb-godan' | 'adjective-i';
	conjugation: ConjugationResult | null;
	adjForms: { label: string; form: string }[] | null;
	meanings: string[];
	posTag: string | null;
}

function deriveForms(literal: string, kunReadings: string[]): WordForm[] {
	const forms: WordForm[] = [];

	for (const raw of kunReadings) {
		const dotIdx = raw.indexOf('.');
		if (dotIdx === -1) continue;

		const kanjiReading = raw.slice(0, dotIdx);
		const okurigana = raw.slice(dotIdx + 1);
		const fullReading = kanjiReading + okurigana;
		const fullWord = literal + okurigana;

		if (okurigana.endsWith('い') && !okurigana.endsWith('る')) {
			const stem = `${literal}${okurigana.slice(0, -1)}`;
			forms.push({
				word: fullWord,
				reading: fullReading,
				altReadings: [],
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
				],
				meanings: [],
				posTag: null
			});
		} else if (okurigana === 'る') {
			forms.push({
				word: fullWord,
				reading: fullReading,
				altReadings: [],
				type: 'verb-godan',
				conjugation: conjugate(fullWord, 'godan'),
				adjForms: null,
				meanings: [],
				posTag: null
			});
		} else if (okurigana.endsWith('る') && okurigana.length > 1) {
			forms.push({
				word: fullWord,
				reading: fullReading,
				altReadings: [],
				type: 'verb-ichidan',
				conjugation: conjugate(fullWord, 'ichidan'),
				adjForms: null,
				meanings: [],
				posTag: null
			});
		} else if (GODAN_OKURI.has(okurigana.slice(-1)) && okurigana.slice(-1) !== 'い') {
			forms.push({
				word: fullWord,
				reading: fullReading,
				altReadings: [],
				type: 'verb-godan',
				conjugation: conjugate(fullWord, 'godan'),
				adjForms: null,
				meanings: [],
				posTag: null
			});
		}
	}

	return forms;
}

export const load: PageServerLoad = async ({ params, locals, cookies, fetch }) => {
	const { literal } = params;
	if (!literal || [...literal].length !== 1) error(400, 'Invalid kanji');

	const userId = locals.user?.id ?? null;
	const accessToken = cookies.get('access_token');
	const boardPromise =
		userId && accessToken
			? listBoardsWithCards(accessToken, fetch)
					.then((boards) => ({ boards, boardsError: null }))
					.catch((caught) => ({
						boards: [] as Awaited<ReturnType<typeof listBoardsWithCards>>,
						boardsError: getFlashcardErrorMessage(caught)
					}))
			: Promise.resolve({
					boards: null as Awaited<ReturnType<typeof listBoardsWithCards>> | null,
					boardsError: null as string | null
				});

	const [kanjiResult, radicalsResult, vocabResult, mnemonicsResult, boardData] = await Promise.all([
		db.query('SELECT * FROM kanji WHERE literal = $1', [literal]),
		db.query('SELECT radical FROM kanji_radicals WHERE kanji_literal = $1', [literal]),
		db.query(
			`SELECT v.word, v.readings, v.meanings, v.is_common, v.pos_tags
			 FROM vocab v
			 JOIN vocab_kanji vk ON vk.vocab_id = v.id
			 WHERE vk.kanji_char = $1
			 ORDER BY LENGTH(v.word) ASC, POSITION($1 IN v.word) ASC, v.is_common DESC
			 LIMIT 30`,
			[literal]
		),
		userId
			? db.query(
					`SELECT id, mnemonic, etymology, created_at
					 FROM kanji_mnemonics
					 WHERE kanji_literal = $1 AND user_id = $2
					 ORDER BY created_at DESC`,
					[literal, userId]
				)
			: Promise.resolve({
					rows: [] as {
						id: number;
						mnemonic: string;
						etymology: string | null;
						created_at: string;
					}[]
				})
		,
		boardPromise
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

	const rawWordForms = deriveForms(kanji.literal, kanji.kun_readings);

	const deduped = new Map<string, WordForm>();
	for (const form of rawWordForms) {
		const key = form.word;
		const existing = deduped.get(key);
		if (existing) {
			if (existing.reading !== form.reading) {
				existing.altReadings.push(form.reading);
			}
		} else {
			deduped.set(key, { ...form });
		}
	}
	const uniqueWordForms = [...deduped.values()];

	const vocabRows = vocabResult.rows as {
		word: string;
		readings: string[];
		meanings: string[];
		pos_tags: string[];
		is_common: boolean;
	}[];

	const enrichedWordForms = uniqueWordForms.map((form) => {
		const matchByReading = vocabRows.find(
			(v) => v.word === form.word && v.readings.includes(form.reading)
		);
		const matchByWord = vocabRows.find((v) => v.word === form.word);
		const match = matchByReading ?? matchByWord;
		return {
			...form,
			meanings: match?.meanings?.slice(0, 3) ?? [],
			posTag: match?.pos_tags?.[0] ?? null
		};
	});

	let boards:
		| {
				id: string;
				name: string;
				card_count: number;
				isSaved: boolean;
				cardId: string | null;
		  }[]
		| null = null;
	let boardsError: string | null = boardData.boardsError;

	if (boardData.boards) {
		boards = boardData.boards.map((board) => {
			const match = board.card_identifiers.find(
				(card) => card.type === 'kanji' && card.identifier === literal
			);

			return {
				id: board.id,
				name: board.name,
				card_count: board.card_count,
				isSaved: Boolean(match),
				cardId: match?.card_id ?? null
			};
		});
	}

	return {
		kanji,
		radicals: radicalsResult.rows.map((row) => row.radical as string),
		mnemonics: mnemonicsResult.rows as {
			id: number;
			mnemonic: string;
			etymology: string | null;
			created_at: string;
		}[],
		boards,
		boardsError,
		wordForms: enrichedWordForms,
		vocab: vocabRows
	};
};
