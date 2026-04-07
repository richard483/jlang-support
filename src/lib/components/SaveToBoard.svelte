<script lang="ts">
	type BoardMembership = {
		id: string;
		name: string;
		card_count: number;
		isSaved: boolean;
		cardId: string | null;
	};

	type User = {
		id: string;
		username: string;
	};

	type ToggleArgs = {
		boardId: string;
		cardId?: string;
	};

	type CreateArgs = {
		name: string;
	};

	let {
		boards,
		user,
		itemType,
		itemId,
		serviceError = '',
		actionError = '',
		busyBoardId = '',
		creatingBoard = false,
		onAdd,
		onRemove,
		onCreate
	}: {
		boards: BoardMembership[] | null;
		user: User | null;
		itemType: 'kanji' | 'vocab';
		itemId: string;
		serviceError?: string;
		actionError?: string;
		busyBoardId?: string;
		creatingBoard?: boolean;
		onAdd?: (args: ToggleArgs) => Promise<void> | void;
		onRemove?: (args: ToggleArgs) => Promise<void> | void;
		onCreate?: (args: CreateArgs) => Promise<void> | void;
	} = $props();

	let panelOpen = $state(false);
	let panelEl = $state<HTMLDivElement | null>(null);
	let newBoardName = $state('');
	let localError = $state('');

	const isAuthenticated = $derived(Boolean(user));
	const boardList = $derived(boards ?? []);
	const savedBoardCount = $derived(boardList.filter((board) => board.isSaved).length);
	const saveLabel = $derived(
		savedBoardCount === 0 ? 'Save to Board' : `Saved in ${savedBoardCount} board${savedBoardCount === 1 ? '' : 's'}`
	);
	const loginHref = $derived(
		`/login?redirectTo=${encodeURIComponent(itemType === 'kanji' ? `/kanji/${itemId}` : `/vocab/${itemId}`)}`
	);
	const combinedError = $derived(localError || actionError);

	$effect(() => {
		if (!actionError) {
			localError = '';
		}
	});

	function closePanel() {
		panelOpen = false;
		localError = '';
	}

	function handleWindowClick(event: MouseEvent) {
		if (!panelOpen || !panelEl) {
			return;
		}

		const target = event.target;
		if (target instanceof Node && panelEl.contains(target)) {
			return;
		}

		closePanel();
	}

	async function toggleBoard(board: BoardMembership) {
		localError = '';

		try {
			if (board.isSaved) {
				await onRemove?.({ boardId: board.id, cardId: board.cardId ?? undefined });
				return;
			}

			await onAdd?.({ boardId: board.id });
		} catch (error) {
			localError = error instanceof Error ? error.message : 'Failed to update board.';
		}
	}

	async function createBoard() {
		if (!newBoardName.trim()) {
			localError = 'Board name is required.';
			return;
		}

		localError = '';
		try {
			await onCreate?.({ name: newBoardName.trim() });
			newBoardName = '';
		} catch (error) {
			localError = error instanceof Error ? error.message : 'Failed to create board.';
		}
	}
</script>

<svelte:window onclick={handleWindowClick} />

{#if !isAuthenticated}
	<a
		href={loginHref}
		class="ml-auto inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-xs font-label font-medium text-outline transition-colors hover:text-on-surface"
	>
		<span class="material-symbols-outlined text-base leading-none">login</span>
		Login to save
	</a>
{:else if serviceError || boards === null}
	<button
		type="button"
		disabled
		title={serviceError || 'Board service unavailable'}
		class="ml-auto flex items-center gap-1.5 rounded-full bg-surface-container-high px-4 py-2 text-xs font-label font-medium text-outline opacity-70"
	>
		<span class="material-symbols-outlined text-base leading-none">cloud_off</span>
		Boards unavailable
	</button>
{:else}
	<div class="ml-auto relative" bind:this={panelEl}>
		<button
			type="button"
			onclick={() => {
				panelOpen = !panelOpen;
				localError = '';
			}}
			class="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-label font-medium transition-colors
				{savedBoardCount > 0 ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-outline hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-base leading-none">
				{savedBoardCount > 0 ? 'bookmark_added' : 'bookmark_add'}
			</span>
			{saveLabel}
		</button>

		{#if panelOpen}
			<div class="absolute right-0 z-20 mt-3 w-[min(26rem,calc(100vw-3rem))] rounded-[1.75rem] bg-surface-container-low p-5 shadow-xl ring-1 ring-outline-variant/10">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">Board picker</p>
						<p class="mt-2 text-sm leading-7 text-on-surface-variant">
							Save this {itemType === 'kanji' ? 'kanji' : 'vocabulary item'} into one or more synced study boards.
						</p>
					</div>
					<a
						href="/bookmarks"
						class="text-xs font-label uppercase tracking-[0.24em] text-primary hover:underline"
					>
						Manage boards
					</a>
				</div>

				<div class="mt-5 grid gap-3">
					{#if boardList.length === 0}
						<p class="text-sm leading-7 text-on-surface-variant">
							No boards yet. Create one below and this {itemType === 'kanji' ? 'kanji' : 'vocabulary item'} will be added immediately.
						</p>
					{:else}
						{#each boardList as board}
							<button
								type="button"
								onclick={() => toggleBoard(board)}
								disabled={busyBoardId === board.id}
								class={`flex items-center justify-between rounded-[1.25rem] px-4 py-3 text-left transition-colors ${
									board.isSaved
										? 'bg-primary/10 text-primary'
										: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
								}`}
							>
								<div>
									<p class="font-headline text-lg">{board.name}</p>
									<p class="text-xs font-label uppercase tracking-[0.24em] text-outline">
										{board.card_count} cards
									</p>
								</div>
								<span class="material-symbols-outlined text-xl">
									{busyBoardId === board.id
										? 'progress_activity'
										: board.isSaved
											? 'check_circle'
											: 'add_circle'}
								</span>
							</button>
						{/each}
					{/if}
				</div>

				<div class="mt-5 rounded-[1.25rem] bg-surface-container-high p-4">
					<label class="block text-xs font-label font-bold uppercase tracking-[0.24em] text-outline" for="save-to-board-name">
						Create new board
					</label>
					<div class="mt-3 flex flex-col gap-3 sm:flex-row">
						<input
							id="save-to-board-name"
							bind:value={newBoardName}
							type="text"
							placeholder={itemType === 'kanji' ? 'Newspaper kanji' : 'Daily phrases'}
							class="flex-1 rounded-[1rem] bg-surface-container-highest px-4 py-3 font-body text-sm text-on-surface outline-none"
						/>
						<button
							type="button"
							onclick={createBoard}
							disabled={creatingBoard}
							class="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-label font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
						>
							{creatingBoard ? 'Creating…' : 'Create + Save'}
						</button>
					</div>
				</div>

				{#if combinedError}
					<div class="mt-4 rounded-[1.25rem] bg-error-container px-4 py-3 text-sm text-on-error-container">
						{combinedError}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
