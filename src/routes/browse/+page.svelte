<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { kanji, total, page, pageSize, filters } = $derived(data);

	const totalPages = $derived(Math.ceil(total / pageSize));

	function buildUrl(params: Record<string, string | number | null>) {
		const p = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) {
			if (v !== null && v !== '' && v !== undefined) p.set(k, String(v));
		}
		return `/browse?${p.toString()}`;
	}
</script>

<svelte:head>
	<title>Browse Kanji</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Browse Kanji</h1>

	<!-- Filters -->
	<div class="flex gap-3 flex-wrap items-center bg-white border border-gray-200 rounded-xl p-4">
		<span class="text-sm text-gray-500">Filter:</span>

		<!-- JLPT -->
		<div class="flex gap-1">
			{#each [5, 4, 3, 2, 1] as n}
				<a
					href={buildUrl({ ...filters, jlpt: filters.jlpt === String(n) ? null : n, page: 1 })}
					class="text-xs px-2.5 py-1 rounded-full transition-colors {filters.jlpt === String(n)
						? 'bg-blue-600 text-white'
						: 'bg-blue-100 text-blue-700 hover:bg-blue-200'}"
				>N{n}</a>
			{/each}
		</div>

		<!-- Grade -->
		<div class="flex gap-1">
			{#each [1, 2, 3, 4, 5, 6] as n}
				<a
					href={buildUrl({ ...filters, grade: filters.grade === String(n) ? null : n, page: 1 })}
					class="text-xs px-2.5 py-1 rounded-full transition-colors {filters.grade === String(n)
						? 'bg-green-600 text-white'
						: 'bg-green-100 text-green-700 hover:bg-green-200'}"
				>G{n}</a>
			{/each}
		</div>

		{#if filters.jlpt || filters.grade || filters.radical}
			<a href="/browse" class="text-xs text-gray-400 hover:text-red-500 ml-auto">Clear filters</a>
		{/if}
	</div>

	<p class="text-sm text-gray-500">{total.toLocaleString()} kanji{filters.jlpt || filters.grade ? '' : ' total'}</p>

	<!-- Grid -->
	<div class="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1.5">
		{#each kanji as k}
			<a
				href="/kanji/{encodeURIComponent(k.literal)}"
				title="{k.meanings.slice(0, 2).join(', ')}"
				class="aspect-square flex items-center justify-center text-2xl bg-white border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all"
			>{k.literal}</a>
		{/each}
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center gap-2 justify-center">
			{#if page > 1}
				<a href={buildUrl({ ...filters, page: page - 1 })} class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-indigo-400">← Prev</a>
			{/if}
			<span class="text-sm text-gray-500">Page {page} / {totalPages}</span>
			{#if page < totalPages}
				<a href={buildUrl({ ...filters, page: page + 1 })} class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-indigo-400">Next →</a>
			{/if}
		</div>
	{/if}
</div>
