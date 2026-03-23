<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { vocab, kanjiList } = $derived(data);
</script>

<svelte:head>
	<title>{vocab.word} — {vocab.readings[0]} — JLang Support</title>
</svelte:head>

<div class="space-y-12 py-4 max-w-4xl">
	<!-- Hero -->
	<section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end border-b border-outline-variant/30 pb-10">
		<div class="lg:col-span-7 space-y-4">
			<div class="flex items-baseline gap-4 flex-wrap">
				<span class="font-headline text-7xl text-on-surface leading-none">{vocab.word}</span>
				{#if vocab.is_common}
					<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase px-3 py-1 bg-secondary-container/20 rounded-full">Common</span>
				{/if}
			</div>
			<div class="flex gap-3 flex-wrap">
				{#each vocab.readings as r}
					<span class="font-headline text-xl text-on-surface-variant">{r}</span>
				{/each}
			</div>
			{#if vocab.alt_forms && vocab.alt_forms.length > 0}
				<p class="text-sm font-body text-outline">Also: {vocab.alt_forms.join('、')}</p>
			{/if}
		</div>
		<div class="lg:col-span-5 space-y-2">
			<ol class="space-y-2">
				{#each vocab.meanings as meaning, i}
					<li class="font-body text-on-surface">
						{#if vocab.meanings.length > 1}
							<span class="text-xs font-label font-bold text-outline uppercase tracking-widest mr-2">{i + 1}.</span>
						{/if}
						{meaning}
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<!-- Component kanji -->
	{#if kanjiList.length > 0}
		<section class="space-y-5">
			<div class="flex items-center justify-between border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-2xl font-bold text-secondary">Component Kanji</h2>
			</div>
			<div class="flex gap-4 flex-wrap">
				{#each kanjiList as k}
					<a
						href="/kanji/{encodeURIComponent(k.literal)}"
						class="flex items-start gap-4 p-5 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
					>
						{#if k.svg_file}
							<img src="/kanjivg/{k.svg_file}" alt={k.literal} class="w-16 h-16" />
						{:else}
							<span class="font-headline text-5xl text-primary w-16 h-16 flex items-center justify-center leading-none">{k.literal}</span>
						{/if}
						<div class="space-y-1">
							<p class="font-body text-sm text-on-surface">{k.meanings.slice(0, 2).join(', ')}</p>
							{#if k.on_readings.length > 0}
								<p class="text-xs text-outline">音: {k.on_readings.slice(0, 2).join('、')}</p>
							{/if}
							{#if k.kun_readings.length > 0}
								<p class="text-xs text-outline">訓: {k.kun_readings.slice(0, 2).join('、')}</p>
							{/if}
							{#if k.jlpt_level}
								<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase">N{k.jlpt_level}</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>
