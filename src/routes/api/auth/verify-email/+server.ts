import { json } from '@sveltejs/kit';
import { getAuthErrorResponse, verifyEmail } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = (await request.json().catch(() => null)) as { token?: string } | null;

	if (!body?.token) {
		return json({ message: 'Token is required.' }, { status: 400 });
	}

	try {
		const payload = await verifyEmail(body.token, fetch);
		return json(payload);
	} catch (error) {
		const { status, body: errorBody } = getAuthErrorResponse(error);
		return json(errorBody, { status });
	}
};
