<script lang="ts">
	import type { PageData } from './$types';

	type BoardCardItem = {
		id: string;
		front_text: string;
		back_text: string;
		reading_text: string | null;
		position: number;
		type: 'kanji' | 'vocab' | 'unknown';
		identifier: string;
		summary: string;
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

		const route = card.type === 'vocab' ? 'vocab' : 'kanji';
		const response = await fetch(`/api/boards/${encodeURIComponent(data.board.id)}/${route}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ card_id: card.id })
		});
		const payload = (await response.json().catch(() => ({}))) as { message?: string };
		if (!response.ok) {
			actionError = payload.message || 'Failed to remove item from board.';
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
				Remove kanji or vocabulary here, or switch to Rein Flashcard to study the same synced deck.
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
			<p class="mt-2 text-sm text-on-surface-variant">Open a kanji or vocabulary detail page and save an item into this board.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each cards as card}
				<article class="rounded-[1.75rem] bg-surface-container-lowest p-6">
					<div class="flex items-start justify-between gap-4">
						<div class="flex items-start gap-4">
							{#if card.type === 'kanji' && [...card.identifier].length === 1}
								<span class="font-headline text-6xl leading-none text-primary">{card.identifier}</span>
							{:else}
								<div class="rounded-[1.25rem] bg-surface-container-high px-4 py-3 text-sm font-label font-semibold uppercase tracking-[0.24em] text-secondary">
									{card.type === 'vocab' ? 'Vocab' : 'Card'}
								</div>
							{/if}
							<div class="space-y-1">
								<div class="flex flex-wrap items-center gap-2">
									{#if card.type === 'vocab' || card.type === 'kanji'}
										<a
											href={card.type === 'vocab'
												? `/vocab/${encodeURIComponent(card.identifier)}`
												: `/kanji/${encodeURIComponent(card.identifier)}`}
											class="font-headline text-2xl text-on-surface hover:text-primary"
										>
											{card.identifier}
										</a>
									{:else}
										<p class="font-headline text-2xl text-on-surface">{card.identifier}</p>
									{/if}
									<span class="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-label font-bold uppercase tracking-[0.24em] text-outline">
										{card.type === 'vocab' ? 'Vocab' : card.type === 'kanji' ? 'Kanji' : 'Card'}
									</span>
								</div>
								{#if card.summary}
									<p class="text-sm font-body font-medium text-on-surface">
										{card.summary}
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
						{#if card.back_text}
							<p>{card.back_text}</p>
						{/if}
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
