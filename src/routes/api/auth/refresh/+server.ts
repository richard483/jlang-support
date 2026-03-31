import { json } from '@sveltejs/kit';
import { getAuthErrorResponse, refresh } from '$lib/server/auth';
import { setRefreshCookies } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, fetch, url }) => {
	const body = (await request.json().catch(() => null)) as { refresh_token?: string } | null;
	const refreshToken = body?.refresh_token ?? cookies.get('refresh_token');

	if (!refreshToken) {
		return json({ message: 'Refresh token is required.' }, { status: 400 });
	}

	try {
		const payload = await refresh(refreshToken, fetch);
		setRefreshCookies(cookies, url, payload);
		return json(payload);
	} catch (error) {
		const { status, body: errorBody } = getAuthErrorResponse(error);
		return json(errorBody, { status });
	}
};
