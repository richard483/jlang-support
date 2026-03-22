<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let bookmarks = $state<typeof data.bookmarks>([]);
	$effect(() => { bookmarks = [...data.bookmarks]; });

	async function remove(literal: string) {
		await fetch(`/api/bookmarks/${encodeURIComponent(literal)}`, { method: 'DELETE' });
		bookmarks = bookmarks.filter((b) => b.kanji_literal !== literal);
	}
</script>

<svelte:head>
	<title>Bookmarks</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Bookmarks</h1>

	{#if bookmarks.length === 0}
		<div class="text-center py-16 text-gray-400">
			<p class="text-4xl mb-3">☆</p>
			<p>No bookmarks yet.</p>
			<a href="/" class="text-indigo-500 hover:underline text-sm mt-2 inline-block">Search for kanji →</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each bookmarks as b}
				<div class="bg-white border border-gray-200 rounded-xl p-4 group relative">
					<a href="/kanji/{encodeURIComponent(b.kanji_literal)}" class="flex items-start gap-3">
						<span class="text-5xl font-thin leading-none">{b.kanji_literal}</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm text-gray-800 truncate">{b.meanings.slice(0, 3).join(', ')}</p>
							{#if b.on_readings.length > 0}
								<p class="text-xs text-gray-400 mt-1">音: {b.on_readings.slice(0, 3).join('、')}</p>
							{/if}
							{#if b.kun_readings.length > 0}
								<p class="text-xs text-gray-400">訓: {b.kun_readings.slice(0, 3).join('、')}</p>
							{/if}
							<div class="flex gap-1 mt-2">
								{#if b.jlpt_level}
									<span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">N{b.jlpt_level}</span>
								{/if}
								{#if b.grade}
									<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">G{b.grade}</span>
								{/if}
							</div>
						</div>
					</a>
					{#if b.notes}
						<p class="text-xs text-gray-400 mt-2 italic">{b.notes}</p>
					{/if}
					<button
						onclick={() => remove(b.kanji_literal)}
						class="absolute top-3 right-3 text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
					>remove</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
