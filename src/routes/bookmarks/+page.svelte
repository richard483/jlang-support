<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	type BoardListItem = {
		id: string;
		name: string;
		card_count: number;
		preview: string[];
		source_updated_at: string | null;
	};

	let { data }: { data: PageData } = $props();
	let boards = $state<BoardListItem[]>([]);
	let newBoardName = $state('');
	let creatingBoard = $state(false);
	let actionError = $state('');

	$effect(() => {
		boards = [...data.boards];
		actionError = data.serviceError ?? '';
	});

	async function createBoard() {
		if (!newBoardName.trim()) {
			actionError = 'Board name is required.';
			return;
		}

		creatingBoard = true;
		actionError = '';

		try {
			const response = await fetch('/api/boards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newBoardName.trim() })
			});
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
				deck_id?: string;
			};

			if (!response.ok || !payload.deck_id) {
				throw new Error(payload.message || 'Failed to create board.');
			}

			newBoardName = '';
			await goto(`/bookmarks/${encodeURIComponent(payload.deck_id)}`);
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'Failed to create board.';
		} finally {
			creatingBoard = false;
		}
	}

	async function renameBoard(board: BoardListItem) {
		const nextName = window.prompt('Rename board', board.name)?.trim();
		if (!nextName || nextName === board.name) {
			return;
		}

		const response = await fetch(`/api/boards/${encodeURIComponent(board.id)}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: nextName })
		});
		const payload = (await response.json().catch(() => ({}))) as { message?: string };
		if (!response.ok) {
			actionError = payload.message || 'Failed to rename board.';
			return;
		}

		actionError = '';
		boards = boards.map((current) =>
			current.id === board.id ? { ...current, name: nextName } : current
		);
	}

	async function deleteBoard(board: BoardListItem) {
		if (!window.confirm(`Delete "${board.name}"? This also removes the study deck in Rein Flashcard.`)) {
			return;
		}

		const response = await fetch(`/api/boards/${encodeURIComponent(board.id)}`, {
			method: 'DELETE'
		});
		const payload = (await response.json().catch(() => ({}))) as { message?: string };
		if (!response.ok) {
			actionError = payload.message || 'Failed to delete board.';
			return;
		}

		actionError = '';
		boards = boards.filter((current) => current.id !== board.id);
	}
</script>

<svelte:head>
	<title>Boards — JLang Support</title>
</svelte:head>

<div class="space-y-8 py-4">
	<div class="flex flex-col gap-6 border-b border-outline-variant/30 pb-6 lg:flex-row lg:items-end lg:justify-between">
		<div class="max-w-3xl">
			<p class="font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">Board Library</p>
			<h1 class="mt-2 font-headline text-4xl font-bold text-on-surface">Boards synced with Rein Flashcard.</h1>
			<p class="mt-3 text-sm leading-7 text-on-surface-variant">
				Create focused collections here, then jump into the flashcard app to study the same deck immediately.
			</p>
		</div>

		<a
			href={data.flashcardAppUrl}
			target="_blank"
			rel="noreferrer"
			class="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-label font-semibold text-on-secondary transition-opacity hover:opacity-90"
		>
			Open Rein Flashcard
			<span class="material-symbols-outlined text-[18px]">open_in_new</span>
		</a>
	</div>

	<div class="rounded-[1.75rem] bg-surface-container-low p-6">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-end">
			<div class="flex-1">
				<label class="block text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="board-name">
					Create new board
				</label>
				<input
					id="board-name"
					bind:value={newBoardName}
					type="text"
					placeholder="Kanji for newspapers"
					class="mt-3 w-full rounded-[1.25rem] bg-surface-container-high px-5 py-4 font-body text-base text-on-surface outline-none transition-colors focus:bg-surface-container-highest"
				/>
			</div>
			<button
				type="button"
				onclick={createBoard}
				disabled={creatingBoard || Boolean(data.serviceError)}
				class="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-label font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
			>
				{creatingBoard ? 'Creating…' : 'Create board'}
			</button>
		</div>
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
	{:else if boards.length === 0}
		<div class="rounded-[1.75rem] bg-surface-container-lowest p-10 text-center">
			<span class="material-symbols-outlined block text-5xl text-outline-variant">dashboard_customize</span>
			<p class="mt-4 font-headline text-2xl text-on-surface">No boards yet.</p>
			<p class="mt-2 text-sm text-on-surface-variant">Create a board, then start saving kanji from any detail page.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each boards as board}
				<article class="rounded-[1.75rem] bg-surface-container-lowest p-6">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="font-headline text-2xl text-on-surface">{board.name}</p>
							<p class="mt-1 text-xs font-label uppercase tracking-[0.24em] text-outline">
								{board.card_count} cards
							</p>
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => renameBoard(board)}
								class="rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-label font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
							>
								Rename
							</button>
							<button
								type="button"
								onclick={() => deleteBoard(board)}
								class="rounded-full bg-error-container px-3 py-1.5 text-xs font-label font-semibold text-on-error-container transition-opacity hover:opacity-90"
							>
								Delete
							</button>
						</div>
					</div>

					<div class="mt-6 flex min-h-[4.5rem] flex-wrap gap-3">
						{#if board.preview.length > 0}
							{#each board.preview as literal}
								<span class="inline-flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-surface-container-high font-headline text-3xl text-primary">
									{literal}
								</span>
							{/each}
						{:else}
							<p class="text-sm leading-7 text-on-surface-variant">No kanji saved yet. Open a kanji page and add it to this board.</p>
						{/if}
					</div>

					<div class="mt-6 flex flex-wrap gap-3">
						<a
							href={`/bookmarks/${encodeURIComponent(board.id)}`}
							class="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-label font-semibold text-on-primary transition-opacity hover:opacity-90"
						>
							View board
						</a>
						<a
							href={`${data.flashcardAppUrl}/study?deck=${encodeURIComponent(board.id)}`}
							target="_blank"
							rel="noreferrer"
							class="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-label font-semibold text-on-secondary transition-opacity hover:opacity-90"
						>
							Study
							<span class="material-symbols-outlined text-[18px]">open_in_new</span>
						</a>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
