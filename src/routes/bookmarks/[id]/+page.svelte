<script lang="ts">
	import type { PageData } from './$types';

	type BoardCardItem = {
		id: string;
		front_text: string;
		back_text: string;
		reading_text: string | null;
		position: number;
		literal: string | null;
		kanji: {
			literal: string;
			meanings: string[];
			on_readings: string[];
			kun_readings: string[];
			jlpt_level: number | null;
			grade: number | null;
			stroke_count: number | null;
		} | null;
	};

	let { data }: { data: PageData } = $props();
	let cards = $state<BoardCardItem[]>([]);
	let actionError = $state('');

	$effect(() => {
		cards = [...data.cards];
		actionError = data.serviceError ?? '';
	});

	async function removeCard(card: BoardCardItem) {
		if (!data.board) {
			return;
		}

		const response = await fetch(`/api/boards/${encodeURIComponent(data.board.id)}/kanji`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ card_id: card.id })
		});
		const payload = (await response.json().catch(() => ({}))) as { message?: string };
		if (!response.ok) {
			actionError = payload.message || 'Failed to remove kanji from board.';
			return;
		}

		actionError = '';
		cards = cards.filter((current) => current.id !== card.id);
	}
</script>

<svelte:head>
	<title>{data.board?.name ?? 'Board'} — JLang Support</title>
</svelte:head>

<div class="space-y-8 py-4">
	<div class="flex flex-col gap-5 border-b border-outline-variant/30 pb-6 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<a href="/bookmarks" class="text-xs font-label uppercase tracking-[0.24em] text-secondary hover:text-primary">
				← Back to boards
			</a>
			<h1 class="mt-3 font-headline text-4xl font-bold text-on-surface">{data.board?.name ?? 'Board'}</h1>
			<p class="mt-2 text-sm leading-7 text-on-surface-variant">
				Remove kanji here or switch to Rein Flashcard to study the same synced deck.
			</p>
		</div>

		{#if data.board}
			<a
				href={`${data.flashcardAppUrl}/study?deck=${encodeURIComponent(data.board.id)}`}
				target="_blank"
				rel="noreferrer"
				class="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-label font-semibold text-on-secondary transition-opacity hover:opacity-90"
			>
				Study this board
				<span class="material-symbols-outlined text-[18px]">open_in_new</span>
			</a>
		{/if}
	</div>

	{#if actionError}
		<div class="rounded-[1.25rem] bg-error-container px-4 py-3 text-sm text-on-error-container">
			{actionError}
		</div>
	{/if}

	{#if data.serviceError}
		<div class="rounded-[1.5rem] bg-surface-container-low p-6">
			<p class="font-headline text-2xl text-on-surface">Flashcard service unavailable.</p>
			<p class="mt-2 text-sm leading-7 text-on-surface-variant">{data.serviceError}</p>
		</div>
	{:else if cards.length === 0}
		<div class="rounded-[1.75rem] bg-surface-container-lowest p-10 text-center">
			<span class="material-symbols-outlined block text-5xl text-outline-variant">bookmark_add</span>
			<p class="mt-4 font-headline text-2xl text-on-surface">This board is empty.</p>
			<p class="mt-2 text-sm text-on-surface-variant">Open a kanji detail page and save a character into this board.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each cards as card}
				<article class="rounded-[1.75rem] bg-surface-container-lowest p-6">
					<div class="flex items-start justify-between gap-4">
						<div class="flex items-start gap-4">
							{#if card.literal}
								<span class="font-headline text-6xl leading-none text-primary">{card.literal}</span>
							{/if}
							<div class="space-y-1">
								<p class="text-sm font-body font-medium text-on-surface">
									{card.kanji?.meanings?.slice(0, 3).join(', ') || card.front_text.split('\n').slice(1).join(' ')}
								</p>
								{#if card.kanji?.jlpt_level}
									<p class="text-xs font-label uppercase tracking-[0.24em] text-secondary">
										JLPT N{card.kanji.jlpt_level}
									</p>
								{/if}
							</div>
						</div>
						<button
							type="button"
							onclick={() => removeCard(card)}
							class="rounded-full bg-error-container px-3 py-1.5 text-xs font-label font-semibold text-on-error-container transition-opacity hover:opacity-90"
						>
							Remove
						</button>
					</div>

					<div class="mt-5 space-y-3 text-sm leading-7 text-on-surface-variant">
						<p>{card.back_text}</p>
						{#if card.reading_text}
							<p class="font-label text-xs uppercase tracking-[0.24em] text-outline">
								Primary reading: {card.reading_text}
							</p>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
