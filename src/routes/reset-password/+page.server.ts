import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		redirect(303, '/');
	}

	return {
		token: url.searchParams.get('token') ?? ''
	};
};
