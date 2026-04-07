import { json } from '@sveltejs/kit';
import { getAuthErrorResponse, register } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = (await request.json().catch(() => null)) as {
		user_name?: string;
		password?: string;
		confirm_password?: string;
		email?: string;
	} | null;

	if (!body?.user_name || !body.password || !body.confirm_password || !body.email) {
		return json({ message: 'Username, email, and password fields are required.' }, { status: 400 });
	}

	try {
		const payload = await register(
			body.user_name,
			body.password,
			body.confirm_password,
			body.email,
			fetch
		);
		return json(payload);
	} catch (error) {
		const { status, body: errorBody } = getAuthErrorResponse(error);
		return json(errorBody, { status });
	}
};
