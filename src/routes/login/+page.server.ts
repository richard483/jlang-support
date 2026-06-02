import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function isSafeRedirectPath(value: string | null) {
	return Boolean(value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/api/auth'));
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}

	const redirectTo = url.searchParams.get('redirectTo');

	return {
		redirectTo: isSafeRedirectPath(redirectTo) ? redirectTo : '/'
	};
};
