<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let mode = $state<'login' | 'register'>('login');
	let userName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	async function submit() {
		errorMessage = '';
		successMessage = '';

		if (mode === 'register' && password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			return;
		}

		loading = true;

		try {
			const response = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body:
					mode === 'login'
						? JSON.stringify({ user_name: userName, password })
						: JSON.stringify({
								user_name: userName,
								email,
								password,
								confirm_password: confirmPassword
							})
			});

			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message || 'Authentication failed.');
			}

			if (mode === 'login') {
				await goto(data.redirectTo || '/');
				return;
			}

			successMessage = 'Account created. Check your email for verification, then sign in.';
			mode = 'login';
			password = '';
			confirmPassword = '';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Authentication failed.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login — JLang Support</title>
</svelte:head>

<section class="mx-auto grid max-w-6xl gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
	<div class="space-y-8 rounded-[2rem] bg-gradient-to-br from-primary/10 via-surface to-secondary/10 p-8 md:p-12">
		<p class="font-label text-xs font-bold uppercase tracking-[0.3em] text-secondary">Shared Account</p>
		<h1 class="font-headline text-5xl font-bold leading-tight text-on-surface md:text-6xl">
			One login for kanji study and flashcards.
		</h1>
		<p class="max-w-xl text-base leading-8 text-on-surface-variant">
			Use your karasu-auth account in JLang Support, keep personal bookmarks private, and export them directly into Rein Flashcard when you are ready to drill.
		</p>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="rounded-[1.5rem] bg-surface-container-lowest/80 p-6">
				<p class="font-headline text-2xl text-primary">Bookmark privately</p>
				<p class="mt-2 text-sm leading-7 text-on-surface-variant">
					Your saved kanji and mnemonics stay tied to your own account across devices.
				</p>
			</div>
			<div class="rounded-[1.5rem] bg-surface-container-lowest/80 p-6">
				<p class="font-headline text-2xl text-secondary">Export in one click</p>
				<p class="mt-2 text-sm leading-7 text-on-surface-variant">
					Send bookmarked kanji to Rein Flashcard as a ready-made deck without leaving the app.
				</p>
			</div>
		</div>
	</div>

	<div class="rounded-[2rem] bg-surface-container-low p-6 md:p-8">
		<div class="inline-flex rounded-full bg-surface-container-high p-1">
			<button
				type="button"
				class={`rounded-full px-5 py-2 text-sm font-label font-semibold transition-colors ${mode === 'login' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
				onclick={() => {
					mode = 'login';
					errorMessage = '';
					successMessage = '';
				}}
			>
				Login
			</button>
			<button
				type="button"
				class={`rounded-full px-5 py-2 text-sm font-label font-semibold transition-colors ${mode === 'register' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
				onclick={() => {
					mode = 'register';
					errorMessage = '';
					successMessage = '';
				}}
			>
				Register
			</button>
		</div>

		<form class="mt-8 space-y-5" on:submit|preventDefault={submit}>
			<div class="space-y-2">
				<label class="text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="username">Username</label>
				<input
					id="username"
					bind:value={userName}
					type="text"
					autocomplete="username"
					class="w-full rounded-[1.25rem] bg-surface-container-high px-5 py-4 font-body text-base text-on-surface outline-none transition-colors focus:bg-surface-container-highest"
					placeholder="your-handle"
					required
				/>
			</div>

			{#if mode === 'register'}
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

			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label class="text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="password">Password</label>
					{#if mode === 'login'}
						<a href="/reset-password" class="text-xs font-label text-secondary hover:text-primary hover:underline">
							Forgot password?
						</a>
					{/if}
				</div>
				<input
					id="password"
					bind:value={password}
					type="password"
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					class="w-full rounded-[1.25rem] bg-surface-container-high px-5 py-4 font-body text-base text-on-surface outline-none transition-colors focus:bg-surface-container-highest"
					placeholder="••••••••"
					required
				/>
			</div>

			{#if mode === 'register'}
				<div class="space-y-2">
					<label class="text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="confirm-password">Confirm password</label>
					<input
						id="confirm-password"
						bind:value={confirmPassword}
						type="password"
						autocomplete="new-password"
						class="w-full rounded-[1.25rem] bg-surface-container-high px-5 py-4 font-body text-base text-on-surface outline-none transition-colors focus:bg-surface-container-highest"
						placeholder="Repeat your password"
						required
					/>
				</div>
				<div class="rounded-[1.25rem] bg-primary/8 p-4 text-sm leading-7 text-on-surface-variant">
					<p class="font-label text-xs font-bold uppercase tracking-[0.24em] text-primary">Password rules</p>
					<p class="mt-2">Minimum 8 characters, with at least one uppercase letter, one number, and one special character.</p>
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

			<button
				type="submit"
				disabled={loading}
				class="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 font-label text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
			>
				{#if loading}
					Processing…
				{:else if mode === 'login'}
					Log in
				{:else}
					Create account
				{/if}
			</button>
		</form>
	</div>
</section>
