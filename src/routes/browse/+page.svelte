<script lang="ts">
	import RadicalPicker from '$lib/components/RadicalPicker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { kanji, total, page, pageSize, filters, radicalOptions } = $derived(data);
	let draftRadicals = $state<string[]>([]);

	const totalPages = $derived(Math.ceil(total / pageSize));
	const hasFilters = $derived(Boolean(filters.jlpt || filters.grade || filters.radicals.length > 0));

	$effect(() => {
		draftRadicals = [...filters.radicals];
	});

	function buildUrl(params: Record<string, string | number | string[] | null | undefined>) {
		const p = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) {
			if (Array.isArray(v)) {
				if (v.length > 0) p.set(k, v.join(','));
				continue;
			}
			if (v !== null && v !== '' && v !== undefined) p.set(k, String(v));
		}
		const query = p.toString();
		return query ? `/browse?${query}` : '/browse';
	}

	function toggleRadical(radical: string) {
		draftRadicals = draftRadicals.includes(radical)
			? draftRadicals.filter((current) => current !== radical)
			: [...draftRadicals, radical];
	}

	function clearDraftRadicals() {
		draftRadicals = [];
	}
</script>

<svelte:head>
	<title>Browse Kanji — JLang Support</title>
</svelte:head>

<div class="space-y-8 py-4">
	<div class="border-b border-outline-variant/30 pb-4">
		<h1 class="font-headline text-4xl font-bold text-on-surface">Browse Kanji</h1>
		<p class="text-sm font-label text-outline mt-1">
			{total.toLocaleString()} characters{hasFilters ? ' matching filters' : ' total'}
		</p>
	</div>

	<!-- Filters -->
	<div class="space-y-4">
		<div class="flex gap-4 flex-wrap items-center">
			<span class="text-xs font-label font-bold uppercase tracking-widest text-outline">JLPT</span>
			<div class="flex gap-1.5">
				{#each [5, 4, 3, 2, 1] as n}
					<a
						href={buildUrl({ ...filters, jlpt: filters.jlpt === String(n) ? null : n, page: 1 })}
						class="text-xs font-label font-bold px-3 py-1.5 rounded-full transition-colors {filters.jlpt === String(n)
							? 'bg-secondary text-on-secondary'
							: 'bg-secondary-container/20 text-secondary hover:bg-secondary-container/40'}"
					>N{n}</a>
				{/each}
			</div>
			<span class="text-xs font-label font-bold uppercase tracking-widest text-outline ml-4">Grade</span>
			<div class="flex gap-1.5">
				{#each [1, 2, 3, 4, 5, 6] as n}
					<a
						href={buildUrl({ ...filters, grade: filters.grade === String(n) ? null : n, page: 1 })}
						class="text-xs font-label font-bold px-3 py-1.5 rounded-full transition-colors {filters.grade === String(n)
							? 'bg-primary text-on-primary'
							: 'bg-primary/10 text-primary hover:bg-primary/20'}"
					>G{n}</a>
				{/each}
			</div>
			{#if hasFilters}
				<a href="/browse" class="text-xs font-label text-outline hover:text-error ml-auto transition-colors">Clear filters</a>
			{/if}
		</div>

		<RadicalPicker
			radicals={radicalOptions}
			selected={draftRadicals}
			resultCount={total}
			applyHref={buildUrl({ ...filters, radicals: draftRadicals, page: 1 })}
			onToggle={toggleRadical}
			onClear={clearDraftRadicals}
		/>
	</div>

	<!-- Grid -->
	<div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
		{#each kanji as k}
			<a
				href="/kanji/{encodeURIComponent(k.literal)}"
				title="{k.meanings.slice(0, 2).join(', ')}"
				class="aspect-square flex items-center justify-center font-headline text-2xl bg-surface-container-lowest hover:bg-surface-container-low hover:text-primary transition-colors"
			>{k.literal}</a>
		{/each}
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center gap-3 justify-center pt-4">
			{#if page > 1}
				<a href={buildUrl({ ...filters, page: page - 1 })}
					class="px-4 py-2 text-sm font-label bg-surface-container-low hover:bg-surface-container transition-colors rounded-full">
					← Prev
				</a>
			{/if}
			<span class="text-sm font-label text-outline">Page {page} of {totalPages}</span>
			{#if page < totalPages}
				<a href={buildUrl({ ...filters, page: page + 1 })}
					class="px-4 py-2 text-sm font-label bg-surface-container-low hover:bg-surface-container transition-colors rounded-full">
					Next →
				</a>
			{/if}
		</div>
	{/if}
</div>
