<script lang="ts">
	import './layout.css';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const publicNavLinks = [
		{ href: '/browse', label: 'Browse' },
		{ href: '/conjugate', label: 'Conjugate' }
	];

	let loggingOut = $state(false);

	async function handleLogout() {
		loggingOut = true;

		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} finally {
			loggingOut = false;
			await invalidateAll();
			await goto('/');
		}
	}
</script>

<div class="min-h-screen flex flex-col bg-background text-on-surface">
	<nav class="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/20">
		<div class="max-w-7xl mx-auto flex justify-between items-center px-8 py-4 gap-6">
			<a href="/" class="font-headline text-2xl font-bold text-primary tracking-tight hover:opacity-80 transition-opacity">
				JLang Support
			</a>

			<div class="hidden md:flex items-center gap-10">
				{#each publicNavLinks as link}
					<a
						href={link.href}
						class="font-headline text-base font-medium tracking-tight transition-all duration-200 pb-0.5
							{$page.url.pathname.startsWith(link.href)
								? 'text-primary border-b-2 border-primary'
								: 'text-secondary hover:text-primary'}"
					>
						{link.label}
					</a>
				{/each}

				{#if data.user}
					<a
						href="/bookmarks"
						class="font-headline text-base font-medium tracking-tight transition-all duration-200 pb-0.5
							{$page.url.pathname.startsWith('/bookmarks')
								? 'text-primary border-b-2 border-primary'
								: 'text-secondary hover:text-primary'}"
					>
						Bookmarks
					</a>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				<a href="/" class="p-2 rounded-full hover:bg-surface-container-low transition-colors" aria-label="Search">
					<span class="material-symbols-outlined text-primary">search</span>
				</a>

				{#if data.user}
					<div class="hidden sm:flex items-center gap-3 rounded-full bg-surface-container-low px-4 py-2">
						<div class="text-right">
							<p class="font-label text-[10px] uppercase tracking-[0.24em] text-outline">Signed in</p>
							<p class="font-body text-sm font-semibold text-on-surface">{data.user.username}</p>
						</div>
						<button
							type="button"
							class="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-label font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
							onclick={handleLogout}
							disabled={loggingOut}
						>
							{loggingOut ? 'Logging out…' : 'Logout'}
						</button>
					</div>
				{:else}
					<a
						href="/login"
						class="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-label font-semibold text-on-primary transition-opacity hover:opacity-90"
					>
						Login
					</a>
				{/if}
			</div>
		</div>
	</nav>

	<main class="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
		{@render children()}
	</main>

	<footer class="bg-surface-container-highest mt-20">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-10 py-12 gap-6">
			<span class="font-headline text-lg font-semibold text-secondary">JLang Support</span>

			<div class="flex flex-wrap justify-center gap-8">
				{#each publicNavLinks as link}
					<a href={link.href} class="font-label text-sm uppercase tracking-widest text-secondary hover:text-primary transition-colors opacity-80 hover:opacity-100">
						{link.label}
					</a>
				{/each}
				{#if data.user}
					<a href="/bookmarks" class="font-label text-sm uppercase tracking-widest text-secondary hover:text-primary transition-colors opacity-80 hover:opacity-100">
						Bookmarks
					</a>
				{/if}
				<a
					href="https://ko-fi.com/H2H01LIGX3"
					target="_blank"
					rel="noopener noreferrer"
					class="font-label text-sm uppercase tracking-widest text-secondary hover:text-primary transition-colors opacity-80 hover:opacity-100"
				>
					Support on Ko-fi
				</a>
			</div>

			<div class="text-xs font-label text-outline uppercase tracking-widest text-center md:text-right">
				© {new Date().getFullYear()} JLang Support.<br />Crafted with intentionality.
			</div>
		</div>
	</footer>
</div>
