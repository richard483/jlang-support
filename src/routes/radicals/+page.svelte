<script lang="ts">
	import { groupByStrokes } from '$lib/data/radicalStrokes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { radicals, selectedRadical, kanji, total, page, pageSize } = $derived(data);

	let localSelected = $state<string | null>(null);

	$effect(() => {
		localSelected = selectedRadical;
	});

	const totalPages = $derived(Math.ceil(total / pageSize));
	const grouped = $derived(groupByStrokes(radicals.map(r => r.radical)));

	const countMap = $derived(new Map(radicals.map(r => [r.radical, r.kanji_count])));

	function selectRadical(radical: string) {
		localSelected = localSelected === radical ? null : radical;
	}

	function searchUrl(pg = 1) {
		if (!localSelected) return '/radicals';
		const params = new URLSearchParams();
		params.set('radical', localSelected);
		if (pg > 1) params.set('page', String(pg));
		return `/radicals?${params}`;
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

	<section class="space-y-6">
		<span class="text-xs font-label font-bold uppercase tracking-widest text-outline">Select a radical</span>

		<div class="space-y-4 rounded-[1.75rem] bg-surface-container-low p-6">
			{#each [...grouped.entries()] as [strokes, chars]}
				<div class="space-y-2">
					<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline">
						{strokes} stroke{strokes !== 1 ? 's' : ''}
					</span>
					<div class="flex flex-wrap gap-1.5">
						{#each chars as radical}
							<button
								onclick={() => selectRadical(radical)}
								title="{countMap.get(radical) ?? 0} kanji"
								class="w-10 h-10 flex items-center justify-center font-headline text-lg rounded-lg transition-colors
									{localSelected === radical
										? 'bg-primary text-on-primary'
										: 'bg-surface-container-lowest text-on-surface hover:bg-surface-container hover:text-primary'}"
							>{radical}</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<div class="flex items-center gap-4">
			<a
				href={searchUrl()}
				class="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-label font-semibold transition-opacity
					{localSelected
						? 'bg-primary text-on-primary hover:opacity-90'
						: 'bg-surface-container-high text-outline pointer-events-none opacity-50'}"
			>
				<span class="material-symbols-outlined text-base">search</span>
				Search
			</a>
			{#if localSelected}
				<span class="text-sm font-label text-on-surface-variant">
					Searching for radical <span class="font-headline text-xl text-primary ml-1">{localSelected}</span>
					<span class="text-outline ml-2">({countMap.get(localSelected) ?? 0} kanji)</span>
				</span>
			{/if}
		</div>
	</section>

	{#if selectedRadical && kanji.length > 0}
		<section class="space-y-6">
			<div class="border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-2xl font-bold text-secondary">
					Results
					<span class="ml-2 text-sm font-label font-normal text-outline">
						{total} kanji with radical {selectedRadical}
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
						<a href={searchUrl(page - 1)}
							class="px-4 py-2 text-sm font-label bg-surface-container-low hover:bg-surface-container transition-colors rounded-full">
							← Prev
						</a>
					{/if}
					<span class="text-sm font-label text-outline">Page {page} of {totalPages}</span>
					{#if page < totalPages}
						<a href={searchUrl(page + 1)}
							class="px-4 py-2 text-sm font-label bg-surface-container-low hover:bg-surface-container transition-colors rounded-full">
							Next →
						</a>
					{/if}
				</div>
			{/if}
		</section>
	{:else if selectedRadical}
		<p class="text-sm font-label text-outline">No kanji found with radical {selectedRadical}.</p>
	{/if}
</div>
