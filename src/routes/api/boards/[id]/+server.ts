import { json } from '@sveltejs/kit';
import {
	deleteBoard,
	getBoard,
	getFlashcardErrorResponse,
	renameBoard
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

	const body = (await request.json().catch(() => null)) as { name?: string } | null;
	const name = body?.name?.trim();
	if (!name) {
		return json({ message: 'Board name is required.' }, { status: 400 });
	}

	try {
		await renameBoard(accessToken, params.id, name, fetch);
		return json({ message: 'Updated' });
	} catch (error) {
		const response = getFlashcardErrorResponse(error, 'Failed to rename board.');
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
