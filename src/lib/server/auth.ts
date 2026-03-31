import { env } from '$env/dynamic/private';

const DEFAULT_AUTH_BASE_URL = 'http://222.222.1.104:30025';

export type AuthUser = {
	id: string;
	username?: string;
	user_name?: string;
	email?: string;
	email_verified?: boolean;
	is_active?: boolean;
};

export type AuthLoginData = {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires_in: number;
	session_id: string;
	user: AuthUser;
};

export type AuthRefreshData = {
	access_token: string;
	refresh_token?: string;
	token_type?: string;
	expires_in: number;
};

export class AuthApiError extends Error {
	status: number;
	body: Record<string, unknown>;

	constructor(status: number, body: Record<string, unknown>) {
		super(String(body.message ?? 'Authentication request failed'));
		this.name = 'AuthApiError';
		this.status = status;
		this.body = body;
	}
}

function getAuthBaseUrl() {
	return (env.PRIVATE_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL).replace(/\/$/, '');
}

async function parseResponseBody(response: Response) {
	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		return (await response.json()) as Record<string, unknown>;
	}

	const text = await response.text();
	return text ? ({ message: text } as Record<string, unknown>) : {};
}

export async function authRequest<T>(
	endpoint: string,
	body: Record<string, unknown>,
	fetcher: typeof fetch = fetch,
	options?: {
		headers?: Record<string, string>;
	}
) {
	const response = await fetcher(`${getAuthBaseUrl()}${endpoint}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(options?.headers ?? {})
		},
		body: JSON.stringify(body)
	});

	const payload = (await parseResponseBody(response)) as T;

	if (!response.ok) {
		const errorBody =
			payload && typeof payload === 'object'
				? (payload as Record<string, unknown>)
				: { message: 'Authentication request failed' };
		throw new AuthApiError(response.status, errorBody);
	}

	return payload;
}

export function getAuthErrorResponse(error: unknown) {
	if (error instanceof AuthApiError) {
		return {
			status: error.status,
			body: error.body
		};
	}

	return {
		status: 500,
		body: { message: error instanceof Error ? error.message : 'Authentication request failed' }
	};
}

export function getAuthUsername(user: AuthUser) {
	return user.username ?? user.user_name ?? '';
}

export async function login(user_name: string, password: string, fetcher: typeof fetch = fetch) {
	return authRequest<AuthLoginData>('/auth/login', { user_name, password }, fetcher);
}

export async function register(
	user_name: string,
	password: string,
	confirm_password: string,
	email: string,
	fetcher: typeof fetch = fetch
) {
	return authRequest<Record<string, unknown>>(
		'/auth/register',
		{ user_name, password, confirm_password, email },
		fetcher
	);
}

export async function refresh(refresh_token: string, fetcher: typeof fetch = fetch) {
	return authRequest<AuthRefreshData>('/auth/refresh', { refresh_token }, fetcher);
}

export async function logout(
	refresh_token: string,
	access_token?: string,
	fetcher: typeof fetch = fetch
) {
	return authRequest<Record<string, unknown>>('/auth/logout', { refresh_token }, fetcher, {
		headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined
	});
}

export async function verifyEmail(token: string, fetcher: typeof fetch = fetch) {
	return authRequest<Record<string, unknown>>('/auth/verify-email', { token }, fetcher);
}

export async function resendVerification(email: string, fetcher: typeof fetch = fetch) {
	return authRequest<Record<string, unknown>>('/auth/resend-verification', { email }, fetcher);
}

export async function forgotPassword(
	email: string,
	redirect_url?: string,
	fetcher: typeof fetch = fetch
) {
	return authRequest<Record<string, unknown>>(
		'/auth/forgot-password',
		redirect_url ? { email, redirect_url } : { email },
		fetcher
	);
}

export async function resetPassword(
	token: string,
	password: string,
	confirm_password: string,
	fetcher: typeof fetch = fetch
) {
	return authRequest<Record<string, unknown>>(
		'/auth/reset-password',
		{ token, password, confirm_password },
		fetcher
	);
}
