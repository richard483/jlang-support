<script lang="ts">
	import type { PageData } from './$types';
	import StrokeOrder from '$lib/components/StrokeOrder.svelte';
	import { formatReading, katakanaToHiragana } from '$lib/utils/kana';

	let { data }: { data: PageData } = $props();
	let { vocab, kanjiList } = $derived(data);
</script>

<svelte:head>
	<title>{vocab.word} — {vocab.readings[0]} — JLang Support</title>
</svelte:head>

<div class="space-y-20 py-4">

	<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
	<section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end border-b border-outline-variant/30 pb-10">
		<div class="lg:col-span-7 space-y-5">
			<!-- Badges -->
			<div class="flex items-center gap-2 flex-wrap">
				{#if vocab.is_common}
					<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase px-3 py-1 bg-secondary-container/20 rounded-full">Common</span>
				{/if}
				{#if vocab.alt_forms && vocab.alt_forms.length > 0}
					<span class="text-xs font-label text-outline px-3 py-1 bg-surface-container-high rounded-full">Also: {vocab.alt_forms.join('、')}</span>
				{/if}
			</div>

			<!-- Word -->
			<h1 class="font-headline text-7xl md:text-8xl text-on-surface leading-none">{vocab.word}</h1>

			<!-- Readings with romaji -->
			<div class="space-y-1">
				<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">Readings</span>
				<div class="flex flex-wrap gap-x-5 gap-y-1">
					{#each vocab.readings as r}
						{@const fr = formatReading(r)}
						<span class="font-headline text-xl text-on-surface">
							{fr.kana}
							<span class="font-label text-sm text-outline ml-1.5 font-normal">{fr.romaji}</span>
						</span>
					{/each}
				</div>
			</div>
		</div>

		<!-- Meanings -->
		<div class="lg:col-span-5 space-y-2">
			<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">Meanings</span>
			<ol class="space-y-2">
				{#each vocab.meanings as meaning, i}
					<li class="font-body text-on-surface leading-snug">
						{#if vocab.meanings.length > 1}
							<span class="text-xs font-label font-bold text-outline uppercase tracking-widest mr-2">{i + 1}.</span>
						{/if}
						{meaning}
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<!-- ── Component Kanji ───────────────────────────────────────────────────── -->
	{#if kanjiList.length > 0}
		<section class="space-y-8">
			<div class="flex items-center justify-between border-b border-outline-variant/30 pb-4">
				<div>
					<span class="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-1 block">Breakdown</span>
					<h2 class="font-headline text-3xl font-bold text-secondary">Component Kanji</h2>
				</div>
				<span class="font-label text-xs uppercase tracking-[0.2em] text-outline">{kanjiList.length} character{kanjiList.length > 1 ? 's' : ''}</span>
			</div>

			<div class="space-y-8">
				{#each kanjiList as k}
					<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 shadow-sm">

						<!-- Stroke order (left) -->
						<div class="lg:col-span-4">
							{#if k.svg_file}
								<div class="space-y-2">
									<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">Stroke Order</span>
									<StrokeOrder svgFile={k.svg_file} split={false} />
								</div>
							{:else}
								<div class="flex items-center justify-center h-48 rounded-xl bg-surface-container border border-outline-variant/20">
									<span class="font-headline text-8xl text-primary leading-none">{k.literal}</span>
								</div>
							{/if}
						</div>

						<!-- Details (right) -->
						<div class="lg:col-span-8 space-y-5">
							<!-- Top row: kanji + badges + link -->
							<div class="flex items-start justify-between gap-4">
								<div class="flex items-center gap-4">
									<span class="font-headline text-6xl text-primary leading-none">{k.literal}</span>
									<div class="flex flex-wrap gap-1.5">
										{#if k.jlpt_level}
											<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase px-2 py-0.5 bg-secondary-container/20 rounded-full">JLPT N{k.jlpt_level}</span>
										{/if}
										{#if k.grade}
											<span class="text-xs font-label text-outline px-2 py-0.5 bg-surface-container-high rounded-full">Grade {k.grade}</span>
										{/if}
										{#if k.stroke_count}
											<span class="text-xs font-label text-outline px-2 py-0.5 bg-surface-container-high rounded-full">{k.stroke_count} strokes</span>
										{/if}
									</div>
								</div>
								<a
									href="/kanji/{encodeURIComponent(k.literal)}"
									class="flex items-center gap-1 text-xs font-label text-secondary hover:text-primary transition-colors shrink-0"
								>
									Full detail
									<span class="material-symbols-outlined text-sm leading-none">arrow_forward</span>
								</a>
							</div>

							<!-- Meanings -->
							<div class="space-y-0.5">
								<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">Meanings</span>
								<p class="font-body text-on-surface leading-snug">{k.meanings.join(', ')}</p>
							</div>

							<!-- Readings -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{#if k.on_readings.length > 0}
									<div class="space-y-1">
										<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">On-yomi (音読み)</span>
										<div class="flex flex-wrap gap-x-3 gap-y-0.5">
											{#each k.on_readings as r}
												{@const fr = formatReading(r)}
												<span class="font-headline text-base text-on-surface">
													{katakanaToHiragana(fr.kana)}
													<span class="font-label text-xs text-outline ml-1 font-normal">{fr.romaji}</span>
												</span>
											{/each}
										</div>
									</div>
								{/if}
								{#if k.kun_readings.length > 0}
									<div class="space-y-1">
										<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">Kun-yomi (訓読み)</span>
										<div class="flex flex-wrap gap-x-3 gap-y-0.5">
											{#each k.kun_readings as r}
												{@const fr = formatReading(r)}
												<span class="font-headline text-base text-on-surface">
													{fr.kana}
													<span class="font-label text-xs text-outline ml-1 font-normal">{fr.romaji}</span>
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>

					</div>
				{/each}
			</div>
		</section>
	{/if}

</div>
