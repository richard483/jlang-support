<script lang="ts">
	interface Reference {
		name: string;
		url: string;
		role: string;
		note?: string;
	}

	const dataSources: Reference[] = [
		{
			name: 'KanjiDic2',
			url: 'https://www.edrdg.org/kanjidic/kanjidic2_doc.html',
			role: 'Core kanji data — meanings, on/kun readings, JLPT level, grade, frequency.',
			note: 'Electronic Dictionary Research and Development Group, CC BY-SA 4.0.'
		},
		{
			name: 'KRADFILE / KRADFILE2',
			url: 'https://www.edrdg.org/krad/kradinf.html',
			role: 'Radical decomposition of each kanji.',
			note: 'EDRDG, CC BY-SA 3.0.'
		},
		{
			name: 'KanjiVG',
			url: 'https://kanjivg.tagaini.net/',
			role: 'Stroke-order diagrams (inline SVG).',
			note: 'Ulrich Apel, CC BY-SA 3.0.'
		},
		{
			name: 'JMdict',
			url: 'https://www.edrdg.org/jmdict/j_jmdict.html',
			role: 'Vocabulary / compound words with readings and English glosses.',
			note: 'EDRDG, CC BY-SA 4.0.'
		},
		{
			name: 'kanji-data (JLPT supplement)',
			url: 'https://github.com/davidluzgouveia/kanji-data',
			role: 'Supplementary JLPT N1–N5 level tagging.'
		},
		{
			name: 'Kanji alive API',
			url: 'https://app.kanjialive.com/api/docs',
			role: 'Per-kanji usage examples, example audio, radical detail and dictionary references — fetched and cached lazily.',
			note: 'University of Chicago. Example sentences/audio are licensed for educational use and are not redistributed by this project.'
		},
		{
			name: 'kanjiapi.dev',
			url: 'https://kanjiapi.dev/',
			role: 'Cross-validation of stroke counts, grade and readings across ~13k kanji.',
			note: 'Open kanji data API derived from KanjiDic2.'
		},
		{
			name: 'Kanji Networks — Etymological Dictionary of Han/Chinese Characters',
			url: 'http://www.rtega.be/chmn/',
			role: 'Source of the per-kanji etymology shown on each kanji page.',
			note: 'Lawrence J. Howell. Copyrighted reference material — shown here for personal study only, not redistributed.'
		},
		{
			name: 'Tanoshii Japanese',
			url: 'https://www.tanoshiijapanese.com/',
			role: 'External per-kanji dictionary reference linked from each kanji page.'
		}
	];
</script>

<svelte:head>
	<title>References — JLang Support</title>
</svelte:head>

<section class="max-w-4xl mx-auto py-4 space-y-10">
	<header class="space-y-3">
		<span class="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold block">Credits</span>
		<h1 class="font-headline text-4xl md:text-5xl font-bold text-on-surface tracking-tighter">References &amp; Data Sources</h1>
		<p class="font-body text-on-surface-variant leading-relaxed max-w-2xl">
			JLang Support is built on top of openly available Japanese-language datasets and APIs. The
			data below is combined, revalidated and presented for personal study. Copyrighted reference
			material is used for educational purposes only and is not redistributed.
		</p>
	</header>

	<ul class="divide-y divide-outline-variant/20 border-t border-outline-variant/20">
		{#each dataSources as ref}
			<li class="py-5 flex flex-col gap-1.5">
				<a
					href={ref.url}
					target="_blank"
					rel="noopener noreferrer"
					class="font-headline text-xl text-primary hover:underline inline-flex items-center gap-1.5 w-fit"
				>
					{ref.name}
					<span class="material-symbols-outlined text-base leading-none">open_in_new</span>
				</a>
				<p class="font-body text-sm text-on-surface-variant">{ref.role}</p>
				{#if ref.note}
					<p class="font-label text-xs text-outline italic">{ref.note}</p>
				{/if}
			</li>
		{/each}
	</ul>
</section>
