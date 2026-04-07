import { json } from '@sveltejs/kit';
import { buildBoardFlashcard, fetchKanjiRecord } from '$lib/server/boardKanji';
import {
	addCardToBoard,
	findKanjiCard,
	getBoard,
	getFlashcardErrorResponse,
	removeCardFromBoard
} from '$lib/server/flashcard';
import type { RequestHandler } from './$types';

function getAccessToken(cookies: import('@sveltejs/kit').Cookies) {
	return cookies.get('access_token') ?? '';
}

export const POST: RequestHandler = async ({ cookies, fetch, params, request }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as { literal?: string } | null;
	const literal = body?.literal?.trim() ?? '';
	if ([...literal].length !== 1) {
		return json({ message: 'Invalid kanji literal' }, { status: 400 });
	}

	try {
		const board = await getBoard(accessToken, params.id, fetch);
		const existingCard = findKanjiCard(board.cards, literal);
		if (existingCard) {
			return json({ card_id: existingCard.id, already_exists: true });
		}

		const kanji = await fetchKanjiRecord(literal);
		if (!kanji) {
			return json({ message: 'Kanji not found' }, { status: 404 });
		}

		const payload = await addCardToBoard(accessToken, params.id, buildBoardFlashcard(kanji), fetch);
		return json({ ...payload, already_exists: false }, { status: 201 });
	} catch (caught) {
		const response = getFlashcardErrorResponse(caught, 'Failed to save kanji to board.');
		return json(response.body, { status: response.status });
	}
};

export const DELETE: RequestHandler = async ({ cookies, fetch, params, request }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as
		| { card_id?: string; literal?: string }
		| null;
	const cardId = body?.card_id?.trim() ?? '';
	const literal = body?.literal?.trim() ?? '';

	try {
		const board = await getBoard(accessToken, params.id, fetch);
		const matchingCard = cardId ? board.cards.find((card) => card.id === cardId) : findKanjiCard(board.cards, literal);
		if (!matchingCard) {
			return json({ message: 'Card not found.' }, { status: 404 });
		}

		await removeCardFromBoard(accessToken, params.id, matchingCard.id, fetch);
		return json({ message: 'Deleted', card_id: matchingCard.id });
	} catch (caught) {
		const response = getFlashcardErrorResponse(caught, 'Failed to remove kanji from board.');
		return json(response.body, { status: response.status });
	}
};
