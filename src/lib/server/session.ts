import type { Cookies } from '@sveltejs/kit';
import { getAuthUsername, type AuthLoginData, type AuthRefreshData } from '$lib/server/auth';

export type SessionUser = {
	id: string;
	username: string;
};

const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

function buildCookieOptions(url: URL, maxAge: number) {
	return {
		httpOnly: true,
		path: '/',
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
		maxAge
	};
}

export function getSessionUser(cookies: Cookies): SessionUser | null {
	const id = cookies.get('user_id');
	const username = cookies.get('username');

	if (!id || !username) {
		return null;
	}

	return { id, username };
}

export function setLoginCookies(cookies: Cookies, url: URL, payload: AuthLoginData) {
	cookies.set('access_token', payload.access_token, buildCookieOptions(url, payload.expires_in));
	cookies.set('refresh_token', payload.refresh_token, buildCookieOptions(url, REFRESH_MAX_AGE));
	cookies.set('session_id', payload.session_id, buildCookieOptions(url, REFRESH_MAX_AGE));
	cookies.set('user_id', payload.user.id, buildCookieOptions(url, REFRESH_MAX_AGE));
	cookies.set('username', getAuthUsername(payload.user), buildCookieOptions(url, REFRESH_MAX_AGE));
}

export function setRefreshCookies(cookies: Cookies, url: URL, payload: AuthRefreshData) {
	cookies.set('access_token', payload.access_token, buildCookieOptions(url, payload.expires_in));

	if (payload.refresh_token) {
		cookies.set('refresh_token', payload.refresh_token, buildCookieOptions(url, REFRESH_MAX_AGE));
	}
}

export function clearAuthCookies(cookies: Cookies, url: URL) {
	const options = buildCookieOptions(url, 0);
	cookies.set('access_token', '', options);
	cookies.set('refresh_token', '', options);
	cookies.set('session_id', '', options);
	cookies.set('user_id', '', options);
	cookies.set('username', '', options);
}
