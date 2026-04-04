<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { groupByStrokes } from '$lib/data/radicalStrokes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { radicals, selectedRadicals, availableRadicals, kanji, total, page, pageSize } = $derived(data);

	const totalPages = $derived(Math.ceil(total / pageSize));
	const grouped = $derived(groupByStrokes(radicals.map(r => r.radical)));
	const countMap = $derived(new Map(radicals.map(r => [r.radical, r.kanji_count])));
	const availableSet = $derived(availableRadicals ? new Set(availableRadicals) : null);
	const selectedSet = $derived(new Set(selectedRadicals));

	function isDisabled(radical: string): boolean {
		if (!availableSet) return false;
		return !availableSet.has(radical);
	}

	function toggleRadical(radical: string) {
		let next: string[];
		if (selectedSet.has(radical)) {
			next = selectedRadicals.filter(r => r !== radical);
		} else {
			next = [...selectedRadicals, radical];
		}

		const params = new URLSearchParams();
		if (next.length > 0) {
			params.set('radicals', next.join(','));
		}
		const url = next.length > 0 ? `/radicals?${params}` : '/radicals';
		goto(url, { invalidateAll: true });
	}

	function pageUrl(pg: number) {
		const params = new URLSearchParams();
		if (selectedRadicals.length > 0) {
			params.set('radicals', selectedRadicals.join(','));
		}
		if (pg > 1) params.set('page', String(pg));
		return selectedRadicals.length > 0 ? `/radicals?${params}` : `/radicals?page=${pg}`;
	}
</script>

<svelte:head>
	<title>Radical Search — JLang Support</title>
</svelte:head>

<div class="space-y-10 py-4">
	<div class="border-b border-outline-variant/30 pb-4">
		<h1 class="font-headline text-4xl font-bold text-on-surface">Radical Search</h1>
		<p class="text-sm font-label text-outline mt-1">Find kanji by their component radicals</p>
	</div>

	{#if $navigating}
		<div class="text-sm font-label text-outline animate-pulse">Updating results...</div>
	{/if}

	{#if selectedRadicals.length > 0}
		<div class="flex items-center gap-3 flex-wrap">
			<span class="text-xs font-label font-bold uppercase tracking-widest text-secondary">Selected:</span>
			{#each selectedRadicals as r}
				<button
					onclick={() => toggleRadical(r)}
					class="font-headline text-xl text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
				>
					{r}
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			{/each}
			<span class="text-sm font-label text-outline ml-2">
				{total} kanji match{total !== 1 ? 'es' : ''}
			</span>
			<a href="/radicals" class="text-xs font-label text-outline hover:text-error transition-colors ml-auto">
				Clear all
			</a>
		</div>
	{/if}

	<section class="space-y-6">
		<span class="text-xs font-label font-bold uppercase tracking-widest text-outline">Select radicals</span>

		<div class="space-y-4 rounded-[1.75rem] bg-surface-container-low p-6">
			{#each [...grouped.entries()] as [strokes, chars]}
				<div class="space-y-2">
					<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline">
						{strokes} stroke{strokes !== 1 ? 's' : ''}
					</span>
					<div class="flex flex-wrap gap-1.5">
						{#each chars as radical}
							{@const selected = selectedSet.has(radical)}
							{@const disabled = isDisabled(radical)}
							<button
								onclick={() => toggleRadical(radical)}
								disabled={disabled}
								title="{countMap.get(radical) ?? 0} kanji"
								class="w-10 h-10 flex items-center justify-center font-headline text-lg rounded-lg transition-colors
									{selected
										? 'bg-primary text-on-primary'
										: disabled
											? 'bg-surface-container-lowest text-outline/30 cursor-not-allowed'
											: 'bg-surface-container-lowest text-on-surface hover:bg-surface-container hover:text-primary'}"
							>{radical}</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	{#if selectedRadicals.length > 0 && kanji.length > 0}
		<section class="space-y-6">
			<div class="border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-2xl font-bold text-secondary">
					Results
					<span class="ml-2 text-sm font-label font-normal text-outline">
						{total} kanji with all selected radicals
					</span>
				</h2>
			</div>

			<div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
				{#each kanji as k}
					<a
						href="/kanji/{encodeURIComponent(k.literal)}"
						title="{k.meanings?.slice(0, 2).join(', ')}"
						class="aspect-square flex items-center justify-center font-headline text-2xl bg-surface-container-lowest hover:bg-surface-container-low hover:text-primary transition-colors"
					>{k.literal}</a>
				{/each}
			</div>

			{#if totalPages > 1}
				<div class="flex items-center gap-3 justify-center pt-4">
					{#if page > 1}
						<a href={pageUrl(page - 1)}
							class="px-4 py-2 text-sm font-label bg-surface-container-low hover:bg-surface-container transition-colors rounded-full">
							← Prev
						</a>
					{/if}
					<span class="text-sm font-label text-outline">Page {page} of {totalPages}</span>
					{#if page < totalPages}
						<a href={pageUrl(page + 1)}
							class="px-4 py-2 text-sm font-label bg-surface-container-low hover:bg-surface-container transition-colors rounded-full">
							Next →
						</a>
					{/if}
				</div>
			{/if}
		</section>
	{:else if selectedRadicals.length > 0 && kanji.length === 0}
		<p class="text-sm font-label text-outline">No kanji found with all selected radicals.</p>
	{/if}
</div>
