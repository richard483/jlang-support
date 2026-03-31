import { error as httpError, redirect } from '@sveltejs/kit';
import { fetchKanjiMap } from '$lib/server/boardKanji';
import {
	FlashcardApiError,
	extractKanjiLiteralFromFront,
	getBoard,
	getFlashcardAppUrl,
	getFlashcardErrorMessage
} from '$lib/server/flashcard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, params, cookies, fetch }) => {
	if (!locals.user) {
		const loginUrl = new URL('/login', url);
		loginUrl.searchParams.set('redirectTo', `/bookmarks/${params.id}`);
		throw redirect(303, loginUrl.pathname + loginUrl.search);
	}

	const accessToken = cookies.get('access_token');
	if (!accessToken) {
		const loginUrl = new URL('/login', url);
		loginUrl.searchParams.set('redirectTo', `/bookmarks/${params.id}`);
		throw redirect(303, loginUrl.pathname + loginUrl.search);
	}

	try {
		const board = await getBoard(accessToken, params.id, fetch);
		const literals = board.cards
			.map((card) => extractKanjiLiteralFromFront(card.front_text))
			.filter((literal): literal is string => Boolean(literal));
		const kanjiMap = await fetchKanjiMap(literals);

		return {
			board: board.deck,
			cards: board.cards.map((card) => {
				const literal = extractKanjiLiteralFromFront(card.front_text);
				return {
					...card,
					literal,
					kanji: literal ? (kanjiMap.get(literal) ?? null) : null
				};
			}),
			serviceError: null,
			flashcardAppUrl: getFlashcardAppUrl()
		};
	} catch (error) {
		if (error instanceof FlashcardApiError && error.status === 404) {
			throw httpError(404, 'Board not found');
		}

		return {
			board: null,
			cards: [],
			serviceError: getFlashcardErrorMessage(error),
			flashcardAppUrl: getFlashcardAppUrl()
		};
	}
};
