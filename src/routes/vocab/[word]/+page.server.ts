import { error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { getFlashcardErrorMessage, listBoardsWithCards } from '$lib/server/flashcard';
import type { PageServerLoad } from './$types';

const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

export const load: PageServerLoad = async ({ params, locals, cookies, fetch }) => {
	const word = params.word;
	if (!word || word.length > 20) error(400, 'Invalid word');

	const accessToken = cookies.get('access_token');
	const boardPromise =
		locals.user && accessToken
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

	const [vocabResult, boardData] = await Promise.all([
		db.query('SELECT * FROM vocab WHERE word = $1 OR $1 = ANY(alt_forms) LIMIT 1', [word]),
		boardPromise
	]);
	if (vocabResult.rows.length === 0) error(404, `Word "${word}" not found`);

	const vocab = vocabResult.rows[0] as {
		id: number;
		word: string;
		alt_forms: string[];
		readings: string[];
		meanings: string[];
		is_common: boolean;
	};

	// Load kanji detail for each character in the word
	const kanjiChars = vocab.word.match(KANJI_RE) ?? [];
	const kanjiResult =
		kanjiChars.length > 0
			? await db.query(
					'SELECT literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count, svg_file FROM kanji WHERE literal = ANY($1)',
					[kanjiChars]
				)
			: { rows: [] };

	// Preserve character order
	const kanjiMap = new Map(kanjiResult.rows.map((r) => [r.literal, r]));
	const kanjiList = kanjiChars.map((c) => kanjiMap.get(c)).filter(Boolean);

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
				(card) => card.type === 'vocab' && card.identifier === vocab.word
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

	return { vocab, kanjiList, boards, boardsError, user: locals.user };
};
