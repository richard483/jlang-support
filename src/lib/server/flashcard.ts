import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const DEFAULT_FLASHCARD_APP_URL = 'https://fc.nephren.xyz';
const DEFAULT_FLASHCARD_API_URL = DEFAULT_FLASHCARD_APP_URL;
const LEGACY_INTERNAL_FLASHCARD_API_URL = 'http://10.10.10.39:30039';
const DEFAULT_FLASHCARD_TIMEOUT_MS = 3000;
const JLANG_SOURCE = 'jlang-support';

export type BoardSummary = {
	id: string;
	name: string;
	card_count: number;
	source: string | null;
	source_updated_at: string | null;
};

export type BoardCard = {
	id: string;
	front_text: string;
	back_text: string;
	reading_text: string | null;
	position: number;
};

export type BoardDetail = {
	deck: {
		id: string;
		name: string;
		source: string | null;
		source_updated_at: string | null;
	};
	cards: BoardCard[];
};

export type FlashcardDraft = {
	front: string;
	back: string;
	reading?: string;
};

export class FlashcardApiError extends Error {
	status: number;
	body: Record<string, unknown>;

	constructor(status: number, body: Record<string, unknown>) {
		super(String(body.message ?? 'Flashcard request failed'));
		this.name = 'FlashcardApiError';
		this.status = status;
		this.body = body;
	}
}

function normalizeBaseUrl(value: string | undefined, fallback: string) {
	return (value || fallback).replace(/\/$/, '');
}

function getFlashcardApiUrl() {
	const configuredUrl = normalizeBaseUrl(
		privateEnv.PRIVATE_FLASHCARD_API_URL || privateEnv.PRIVATE_FLASHCARD_BASE_URL,
		''
	);

	if (!configuredUrl || configuredUrl === LEGACY_INTERNAL_FLASHCARD_API_URL) {
		return DEFAULT_FLASHCARD_API_URL;
	}

	return configuredUrl;
}

function getFlashcardTimeoutMs() {
	const rawTimeout = Number(privateEnv.PRIVATE_FLASHCARD_API_TIMEOUT_MS);
	return Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : DEFAULT_FLASHCARD_TIMEOUT_MS;
}

export function getFlashcardAppUrl() {
	return normalizeBaseUrl(publicEnv.PUBLIC_FLASHCARD_APP_URL, DEFAULT_FLASHCARD_APP_URL);
}

async function parseResponseBody(response: Response) {
	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		return (await response.json()) as Record<string, unknown>;
	}

	const text = await response.text();
	return text ? ({ message: text } as Record<string, unknown>) : {};
}

async function flashcardRequest<T>(
	path: string,
	accessToken: string,
	options?: {
		method?: string;
		body?: Record<string, unknown>;
		fetcher?: typeof fetch;
	}
) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), getFlashcardTimeoutMs());

	try {
		const response = await (options?.fetcher ?? fetch)(`${getFlashcardApiUrl()}${path}`, {
			method: options?.method ?? 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Cookie: `access_token=${encodeURIComponent(accessToken)}`,
				...(options?.body ? { 'Content-Type': 'application/json' } : {})
			},
			signal: controller.signal,
			...(options?.body ? { body: JSON.stringify(options.body) } : {})
		});

		const payload = (await parseResponseBody(response)) as T;
		if (!response.ok) {
			throw new FlashcardApiError(
				response.status,
				payload && typeof payload === 'object'
					? (payload as Record<string, unknown>)
					: { message: 'Flashcard request failed' }
			);
		}

		return payload;
	} catch (error) {
		if (error instanceof FlashcardApiError) {
			throw error;
		}

		throw new FlashcardApiError(503, {
			message: 'Flashcard service is temporarily unavailable. Your boards will be back when the service recovers.'
		});
	} finally {
		clearTimeout(timeout);
	}
}

export function getFlashcardErrorResponse(error: unknown, fallback: string) {
	if (error instanceof FlashcardApiError) {
		return {
			status: error.status,
			body: { message: String(error.body.message ?? fallback) }
		};
	}

	return {
		status: 500,
		body: { message: fallback }
	};
}

export function getFlashcardErrorMessage(error: unknown, fallback?: string) {
	if (error instanceof FlashcardApiError) {
		return String(
			error.body.message ??
				fallback ??
				'Flashcard service is temporarily unavailable. Your boards will be back when the service recovers.'
		);
	}

	return fallback ?? 'Flashcard service is temporarily unavailable. Your boards will be back when the service recovers.';
}

export async function listBoards(accessToken: string, fetcher: typeof fetch = fetch) {
	const payload = await flashcardRequest<{ decks: BoardSummary[] }>(
		`/api/decks/external?source=${encodeURIComponent(JLANG_SOURCE)}`,
		accessToken,
		{ fetcher }
	);
	return payload.decks ?? [];
}

export async function createBoard(accessToken: string, name: string, fetcher: typeof fetch = fetch) {
	return flashcardRequest<{
		deck_id: string;
		card_count: number;
		source_updated_at: string | null;
	}>('/api/decks/external', accessToken, {
		method: 'POST',
		body: { name, source: JLANG_SOURCE },
		fetcher
	});
}

export async function getBoard(accessToken: string, boardId: string, fetcher: typeof fetch = fetch) {
	return flashcardRequest<BoardDetail>(`/api/decks/external/${encodeURIComponent(boardId)}`, accessToken, {
		fetcher
	});
}

export async function deleteBoard(accessToken: string, boardId: string, fetcher: typeof fetch = fetch) {
	return flashcardRequest<{ message: string }>(
		`/api/decks/external/${encodeURIComponent(boardId)}`,
		accessToken,
		{ method: 'DELETE', fetcher }
	);
}

export async function renameBoard(
	accessToken: string,
	boardId: string,
	name: string,
	fetcher: typeof fetch = fetch
) {
	return flashcardRequest<{ message: string }>(
		`/api/decks/external/${encodeURIComponent(boardId)}`,
		accessToken,
		{ method: 'PUT', body: { name }, fetcher }
	);
}

export async function addCardToBoard(
	accessToken: string,
	boardId: string,
	card: FlashcardDraft,
	fetcher: typeof fetch = fetch
) {
	return flashcardRequest<{ card_id: string; position: number }>(
		`/api/decks/external/${encodeURIComponent(boardId)}/cards`,
		accessToken,
		{ method: 'POST', body: card, fetcher }
	);
}

export async function removeCardFromBoard(
	accessToken: string,
	boardId: string,
	cardId: string,
	fetcher: typeof fetch = fetch
) {
	return flashcardRequest<{ message: string }>(
		`/api/decks/external/${encodeURIComponent(boardId)}/cards`,
		accessToken,
		{ method: 'DELETE', body: { card_id: cardId }, fetcher }
	);
}

export function extractKanjiLiteralFromFront(frontText: string) {
	const literal = frontText.split('\n')[0]?.trim() ?? '';
	return [...literal].length === 1 ? literal : null;
}

export function findKanjiCard(cards: BoardCard[], literal: string) {
	return cards.find((card) => extractKanjiLiteralFromFront(card.front_text) === literal) ?? null;
}

export async function isKanjiInBoard(
	accessToken: string,
	boardId: string,
	literal: string,
	fetcher: typeof fetch = fetch
) {
	const board = await getBoard(accessToken, boardId, fetcher);
	return Boolean(findKanjiCard(board.cards, literal));
}
