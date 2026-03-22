<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { vocab, kanjiList } = $derived(data);
</script>

<svelte:head>
	<title>{vocab.word} — {vocab.readings[0]} — Vocab</title>
</svelte:head>

<div class="space-y-6 max-w-2xl">
	<!-- Header -->
	<div class="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
		<div class="flex items-start gap-4 flex-wrap">
			<div>
				<div class="flex items-baseline gap-3 flex-wrap">
					<span class="text-5xl font-thin">{vocab.word}</span>
					{#if vocab.is_common}
						<span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Common</span>
					{/if}
				</div>
				<div class="mt-2 flex gap-2 flex-wrap">
					{#each vocab.readings as r}
						<span class="text-lg text-gray-500">{r}</span>
					{/each}
				</div>
				{#if vocab.alt_forms && vocab.alt_forms.length > 0}
					<p class="text-sm text-gray-400 mt-1">Also written: {vocab.alt_forms.join('、')}</p>
				{/if}
			</div>
		</div>

		<div class="border-t border-gray-100 pt-4">
			<ol class="space-y-1">
				{#each vocab.meanings as meaning, i}
					<li class="text-gray-800">
						{#if vocab.meanings.length > 1}<span class="text-gray-400 text-sm mr-1">{i + 1}.</span>{/if}
						{meaning}
					</li>
				{/each}
			</ol>
		</div>
	</div>

	<!-- Component kanji -->
	{#if kanjiList.length > 0}
		<div class="bg-white border border-gray-200 rounded-2xl p-5">
			<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Component Kanji</h2>
			<div class="flex gap-4 flex-wrap">
				{#each kanjiList as k}
					<a href="/kanji/{encodeURIComponent(k.literal)}"
						class="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
						{#if k.svg_file}
							<img src="/kanjivg/{k.svg_file}" alt={k.literal} class="w-16 h-16" />
						{:else}
							<span class="text-5xl font-thin w-16 h-16 flex items-center justify-center">{k.literal}</span>
						{/if}
						<div class="text-sm">
							<p class="text-gray-700">{k.meanings.slice(0, 2).join(', ')}</p>
							{#if k.on_readings.length > 0}
								<p class="text-xs text-gray-400 mt-0.5">音: {k.on_readings.slice(0, 2).join('、')}</p>
							{/if}
							{#if k.kun_readings.length > 0}
								<p class="text-xs text-gray-400">訓: {k.kun_readings.slice(0, 2).join('、')}</p>
							{/if}
							{#if k.jlpt_level}
								<span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mt-1 inline-block">N{k.jlpt_level}</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
