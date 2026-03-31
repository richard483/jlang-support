import { json } from '@sveltejs/kit';
import { logout } from '$lib/server/auth';
import { clearAuthCookies } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, fetch, url }) => {
	const refreshToken = cookies.get('refresh_token');
	const accessToken = cookies.get('access_token');

	if (refreshToken) {
		try {
			await logout(refreshToken, accessToken, fetch);
		} catch {
			// Best-effort logout: always clear the local session.
		}
	}

	clearAuthCookies(cookies, url);
	return json({ message: 'Logged out' });
};
