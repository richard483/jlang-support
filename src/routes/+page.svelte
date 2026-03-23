<script lang="ts">
	import type { PageData } from './$types';
	import { kanaToRomaji, katakanaToHiragana } from '$lib/utils/kana';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let results = $state<{
		literal: string;
		meanings: string[];
		on_readings: string[];
		kun_readings: string[];
		jlpt_level: number | null;
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
			const json = await res.json();
			results = json.results;
			vocab = json.vocab ?? [];
		} finally {
			loading = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') search();
	}

	// Carousel scroll
	let carousel = $state<HTMLDivElement | undefined>(undefined);
	function scrollCarousel(dir: -1 | 1) {
		carousel?.scrollBy({ left: dir * 420, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>JLang Support — Japanese Learning Platform</title>
</svelte:head>

<!-- ── Hero Search ──────────────────────────────────────────────────────────── -->
<section class="flex flex-col items-center text-center mb-24 max-w-4xl mx-auto pt-8">
	<h1 class="font-headline text-5xl md:text-7xl font-black text-on-surface mb-6 tracking-tighter leading-tight">
		Master Japanese with<br /><span class="text-primary">Editorial Intent.</span>
	</h1>
	<p class="font-body text-lg text-on-surface-variant mb-12 max-w-xl leading-relaxed">
		Search characters, grammar points, or vocabulary with unparalleled depth.
	</p>

	<div class="w-full relative">
		<div class="absolute inset-y-0 left-5 flex items-center pointer-events-none">
			<span class="material-symbols-outlined text-outline">search</span>
		</div>
		<input
			type="text"
			bind:value={query}
			onkeydown={onKeydown}
			placeholder="Search kanji, compounds, or English meaning…"
			class="w-full h-16 pl-14 pr-6 bg-surface-container-high border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 rounded-none font-headline text-xl placeholder:text-outline transition-all duration-300 outline-none shadow-sm"
		/>
		<button
			onclick={search}
			disabled={loading}
			class="absolute right-4 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary text-on-primary rounded-full font-label font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
		>
			{loading ? '…' : 'Search'}
		</button>
	</div>
</section>

<!-- ── Search Results ───────────────────────────────────────────────────────── -->
{#if searched}
	{#if results.length === 0 && vocab.length === 0 && !loading}
		<p class="text-center text-on-surface-variant mb-16">No results found for "<span class="text-on-surface">{query}</span>"</p>
	{/if}

	{#if vocab.length > 0}
		<section class="mb-12">
			<div class="flex items-end justify-between mb-5">
				<span class="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold">Words</span>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each vocab as v}
					<a
						href="/vocab/{encodeURIComponent(v.word)}"
						class="bg-surface-container-lowest p-5 hover:bg-surface-container-low transition-colors group"
					>
						<div class="flex items-start justify-between gap-2 mb-2">
							<span class="font-headline text-3xl text-on-surface">{v.word}</span>
							{#if v.is_common}
								<span class="text-xs bg-secondary-container/30 text-secondary px-2 py-0.5 rounded-full font-label shrink-0">Common</span>
							{/if}
						</div>
						<p class="text-sm text-on-surface-variant font-body">{v.readings.join('、')}</p>
						<p class="text-sm text-on-surface mt-1 font-body line-clamp-2">{v.meanings.slice(0, 3).join('; ')}</p>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if results.length > 0}
		<section class="mb-16">
			{#if vocab.length > 0}
				<div class="flex items-end justify-between mb-5">
					<span class="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold">Kanji</span>
				</div>
			{/if}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each results as k}
					<a
						href="/kanji/{encodeURIComponent(k.literal)}"
						class="bg-surface-container-lowest p-6 hover:bg-surface-container-low transition-colors group relative overflow-hidden"
					>
						<div class="absolute top-3 right-4 font-headline text-5xl text-on-surface/5 select-none pointer-events-none">{k.literal}</div>
						<div class="flex items-start gap-4">
							<span class="font-headline text-6xl text-primary leading-none">{k.literal}</span>
							<div class="flex-1 min-w-0 space-y-1">
								<p class="font-body text-sm text-on-surface font-medium truncate">{k.meanings.slice(0, 3).join(', ')}</p>
								{#if k.on_readings.length > 0}
									<p class="text-xs text-outline">音: {k.on_readings.slice(0, 3).map(r => katakanaToHiragana(r)).join('、')}</p>
								{/if}
								{#if k.kun_readings.length > 0}
									<p class="text-xs text-outline">訓: {k.kun_readings.slice(0, 3).join('、')}</p>
								{/if}
								<div class="flex gap-1.5 mt-2 flex-wrap">
									{#if k.jlpt_level}
										<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase">JLPT N{k.jlpt_level}</span>
									{/if}
									{#if k.stroke_count}
										<span class="text-xs font-label text-outline">{k.stroke_count} strokes</span>
									{/if}
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}
{/if}

<!-- ── Featured Discoveries ─────────────────────────────────────────────────── -->
{#if !searched}
	<section class="mb-16">
		<div class="flex items-end justify-between mb-8">
			<div>
				<span class="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-2 block">Curated Series</span>
				<h2 class="font-headline text-4xl font-bold text-on-surface">Featured Discoveries</h2>
			</div>
			<div class="flex gap-3">
				<button
					onclick={() => scrollCarousel(-1)}
					class="w-11 h-11 rounded-full flex items-center justify-center border border-outline-variant hover:bg-surface-container-highest transition-colors"
					aria-label="Scroll left"
				>
					<span class="material-symbols-outlined text-on-surface-variant">arrow_back</span>
				</button>
				<button
					onclick={() => scrollCarousel(1)}
					class="w-11 h-11 rounded-full flex items-center justify-center bg-primary text-on-primary hover:opacity-90 transition-opacity"
					aria-label="Scroll right"
				>
					<span class="material-symbols-outlined">arrow_forward</span>
				</button>
			</div>
		</div>

		<div bind:this={carousel} class="flex gap-5 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory">
			{#each data.featured as k, i}
				<a
					href="/kanji/{encodeURIComponent(k.literal)}"
					class="min-w-[300px] md:min-w-[360px] snap-start bg-surface-container-low p-10 group relative overflow-hidden transition-all duration-500 hover:bg-surface-container-lowest shrink-0"
				>
					<div class="absolute top-4 right-4 font-headline text-6xl text-outline-variant/30 pointer-events-none select-none tabular-nums">
						{String(i + 1).padStart(2, '0')}
					</div>
					<div class="mb-6 flex justify-center">
						<span class="font-headline text-9xl text-primary drop-shadow-sm select-none leading-none">{k.literal}</span>
					</div>
					<!-- Reading: on-yomi first, fall back to first kun-yomi -->
					{#if k.on_readings.length > 0 || k.kun_readings.length > 0}
						<div class="mb-3">
							<p class="font-headline text-2xl font-bold text-on-surface tracking-tight">
								{k.on_readings.length > 0
									? k.on_readings.map(r => katakanaToHiragana(r)).join(' / ')
									: k.kun_readings.slice(0, 2).map(r => r.replace(/\./g, '')).join(' / ')}
							</p>
							<p class="font-label text-sm text-outline mt-0.5 tracking-wide">
								{k.on_readings.length > 0
									? k.on_readings.map(r => kanaToRomaji(r)).join(' / ')
									: k.kun_readings.slice(0, 2).map(r => kanaToRomaji(r)).join(' / ')}
							</p>
						</div>
					{/if}
					<div class="space-y-1">
						<p class="font-body text-sm text-on-surface-variant">{k.meanings.slice(0, 3).join(', ')}</p>
					</div>
					<div class="mt-6 flex items-center gap-4 pt-5 border-t border-outline-variant/30">
						{#if k.jlpt_level}
							<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase">JLPT N{k.jlpt_level}</span>
						{/if}
						{#if k.stroke_count}
							<span class="text-xs font-label font-bold text-outline tracking-widest uppercase">{k.stroke_count} Strokes</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}
