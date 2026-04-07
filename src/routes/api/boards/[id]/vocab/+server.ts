import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { findBoardCard, formatVocabCard } from '$lib/server/cardFormatter';
import {
	addCardToBoard,
	getBoard,
	getFlashcardErrorResponse,
	removeCardFromBoard
} from '$lib/server/flashcard';
import type { RequestHandler } from './$types';

type VocabRecord = {
	word: string;
	readings: string[];
	meanings: string[];
	alt_forms: string[];
};

function getAccessToken(cookies: import('@sveltejs/kit').Cookies) {
	return cookies.get('access_token') ?? '';
}

export const POST: RequestHandler = async ({ cookies, fetch, params, request }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as { word?: string } | null;
	const word = body?.word?.trim() ?? '';
	if (!word) {
		return json({ message: 'Invalid vocabulary word' }, { status: 400 });
	}

	try {
		const board = await getBoard(accessToken, params.id, fetch);
		const existingCard = findBoardCard(board.cards, 'vocab', word);
		if (existingCard) {
			return json({ card_id: existingCard.id, already_exists: true });
		}

		const { rows } = await db.query<VocabRecord>(
			`select word, readings, meanings, alt_forms
			 from vocab
			 where word = $1 or $1 = any(alt_forms)
			 limit 1`,
			[word]
		);
		const vocab = rows[0] ?? null;
		if (!vocab) {
			return json({ message: 'Vocabulary not found' }, { status: 404 });
		}

		const payload = await addCardToBoard(accessToken, params.id, formatVocabCard(vocab), fetch);
		return json({ ...payload, already_exists: false }, { status: 201 });
	} catch (caught) {
		const response = getFlashcardErrorResponse(caught, 'Failed to save vocabulary to board.');
		return json(response.body, { status: response.status });
	}
};

export const DELETE: RequestHandler = async ({ cookies, fetch, params, request }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as
		| { card_id?: string; word?: string }
		| null;
	const cardId = body?.card_id?.trim() ?? '';
	const word = body?.word?.trim() ?? '';

	try {
		const board = await getBoard(accessToken, params.id, fetch);
		const matchingCard = cardId
			? board.cards.find((card) => card.id === cardId)
			: findBoardCard(board.cards, 'vocab', word);
		if (!matchingCard) {
			return json({ message: 'Card not found.' }, { status: 404 });
		}

		await removeCardFromBoard(accessToken, params.id, matchingCard.id, fetch);
		return json({ message: 'Deleted', card_id: matchingCard.id });
	} catch (caught) {
		const response = getFlashcardErrorResponse(caught, 'Failed to remove vocabulary from board.');
		return json(response.body, { status: response.status });
	}
};
