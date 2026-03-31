import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { katakanaToHiragana } from '$lib/utils/kana';
import type { RequestHandler } from './$types';

const DEFAULT_FLASHCARD_BASE_URL = 'http://10.10.10.39:30039';
const DEFAULT_FLASHCARD_APP_URL = 'https://fc.nephren.xyz';

type BookmarkRow = {
	id: string;
	kanji_literal: string;
	meanings: string[] | null;
	on_readings: string[] | null;
	kun_readings: string[] | null;
};

function normalizeBaseUrl(value: string | undefined, fallback: string) {
	return (value || fallback).replace(/\/$/, '');
}

function defaultDeckName() {
	return `Kanji Bookmarks - ${new Date().toISOString().slice(0, 10)}`;
}

function toPlainKunReading(reading: string) {
	return reading.replace(/\./g, '');
}

function buildCard(bookmark: BookmarkRow) {
	const meanings = bookmark.meanings?.filter(Boolean) ?? [];
	const onReadings = bookmark.on_readings ?? [];
	const kunReadings = (bookmark.kun_readings ?? []).map(toPlainKunReading);
	const reading = kunReadings[0] ?? (onReadings[0] ? katakanaToHiragana(onReadings[0]) : undefined);
	const answerLines = [onReadings.join('、'), kunReadings.join('、')].filter(Boolean);

	return {
		front: meanings.length > 0 ? `${bookmark.kanji_literal}\n${meanings.join(', ')}` : bookmark.kanji_literal,
		back: answerLines.join('\n') || bookmark.kanji_literal,
		reading
	};
}

export const POST: RequestHandler = async ({ request, locals, cookies, fetch }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const accessToken = cookies.get('access_token');
	if (!accessToken) {
		return json({ message: 'Missing access token.' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as
		| {
				name?: string;
				bookmark_ids?: string[];
		  }
		| null;

	const bookmarkIds =
		Array.isArray(body?.bookmark_ids) && body.bookmark_ids.length > 0
			? body.bookmark_ids.filter((value) => typeof value === 'string' && value.trim().length > 0)
			: null;
	const deckName = body?.name?.trim() || defaultDeckName();

	const params: unknown[] = [locals.user.id];
	let bookmarkFilter = '';

	if (bookmarkIds) {
		params.push(bookmarkIds);
		bookmarkFilter = 'AND b.id = ANY($2::uuid[])';
	}

	const { rows } = await db.query<BookmarkRow>(
		`SELECT b.id, b.kanji_literal, k.meanings, k.on_readings, k.kun_readings
		 FROM bookmarks b
		 JOIN kanji k ON k.literal = b.kanji_literal
		 WHERE b.user_id = $1
		   ${bookmarkFilter}
		 ORDER BY b.created_at DESC`,
		params
	);

	if (rows.length === 0) {
		return json({ message: 'No bookmarks found to export.' }, { status: 400 });
	}

	const cards = rows.map(buildCard);
	const flashcardBaseUrl = normalizeBaseUrl(env.PRIVATE_FLASHCARD_BASE_URL, DEFAULT_FLASHCARD_BASE_URL);
	const flashcardAppUrl = normalizeBaseUrl(env.PUBLIC_FLASHCARD_APP_URL, DEFAULT_FLASHCARD_APP_URL);
	const exportResponse = await fetch(`${flashcardBaseUrl}/api/decks/external`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`
		},
		body: JSON.stringify({
			name: deckName,
			cards,
			source: 'jlang-support'
		})
	});

	const contentType = exportResponse.headers.get('content-type') ?? '';
	const exportPayload = contentType.includes('application/json')
		? ((await exportResponse.json()) as Record<string, unknown>)
		: ({ message: await exportResponse.text() } as Record<string, unknown>);

	if (!exportResponse.ok) {
		return json(
			{
				message: 'Failed to export bookmarks to rein-flashcard.',
				details: exportPayload.message ?? 'Upstream export failed.'
			},
			{ status: 502 }
		);
	}

	const deckId = String(exportPayload.deck_id ?? '');
	const cardCount = Number(exportPayload.card_count ?? cards.length);

	return json({
		deck_id: deckId,
		card_count: cardCount,
		flashcard_url: `${flashcardAppUrl}/study?deck=${encodeURIComponent(deckId)}`
	});
};
