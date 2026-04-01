<script lang="ts">
	type RadicalOption = {
		radical: string;
		kanji_count: number;
	};

	let {
		radicals,
		selected,
		resultCount,
		applyHref,
		onToggle,
		onClear
	}: {
		radicals: RadicalOption[];
		selected: string[];
		resultCount: number;
		applyHref: string;
		onToggle?: (radical: string) => void;
		onClear?: () => void;
	} = $props();

	let open = $state(false);

	$effect(() => {
		if (selected.length > 0) {
			open = true;
		}
	});
</script>

<section class="rounded-[1.75rem] bg-surface-container-low p-5">
	<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">Radicals</p>
			<p class="mt-2 text-sm leading-7 text-on-surface-variant">
				{#if selected.length > 0}
					Showing {resultCount.toLocaleString()} kanji with {selected.length} selected radical{selected.length === 1 ? '' : 's'}.
				{:else}
					Build a kanji set by selecting radicals, then apply the filter to the current browse results.
				{/if}
			</p>
		</div>
		<button
			type="button"
			onclick={() => (open = !open)}
			class="inline-flex items-center gap-1.5 text-xs font-label font-bold uppercase tracking-[0.24em] text-outline transition-colors hover:text-on-surface"
		>
			<span class="material-symbols-outlined text-base leading-none">
				{open ? 'expand_less' : 'expand_more'}
			</span>
			{open ? 'Hide' : 'Search by'} radicals
		</button>
	</div>

	{#if open}
		{#if selected.length > 0}
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<span class="text-xs font-label font-bold uppercase tracking-[0.24em] text-secondary">Selected</span>
				{#each selected as radical}
					<button
						type="button"
						onclick={() => onToggle?.(radical)}
						class="rounded-lg bg-primary/10 px-2.5 py-1 font-headline text-lg text-primary transition-colors hover:bg-primary/20"
					>
						{radical}
					</button>
				{/each}
			</div>
		{/if}

		<div class="mt-4 grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16">
			{#each radicals as option}
				<button
					type="button"
					onclick={() => onToggle?.(option.radical)}
					title={`${option.kanji_count} kanji`}
					class={`aspect-square rounded-lg font-headline text-lg transition-colors ${
						selected.includes(option.radical)
							? 'bg-primary text-on-primary'
							: 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
					}`}
				>
					{option.radical}
				</button>
			{/each}
		</div>

		<div class="mt-4 flex justify-end gap-2">
			<button
				type="button"
				onclick={() => onClear?.()}
				class="rounded-full bg-surface-container-high px-4 py-2 text-sm font-label text-on-surface transition-colors hover:bg-surface-container-highest"
			>
				Clear
			</button>
			<a
				href={applyHref}
				class="rounded-full bg-primary px-4 py-2 text-sm font-label font-semibold text-on-primary transition-opacity hover:opacity-90"
			>
				Apply
			</a>
		</div>
	{/if}
</section>
