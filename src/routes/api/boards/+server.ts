import { json } from '@sveltejs/kit';
import {
	createBoard,
	getFlashcardErrorResponse,
	listBoards
} from '$lib/server/flashcard';
import type { RequestHandler } from './$types';

function getAccessToken(cookies: import('@sveltejs/kit').Cookies) {
	return cookies.get('access_token') ?? '';
}

export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const boards = await listBoards(accessToken, fetch);
		return json({ boards });
	} catch (error) {
		const response = getFlashcardErrorResponse(error, 'Failed to load boards.');
		return json(response.body, { status: response.status });
	}
};

export const POST: RequestHandler = async ({ cookies, fetch, request }) => {
	const accessToken = getAccessToken(cookies);
	if (!accessToken) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as { name?: string } | null;
	const name = body?.name?.trim();
	if (!name) {
		return json({ message: 'Board name is required.' }, { status: 400 });
	}

	try {
		const payload = await createBoard(accessToken, name, fetch);
		return json(payload, { status: 201 });
	} catch (error) {
		const response = getFlashcardErrorResponse(error, 'Failed to create board.');
		return json(response.body, { status: response.status });
	}
};
