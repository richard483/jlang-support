<script lang="ts">
	let query = $state('');
	let results = $state<{
		literal: string;
		meanings: string[];
		on_readings: string[];
		kun_readings: string[];
		jlpt_level: number | null;
		grade: number | null;
		stroke_count: number | null;
	}[]>([]);
	let vocab = $state<{
		word: string;
		readings: string[];
		meanings: string[];
		is_common: boolean;
	}[]>([]);
	let loading = $state(false);
	let searched = $state(false);

	async function search() {
		if (!query.trim()) return;
		loading = true;
		searched = true;
		try {
			const res = await fetch(`/api/kanji/search?q=${encodeURIComponent(query.trim())}`);
			const data = await res.json();
			results = data.results;
			vocab = data.vocab ?? [];
		} finally {
			loading = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') search();
	}
</script>

<svelte:head>
	<title>Kanji Search</title>
</svelte:head>

<div class="flex flex-col items-center gap-8">
	<div class="text-center">
		<h1 class="text-4xl font-bold text-indigo-600 mb-2">漢字サポート</h1>
		<p class="text-gray-500 text-sm">Search kanji, compounds, or meanings</p>
	</div>

	<div class="w-full max-w-lg flex gap-2">
		<input
			type="text"
			bind:value={query}
			onkeydown={onKeydown}
			placeholder="楽、青春、seishun、fun..."
			class="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
		/>
		<button
			onclick={search}
			disabled={loading}
			class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
		>
			{loading ? '...' : 'Search'}
		</button>
	</div>

	{#if searched && results.length === 0 && vocab.length === 0 && !loading}
		<p class="text-gray-500">No results found for "{query}"</p>
	{/if}

	<!-- Vocab / compound results -->
	{#if vocab.length > 0}
		<div class="w-full space-y-2">
			<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Words</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each vocab as v}
					<a href="/vocab/{encodeURIComponent(v.word)}"
						class="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-sm transition-all">
						<div class="flex items-start justify-between gap-2">
							<span class="text-3xl font-thin leading-none">{v.word}</span>
							{#if v.is_common}
								<span class="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">Common</span>
							{/if}
						</div>
						<p class="text-sm text-gray-500 mt-1">{v.readings.join('、')}</p>
						<p class="text-sm text-gray-700 mt-1 line-clamp-2">{v.meanings.slice(0, 3).join('; ')}</p>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Individual kanji results -->
	{#if results.length > 0}
		<div class="w-full space-y-2">
			{#if vocab.length > 0}
				<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Kanji</h2>
			{/if}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each results as k}
					<a href="/kanji/{encodeURIComponent(k.literal)}"
						class="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-sm transition-all">
						<div class="flex items-start gap-3">
							<span class="text-5xl font-thin leading-none">{k.literal}</span>
							<div class="flex-1 min-w-0">
								<p class="text-sm text-gray-800 truncate">{k.meanings.slice(0, 3).join(', ')}</p>
								{#if k.on_readings.length > 0}
									<p class="text-xs text-gray-400 mt-1">音: {k.on_readings.slice(0, 3).join('、')}</p>
								{/if}
								{#if k.kun_readings.length > 0}
									<p class="text-xs text-gray-400">訓: {k.kun_readings.slice(0, 3).join('、')}</p>
								{/if}
								<div class="flex gap-1 mt-2 flex-wrap">
									{#if k.jlpt_level}
										<span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">N{k.jlpt_level}</span>
									{/if}
									{#if k.grade}
										<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">G{k.grade}</span>
									{/if}
									{#if k.stroke_count}
										<span class="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{k.stroke_count}画</span>
									{/if}
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
