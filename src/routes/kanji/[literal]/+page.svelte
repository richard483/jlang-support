<script lang="ts">
	import { FORM_LABELS } from '$lib/utils/conjugation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let { kanji, radicals, mnemonics: initialMnemonics, bookmarked: initialBookmarked, wordForms, vocab } = $derived(data);

	let bookmarked = $state(false);
	let mnemonics = $state<typeof initialMnemonics>([]);

	$effect(() => {
		bookmarked = initialBookmarked;
		mnemonics = [...initialMnemonics];
	});

	let showMnemonicForm = $state(false);
	let newMnemonic = $state('');
	let newEtymology = $state('');
	let submitting = $state(false);

	const tanoshiiUrl = $derived(`https://www.tanoshiijapanese.com/dictionary/?j=${encodeURIComponent(kanji.literal)}`);

	const TYPE_LABEL: Record<string, string> = {
		'verb-ichidan': 'Ichidan verb (る)',
		'verb-godan': 'Godan verb (う)',
		'adjective-i': 'I-adjective'
	};

	async function toggleBookmark() {
		if (bookmarked) {
			await fetch(`/api/bookmarks/${encodeURIComponent(kanji.literal)}`, { method: 'DELETE' });
			bookmarked = false;
		} else {
			await fetch('/api/bookmarks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ literal: kanji.literal })
			});
			bookmarked = true;
		}
	}

	async function addMnemonic() {
		if (!newMnemonic.trim()) return;
		submitting = true;
		try {
			const res = await fetch('/api/mnemonics', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					literal: kanji.literal,
					mnemonic: newMnemonic.trim(),
					etymology: newEtymology.trim() || null
				})
			});
			const added = await res.json();
			mnemonics = [{ ...added, mnemonic: newMnemonic.trim(), etymology: newEtymology.trim() || null }, ...mnemonics];
			newMnemonic = '';
			newEtymology = '';
			showMnemonicForm = false;
		} finally {
			submitting = false;
		}
	}

	async function deleteMnemonic(id: number) {
		await fetch(`/api/mnemonics?id=${id}`, { method: 'DELETE' });
		mnemonics = mnemonics.filter((m) => m.id !== id);
	}
</script>

