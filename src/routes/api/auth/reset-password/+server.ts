import { json } from '@sveltejs/kit';
import { getAuthErrorResponse, resetPassword } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = (await request.json().catch(() => null)) as {
		token?: string;
		password?: string;
		confirm_password?: string;
	} | null;

	if (!body?.token || !body.password || !body.confirm_password) {
		return json({ message: 'Token and password fields are required.' }, { status: 400 });
	}

	try {
		const payload = await resetPassword(body.token, body.password, body.confirm_password, fetch);
		return json(payload);
	} catch (error) {
		const { status, body: errorBody } = getAuthErrorResponse(error);
		return json(errorBody, { status });
	}
};
