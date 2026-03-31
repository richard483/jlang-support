import { redirect } from '@sveltejs/kit';
import {
	getFlashcardAppUrl,
	getFlashcardErrorMessage,
	listBoardsWithCards
} from '$lib/server/flashcard';
import type { PageServerLoad } from './$types';

type BoardPreviewItem = {
	type: 'kanji' | 'vocab' | 'unknown';
	identifier: string;
};

export const load: PageServerLoad = async ({ locals, url, cookies, fetch }) => {
	if (!locals.user) {
		const loginUrl = new URL('/login', url);
		loginUrl.searchParams.set('redirectTo', '/bookmarks');
		throw redirect(303, loginUrl.pathname + loginUrl.search);
	}

	const accessToken = cookies.get('access_token');
	if (!accessToken) {
		const loginUrl = new URL('/login', url);
		loginUrl.searchParams.set('redirectTo', '/bookmarks');
		throw redirect(303, loginUrl.pathname + loginUrl.search);
	}

	try {
		const boards = (await listBoardsWithCards(accessToken, fetch)).map((board) => ({
			id: board.id,
			name: board.name,
			card_count: board.card_count,
			source_updated_at: board.source_updated_at,
			preview: board.card_identifiers
				.slice(0, 4)
				.map(
					(card): BoardPreviewItem => ({
						type: card.type,
						identifier: card.identifier
					})
				)
		}));

		return {
			boards,
			serviceError: null,
			flashcardAppUrl: getFlashcardAppUrl()
		};
	} catch (error) {
		return {
			boards: [],
			serviceError: getFlashcardErrorMessage(error),
			flashcardAppUrl: getFlashcardAppUrl()
		};
	}
};
