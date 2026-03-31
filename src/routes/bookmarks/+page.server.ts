import { redirect } from '@sveltejs/kit';
import {
	getBoard,
	getFlashcardAppUrl,
	getFlashcardErrorMessage,
	listBoards
} from '$lib/server/flashcard';
import { getCardPreview } from '$lib/server/cardFormatter';
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
		const boardSummaries = await listBoards(accessToken, fetch);
		const boards = await Promise.all(
			boardSummaries.map(async (board) => {
				try {
					const detail = await getBoard(accessToken, board.id, fetch);
					const preview = detail.cards
						.map((card) => getCardPreview(card.front_text))
						.filter((item): item is BoardPreviewItem => Boolean(item))
						.slice(0, 4);

					return { ...board, preview };
				} catch {
					return { ...board, preview: [] as BoardPreviewItem[] };
				}
			})
		);

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
