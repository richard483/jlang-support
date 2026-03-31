import { json } from '@sveltejs/kit';
import {
	BOARD_CARD_LAYOUTS,
	deleteBoard,
	getBoard,
	getFlashcardErrorResponse,
	updateBoard
} from '$lib/server/flashcard';
import type { RequestHandler } from './$types';

function getAccessToken(cookies: import('@sveltejs/kit').Cookies) {
	return cookies.get('access_token') ?? '';
}

export const GET: RequestHandler = async ({ cookies, fetch, params }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const board = await getBoard(accessToken, params.id, fetch);
		return json(board);
	} catch (error) {
		const response = getFlashcardErrorResponse(error, 'Failed to load board.');
		return json(response.body, { status: response.status });
	}
};

export const PUT: RequestHandler = async ({ cookies, fetch, params, request }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as
		| { name?: string; card_layout?: string }
		| null;
	const name = body?.name?.trim();
	const cardLayout = body?.card_layout?.trim();

	if (cardLayout && !BOARD_CARD_LAYOUTS.includes(cardLayout as (typeof BOARD_CARD_LAYOUTS)[number])) {
		return json({ message: 'Invalid flashcard layout.' }, { status: 400 });
	}

	if (!name && !cardLayout) {
		return json({ message: 'Provide a board name or flashcard layout.' }, { status: 400 });
	}

	try {
		await updateBoard(
			accessToken,
			params.id,
			{
				...(name ? { name } : {}),
				...(cardLayout
					? { card_layout: cardLayout as (typeof BOARD_CARD_LAYOUTS)[number] }
					: {})
			},
			fetch
		);
		return json({ message: 'Updated' });
	} catch (error) {
		const response = getFlashcardErrorResponse(error, 'Failed to update board.');
		return json(response.body, { status: response.status });
	}
};

export const DELETE: RequestHandler = async ({ cookies, fetch, params }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		await deleteBoard(accessToken, params.id, fetch);
		return json({ message: 'Deleted' });
	} catch (error) {
		const response = getFlashcardErrorResponse(error, 'Failed to delete board.');
		return json(response.body, { status: response.status });
	}
};
