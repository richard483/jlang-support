import type { Handle } from '@sveltejs/kit';
import { refresh } from '$lib/server/auth';
import { clearAuthCookies, getSessionUser, setRefreshCookies } from '$lib/server/session';

const skipPrefixes = ['/_app', '/api/auth', '/kanjivg'];
const skipPaths = new Set(['/favicon.ico', '/robots.txt']);
const publicPages = [/^\/$/, /^\/login$/, /^\/reset-password$/, /^\/browse$/, /^\/kanji\/[^/]+$/, /^\/vocab\/[^/]+$/, /^\/conjugate$/];
const protectedPages = [/^\/bookmarks(?:\/[^/]+)?\/?$/];
const publicApiPrefixes = ['/api/kanji'];
const protectedApiPrefixes = ['/api/boards'];

function matchesPrefix(pathname: string, prefix: string) {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicPage(pathname: string) {
	return publicPages.some((pattern) => pattern.test(pathname));
}

function isProtectedPage(pathname: string) {
	return protectedPages.some((pattern) => pattern.test(pathname));
}

function isPublicApi(pathname: string) {
	return publicApiPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

function isProtectedApi(pathname: string) {
	return protectedApiPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

function buildLoginLocation(url: URL) {
	const loginUrl = new URL('/login', url);
	const redirectTo = `${url.pathname}${url.search}`;
	if (redirectTo && redirectTo !== '/login') {
		loginUrl.searchParams.set('redirectTo', redirectTo);
	}
	return loginUrl.pathname + loginUrl.search;
}

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	if (skipPaths.has(pathname) || skipPrefixes.some((prefix) => pathname.startsWith(prefix))) {
		event.locals.user = getSessionUser(event.cookies);
		return resolve(event);
	}

	let accessToken = event.cookies.get('access_token');
	const refreshToken = event.cookies.get('refresh_token');

	if (!accessToken && refreshToken) {
		try {
			const payload = await refresh(refreshToken, event.fetch);
			accessToken = payload.access_token;
			setRefreshCookies(event.cookies, event.url, payload);
		} catch {
			clearAuthCookies(event.cookies, event.url);
		}
	}

	event.locals.user = getSessionUser(event.cookies);
	const isAuthenticated = Boolean(accessToken && event.locals.user);

	if (isProtectedApi(pathname) && !isAuthenticated) {
		return new Response(JSON.stringify({ message: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (isProtectedPage(pathname) && !isAuthenticated) {
		return new Response(null, {
			status: 303,
			headers: { location: buildLoginLocation(event.url) }
		});
	}

	if (isPublicApi(pathname) || isPublicPage(pathname)) {
		return resolve(event);
	}

	return resolve(event);
};
