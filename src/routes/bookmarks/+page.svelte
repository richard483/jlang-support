<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let bookmarks = $state<typeof data.bookmarks>([]);
	$effect(() => { bookmarks = [...data.bookmarks]; });

	async function remove(literal: string) {
		await fetch(`/api/bookmarks/${encodeURIComponent(literal)}`, { method: 'DELETE' });
		bookmarks = bookmarks.filter((b) => b.kanji_literal !== literal);
	}
</script>

<svelte:head>
	<title>Bookmarks — JLang Support</title>
</svelte:head>

<div class="space-y-8 py-4">
	<div class="border-b border-outline-variant/30 pb-4">
		<h1 class="font-headline text-4xl font-bold text-on-surface">Bookmarks</h1>
		<p class="text-sm font-label text-outline mt-1">{bookmarks.length} saved kanji</p>
	</div>

	{#if bookmarks.length === 0}
		<div class="text-center py-20">
			<span class="material-symbols-outlined text-5xl text-outline-variant block mb-4">bookmark_border</span>
			<p class="font-headline text-xl text-on-surface-variant">No bookmarks yet.</p>
			<p class="text-sm font-body text-outline mt-2">Visit a kanji page and save it to see it here.</p>
			<a href="/browse" class="inline-block mt-6 px-6 py-2.5 bg-primary text-on-primary rounded-full font-label font-semibold text-sm hover:opacity-90 transition-opacity">
				Browse Kanji
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each bookmarks as b}
				<div class="bg-surface-container-lowest p-6 group relative">
					<a href="/kanji/{encodeURIComponent(b.kanji_literal)}" class="flex items-start gap-4">
						<span class="font-headline text-6xl text-primary leading-none">{b.kanji_literal}</span>
						<div class="flex-1 min-w-0 space-y-1 pt-1">
							{#if b.meanings?.length > 0}
								<p class="font-body text-sm text-on-surface font-medium truncate">{b.meanings.slice(0, 3).join(', ')}</p>
							{/if}
							{#if b.jlpt_level}
								<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase">JLPT N{b.jlpt_level}</span>
							{/if}
						</div>
					</a>
					<button
						onclick={() => remove(b.kanji_literal)}
						class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-label text-error hover:underline"
					>remove</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
