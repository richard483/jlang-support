import { json } from '@sveltejs/kit';
import { getAuthErrorResponse, login } from '$lib/server/auth';
import { setLoginCookies } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, fetch, url }) => {
	const body = (await request.json().catch(() => null)) as {
		user_name?: string;
		password?: string;
	} | null;

	if (!body?.user_name || !body.password) {
		return json({ message: 'Username and password are required.' }, { status: 400 });
	}

	try {
		const payload = await login(body.user_name, body.password, fetch);
		if (!payload?.user?.id) {
			return json({ message: 'Login response is missing user data.' }, { status: 502 });
		}
		setLoginCookies(cookies, url, payload);
		return json({ user: payload.user });
	} catch (error) {
		const { status, body: errorBody } = getAuthErrorResponse(error);
		return json(errorBody, { status });
	}
};