<svelte:head>
	<title>{kanji.literal} — Kanji Detail</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-6">
		<div class="text-center shrink-0">
			{#if kanji.svg_file}
				<img
					src="/kanjivg/{kanji.svg_file}"
					alt="Stroke order for {kanji.literal}"
					class="w-32 h-32"
				/>
			{:else}
				<span class="text-8xl font-thin flex items-center justify-center w-32 h-32">{kanji.literal}</span>
			{/if}
			{#if kanji.stroke_count}
				<p class="text-xs text-gray-400 mt-1">{kanji.stroke_count} strokes</p>
			{/if}
		</div>

		<div class="flex-1 space-y-3">
			<div class="flex items-center gap-3 flex-wrap">
				{#if kanji.jlpt_level}
					<span class="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">JLPT N{kanji.jlpt_level}</span>
				{/if}
				{#if kanji.grade}
					<span class="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">Grade {kanji.grade}</span>
				{/if}
				{#if kanji.frequency}
					<span class="bg-gray-100 text-gray-500 text-sm px-3 py-1 rounded-full">Freq #{kanji.frequency}</span>
				{/if}

				<button
					onclick={toggleBookmark}
					class="ml-auto px-4 py-1.5 rounded-full text-sm font-medium transition-colors {bookmarked
						? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
						: 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
				>
					{bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
				</button>
			</div>

			<p class="font-semibold text-gray-800">{kanji.meanings.join(', ')}</p>

			{#if kanji.on_readings.length > 0}
				<div class="flex gap-2 items-baseline">
					<span class="text-xs text-gray-400 shrink-0">音読み</span>
					<p class="text-sm">{kanji.on_readings.join('、')}</p>
				</div>
			{/if}
			{#if kanji.kun_readings.length > 0}
				<div class="flex gap-2 items-baseline">
					<span class="text-xs text-gray-400 shrink-0">訓読み</span>
					<p class="text-sm">{kanji.kun_readings.join('、')}</p>
				</div>
			{/if}
			{#if kanji.nanori && kanji.nanori.length > 0}
				<div class="flex gap-2 items-baseline">
					<span class="text-xs text-gray-400 shrink-0">名乗り</span>
					<p class="text-sm text-gray-500">{kanji.nanori.join('、')}</p>
				</div>
			{/if}

			<a href={tanoshiiUrl} target="_blank" rel="noopener noreferrer"
				class="text-xs text-indigo-500 hover:underline">
				View on Tanoshii Japanese ↗
			</a>
		</div>
	</div>

	<!-- Radicals -->
	{#if radicals.length > 0}
		<div class="bg-white border border-gray-200 rounded-2xl p-5">
			<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Radicals</h2>
			<div class="flex gap-3 flex-wrap">
				{#each radicals as radical}
					<a href="/kanji/{encodeURIComponent(radical)}"
						class="text-3xl leading-none p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
						title="View {radical}">{radical}</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Word forms (verbs / adjectives) -->
	{#if wordForms.length > 0}
		<div class="bg-white border border-gray-200 rounded-2xl p-5 space-y-5">
			<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Word Forms</h2>

			{#each wordForms as wf}
				<div>
					<div class="flex items-baseline gap-2 mb-3">
						<span class="text-2xl font-light">{wf.word}</span>
						<span class="text-sm text-gray-400">{wf.reading}</span>
						<span class="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{TYPE_LABEL[wf.type]}</span>
					</div>

					{#if wf.adjForms}
						<table class="w-full text-sm">
							<tbody>
								{#each wf.adjForms as f}
									<tr class="border-b border-gray-50 hover:bg-gray-50">
										<td class="py-2 text-gray-500 w-44">{f.label}</td>
										<td class="py-2 text-xl font-light">{f.form}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else if wf.conjugation}
						<table class="w-full text-sm">
							<tbody>
								{#each Object.entries(wf.conjugation.forms) as [key, value]}
									<tr class="border-b border-gray-50 hover:bg-gray-50">
										<td class="py-2 text-gray-500 w-44">{FORM_LABELS[key as keyof typeof FORM_LABELS]}</td>
										<td class="py-2 text-xl font-light">{value}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Vocabulary / compounds using this kanji -->
	{#if vocab.length > 0}
		<div class="bg-white border border-gray-200 rounded-2xl p-5">
			<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Words</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{#each vocab as v}
					<a href="/vocab/{encodeURIComponent(v.word)}"
						class="flex items-baseline gap-3 p-3 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
						<span class="text-2xl font-light shrink-0">{v.word}</span>
						<span class="text-sm text-gray-400 group-hover:text-indigo-400">{v.readings[0]}</span>
						<span class="text-xs text-gray-500 truncate">{v.meanings[0]}</span>
						{#if v.is_common}
							<span class="ml-auto text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full shrink-0">common</span>
						{/if}
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Mnemonics -->
	<div class="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mnemonics & Etymology</h2>
			<button onclick={() => (showMnemonicForm = !showMnemonicForm)}
				class="text-sm text-indigo-600 hover:underline">
				{showMnemonicForm ? 'Cancel' : '+ Add'}
			</button>
		</div>

		{#if showMnemonicForm}
			<div class="space-y-3 p-4 bg-gray-50 rounded-xl">
				<textarea bind:value={newMnemonic}
					placeholder="How do you remember this kanji? (e.g. 'Looks like a tree with roots')"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
				></textarea>
				<input bind:value={newEtymology} type="text"
					placeholder="Etymology hint (optional)"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
				/>
				<button onclick={addMnemonic} disabled={submitting || !newMnemonic.trim()}
					class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
					{submitting ? 'Saving...' : 'Save'}
				</button>
			</div>
		{/if}

		{#if mnemonics.length === 0 && !showMnemonicForm}
			<p class="text-sm text-gray-400">No mnemonics yet. Add one to help remember this kanji!</p>
		{/if}

		{#each mnemonics as m}
			<div class="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-sm space-y-1 relative group">
				<p class="text-gray-800">{m.mnemonic}</p>
				{#if m.etymology}
					<p class="text-xs text-gray-400 italic">{m.etymology}</p>
				{/if}
				<button onclick={() => deleteMnemonic(m.id)}
					class="absolute top-3 right-3 text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
					delete
				</button>
			</div>
		{/each}
	</div>
</div>
