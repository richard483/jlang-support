<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';

	let { children } = $props();

	const navLinks = [
		{ href: '/browse', label: 'Browse' },
		{ href: '/bookmarks', label: 'Bookmarks' },
		{ href: '/conjugate', label: 'Conjugate' }
	];
</script>

<div class="min-h-screen flex flex-col bg-background text-on-surface">
	<!-- Nav -->
	<nav class="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/20">
		<div class="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
			<a href="/" class="font-headline text-2xl font-bold text-primary tracking-tight hover:opacity-80 transition-opacity">
				JLang Support
			</a>
			<div class="hidden md:flex items-center gap-10">
				{#each navLinks as link}
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
			</div>
			<div class="flex items-center gap-2">
				<a href="/" class="p-2 rounded-full hover:bg-surface-container-low transition-colors">
					<span class="material-symbols-outlined text-primary">search</span>
				</a>
			</div>
		</div>
	</nav>

	<!-- Page content -->
	<main class="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="bg-surface-container-highest mt-20">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-10 py-12 gap-6">
			<span class="font-headline text-lg font-semibold text-secondary">JLang Support</span>

			<div class="flex flex-wrap justify-center gap-8">
				{#each navLinks as link}
					<a href={link.href} class="font-label text-sm uppercase tracking-widest text-secondary hover:text-primary transition-colors opacity-80 hover:opacity-100">
						{link.label}
					</a>
				{/each}
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
