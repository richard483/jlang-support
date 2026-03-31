<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let token = $state(data.token);
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	$effect(() => {
		token = data.token;
	});

	function getResetRedirectUrl() {
		const redirectUrl = new URL('/reset-password', window.location.origin);
		redirectUrl.searchParams.delete('token');
		return redirectUrl.toString();
	}

	async function submit() {
		errorMessage = '';
		successMessage = '';
		loading = true;

		try {
			if (token) {
				if (password !== confirmPassword) {
					throw new Error('Passwords do not match.');
				}

				const response = await fetch('/api/auth/reset-password', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						token,
						password,
						confirm_password: confirmPassword
					})
				});
				const payload = (await response.json().catch(() => ({}))) as { message?: string };
				if (!response.ok) {
					throw new Error(payload.message || 'Unable to reset password.');
				}

				successMessage = 'Password reset complete. You can sign in with your new password now.';
				return;
			}

			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					redirect_url: getResetRedirectUrl()
				})
			});
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message || 'Unable to request password reset.');
			}

			successMessage = 'If the email exists, a password reset link has been sent.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to continue.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Reset Password — JLang Support</title>
</svelte:head>

<section class="mx-auto max-w-3xl py-10">
	<div class="rounded-[2rem] bg-surface-container-low p-6 md:p-8">
		<p class="font-label text-xs font-bold uppercase tracking-[0.3em] text-secondary">
			{token ? 'Create a new password' : 'Recover access'}
		</p>
		<h1 class="mt-4 font-headline text-4xl font-bold text-on-surface">
			{token ? 'Choose a fresh password' : 'Send yourself a reset link'}
		</h1>
		<p class="mt-3 max-w-2xl text-base leading-8 text-on-surface-variant">
			{#if token}
				Use a strong password you have not used before. Once saved, your JLang Support and Rein Flashcard sessions will both use the updated credential.
			{:else}
				Enter the email tied to your karasu-auth account. The reset email links back to this page with your token prefilled.
			{/if}
		</p>

		<form
			class="mt-8 space-y-5"
			onsubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			{#if token}
				<div class="space-y-2">
					<label class="text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="password">New password</label>
					<input
						id="password"
						bind:value={password}
						type="password"
						autocomplete="new-password"
						class="w-full rounded-[1.25rem] bg-surface-container-high px-5 py-4 font-body text-base text-on-surface outline-none transition-colors focus:bg-surface-container-highest"
						placeholder="••••••••"
						required
					/>
				</div>
				<div class="space-y-2">
					<label class="text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="confirm-password">Confirm password</label>
					<input
						id="confirm-password"
						bind:value={confirmPassword}
						type="password"
						autocomplete="new-password"
						class="w-full rounded-[1.25rem] bg-surface-container-high px-5 py-4 font-body text-base text-on-surface outline-none transition-colors focus:bg-surface-container-highest"
						placeholder="Repeat your new password"
						required
					/>
				</div>
			{:else}
				<div class="space-y-2">
					<label class="text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="email">Email</label>
					<input
						id="email"
						bind:value={email}
						type="email"
						autocomplete="email"
						class="w-full rounded-[1.25rem] bg-surface-container-high px-5 py-4 font-body text-base text-on-surface outline-none transition-colors focus:bg-surface-container-highest"
						placeholder="you@example.com"
						required
					/>
				</div>
			{/if}

			{#if errorMessage}
				<div class="rounded-[1.25rem] bg-error-container px-4 py-3 text-sm text-on-error-container">
					{errorMessage}
				</div>
			{/if}

			{#if successMessage}
				<div class="rounded-[1.25rem] bg-secondary-container/40 px-4 py-3 text-sm text-on-surface">
					{successMessage}
				</div>
			{/if}

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="submit"
					disabled={loading}
					class="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-label text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
				>
					{loading ? 'Processing…' : token ? 'Reset password' : 'Send reset link'}
				</button>
				<a href="/login" class="inline-flex items-center justify-center rounded-full bg-surface-container-high px-6 py-3 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest">
					Back to login
				</a>
			</div>
		</form>
	</div>
</section>
