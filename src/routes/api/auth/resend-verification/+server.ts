import { json } from '@sveltejs/kit';
import { getAuthErrorResponse, resendVerification } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = (await request.json().catch(() => null)) as { email?: string } | null;

	if (!body?.email) {
		return json({ message: 'Email is required.' }, { status: 400 });
	}

	try {
		const payload = await resendVerification(body.email, fetch);
		return json(payload);
	} catch (error) {
		const { status, body: errorBody } = getAuthErrorResponse(error);
		return json(errorBody, { status });
	}
};
