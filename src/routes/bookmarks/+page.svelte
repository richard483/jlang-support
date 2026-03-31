<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let bookmarks = $state<typeof data.bookmarks>([]);
	let exportPanelOpen = $state(false);
	let exportName = $state(`Kanji Bookmarks - ${new Date().toISOString().slice(0, 10)}`);
	let exportLoading = $state(false);
	let exportError = $state('');
	let exportResult = $state<{ card_count: number; flashcard_url: string } | null>(null);

	$effect(() => {
		bookmarks = [...data.bookmarks];
	});

	async function remove(literal: string) {
		await fetch(`/api/bookmarks/${encodeURIComponent(literal)}`, { method: 'DELETE' });
		bookmarks = bookmarks.filter((b) => b.kanji_literal !== literal);
		if (bookmarks.length === 0) {
			exportPanelOpen = false;
			exportResult = null;
		}
	}

	async function exportBookmarks() {
		exportLoading = true;
		exportError = '';
		exportResult = null;

		try {
			const response = await fetch('/api/flashcard-export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: exportName.trim() || `Kanji Bookmarks - ${new Date().toISOString().slice(0, 10)}`
				})
			});
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
				card_count?: number;
				flashcard_url?: string;
			};

			if (!response.ok) {
				throw new Error(payload.message || 'Failed to export bookmarks.');
			}

			exportResult = {
				card_count: payload.card_count ?? bookmarks.length,
				flashcard_url: payload.flashcard_url ?? '#'
			};
			exportPanelOpen = false;
		} catch (error) {
			exportError = error instanceof Error ? error.message : 'Failed to export bookmarks.';
		} finally {
			exportLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Bookmarks — JLang Support</title>
</svelte:head>

<div class="space-y-8 py-4">
	<div class="flex flex-col gap-5 border-b border-outline-variant/30 pb-6 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<h1 class="font-headline text-4xl font-bold text-on-surface">Bookmarks</h1>
			<p class="text-sm font-label text-outline mt-1">{bookmarks.length} saved kanji</p>
		</div>

		{#if bookmarks.length > 0}
			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={() => {
						exportPanelOpen = !exportPanelOpen;
						exportError = '';
						exportResult = null;
					}}
					class="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-label font-semibold text-on-secondary transition-opacity hover:opacity-90"
				>
					<span class="material-symbols-outlined text-[18px]">upload</span>
					Export to Flashcards
				</button>
			</div>
		{/if}
	</div>

	{#if exportPanelOpen}
		<div class="rounded-[1.75rem] bg-surface-container-low p-6">
			<div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div class="max-w-2xl">
					<p class="font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">Deck export</p>
					<h2 class="mt-2 font-headline text-3xl text-on-surface">Create a Rein Flashcard deck</h2>
					<p class="mt-2 text-sm leading-7 text-on-surface-variant">
						This exports all current bookmarks into a new deck using the same account you are signed into here.
					</p>
				</div>
				<div class="w-full max-w-xl space-y-3">
					<label class="block text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="deck-name">Deck name</label>
					<input
						id="deck-name"
						bind:value={exportName}
						type="text"
						class="w-full rounded-[1.25rem] bg-surface-container-high px-5 py-4 font-body text-base text-on-surface outline-none transition-colors focus:bg-surface-container-highest"
						placeholder="Kanji Bookmarks - 2026-03-31"
					/>
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							onclick={exportBookmarks}
							disabled={exportLoading}
							class="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-label font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
						>
							{exportLoading ? 'Exporting…' : 'Export'}
						</button>
						<button
							type="button"
							onclick={() => (exportPanelOpen = false)}
							class="inline-flex items-center justify-center rounded-full bg-surface-container-high px-5 py-3 text-sm font-label font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if exportError}
		<div class="rounded-[1.25rem] bg-error-container px-4 py-3 text-sm text-on-error-container">
			{exportError}
		</div>
	{/if}

	{#if exportResult}
		<div class="rounded-[1.5rem] bg-secondary-container/35 p-5">
			<p class="font-headline text-2xl text-on-surface">Deck created successfully.</p>
			<p class="mt-2 text-sm leading-7 text-on-surface-variant">
				{exportResult.card_count} cards were exported to Rein Flashcard.
			</p>
			<a
				href={exportResult.flashcard_url}
				target="_blank"
				rel="noreferrer"
				class="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-label font-semibold text-on-secondary transition-opacity hover:opacity-90"
			>
				Open flashcard deck
				<span class="material-symbols-outlined text-[18px]">open_in_new</span>
			</a>
		</div>
	{/if}

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
				<div class="bg-surface-container-lowest p-6 group relative rounded-[1.5rem]">
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
