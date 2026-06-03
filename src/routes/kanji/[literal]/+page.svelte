<script lang="ts">
	import SaveToBoard from '$lib/components/SaveToBoard.svelte';
	import StrokeOrder from '$lib/components/StrokeOrder.svelte';
	import { formatReading, katakanaToHiragana } from '$lib/utils/kana';
	import { formatEtymology, formatMnHint } from '$lib/utils/etymology';
	import { getDisplayPosTags } from '$lib/utils/posTags';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type BoardMembership = {
		id: string;
		name: string;
		card_count: number;
		isSaved: boolean;
		cardId: string | null;
	};

	let { kanji, radicals, etymology, boards: initialBoards, boardsError: initialBoardsError, wordForms, vocab, user } = $derived(data);
	let boards = $state<BoardMembership[]>([]);
	let boardError = $state('');
	let boardBusyId = $state('');
	let creatingBoard = $state(false);
	let boardServiceError = $state('');
	const isAuthenticated = $derived(Boolean(user));

	$effect(() => {
		boards = [...(initialBoards ?? [])];
		boardServiceError = initialBoardsError ?? '';
		boardError = '';
	});

	const tanoshiiUrl = $derived(`https://www.tanoshiijapanese.com/dictionary/?j=${encodeURIComponent(kanji.literal)}`);

	// Enrichment payload (KanjiAlive examples/audio/references + validation history)
	const extra = $derived(kanji.additional_data ?? null);
	const examples = $derived(extra?.kanjialive?.examples ?? []);
	const refs = $derived(extra?.kanjialive?.references ?? null);
	const corrections = $derived((extra?._validation ?? []).filter((v) => v.corrected));
	const mnemonic = $derived(extra?.kanjialive?.mnemonic ?? null);

	// Derive the hero heading from word forms or fall back to readings
	const heroTitle = $derived(() => {
		if (wordForms.length === 0) return kanji.on_readings.slice(0, 2).join(' / ') || kanji.literal;
		return wordForms.slice(0, 2).map((wf) => wf.word).join(' / ');
	});

	// Separate adjective and verb forms for the conjugation matrix
	const adjForms = $derived(wordForms.filter((wf) => wf.type === 'adjective-i'));
	const verbForms = $derived(wordForms.filter((wf) => wf.type === 'verb-ichidan' || wf.type === 'verb-godan'));

	const CONJUGATION_ENGLISH: Record<string, string> = {
		'Plain Positive':     'I do / will do',
		'Plain Negative':     "I don't / won't do",
		'Polite':             'I do / will do (polite)',
		'Polite Negative':    "I don't / won't do (polite)",
		'Te-form':            'doing / please do / and then...',
		'Provisional (ば)':   'if (I) do...',
		'Conditional':        'if / when (I) do...',
		'Conditional Neg.':   "if (I) don't do...",
		'Potential':          'can do / able to do',
		'Volitional':         "let's do / I'll do",
		'Passive':            'is done / was done',
		'Causative':          'make/let (someone) do',
	};

	const ADJ_ENGLISH: Record<string, string> = {
		'Plain':          'is (adjective)',
		'Negative':       'is not (adjective)',
		'Past':           'was (adjective)',
		'Past negative':  'was not (adjective)',
		'Te-form':        'being (adj.) and...',
		'Adverbial':      'in a (adj.) way',
		'Nominalized':    'the degree of (adj.)',
	};

	async function addToBoard(boardId: string) {
		boardError = '';
		boardBusyId = boardId;

		try {
			const response = await fetch(`/api/boards/${encodeURIComponent(boardId)}/kanji`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ literal: kanji.literal })
			});
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
				card_id?: string;
				already_exists?: boolean;
			};

			if (!response.ok) {
				throw new Error(payload.message || 'Failed to update board.');
			}

			boards = boards.map((current) =>
				current.id !== boardId
					? current
					: {
							...current,
							isSaved: true,
							cardId: payload.card_id ?? current.cardId,
							card_count: current.card_count + (payload.already_exists ? 0 : 1)
						}
			);
		} catch (error) {
			boardError = error instanceof Error ? error.message : 'Failed to update board.';
		} finally {
			boardBusyId = '';
		}
	}

	async function removeFromBoard(boardId: string, cardId?: string) {
		if (!cardId) {
			boardError = 'Card not found.';
			return;
		}

		boardError = '';
		boardBusyId = boardId;

		try {
			const response = await fetch(`/api/boards/${encodeURIComponent(boardId)}/kanji`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ card_id: cardId, literal: kanji.literal })
			});
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message || 'Failed to remove kanji from board.');
			}

			boards = boards.map((current) =>
				current.id !== boardId
					? current
					: {
							...current,
							isSaved: false,
							cardId: null,
							card_count: Math.max(0, current.card_count - 1)
						}
			);
		} catch (error) {
			boardError = error instanceof Error ? error.message : 'Failed to remove kanji from board.';
		} finally {
			boardBusyId = '';
		}
	}

	async function createBoardAndSave(name: string) {
		creatingBoard = true;
		boardError = '';

		try {
			const createResponse = await fetch('/api/boards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			const createPayload = (await createResponse.json().catch(() => ({}))) as {
				message?: string;
				deck_id?: string;
			};
			if (!createResponse.ok || !createPayload.deck_id) {
				throw new Error(createPayload.message || 'Failed to create board.');
			}

			const addResponse = await fetch(`/api/boards/${encodeURIComponent(createPayload.deck_id)}/kanji`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ literal: kanji.literal })
			});
			const addPayload = (await addResponse.json().catch(() => ({}))) as {
				message?: string;
				card_id?: string;
			};
			if (!addResponse.ok) {
				throw new Error(addPayload.message || 'Failed to save kanji to the new board.');
			}

			boards = [
				{
					id: createPayload.deck_id,
					name,
					card_count: 1,
					isSaved: true,
					cardId: addPayload.card_id ?? null
				},
				...boards
			];
		} catch (error) {
			boardError = error instanceof Error ? error.message : 'Failed to create board.';
			throw error;
		} finally {
			creatingBoard = false;
		}
	}

</script>

<svelte:head>
	<title>{kanji.literal} — {kanji.meanings[0] ?? 'Kanji'} — JLang Support</title>
</svelte:head>

<div class="space-y-20 py-4">

	<!-- ── 1. Hero ────────────────────────────────────────────────────────────── -->
	<section class="relative grid grid-cols-1 gap-8 items-end lg:grid-cols-12">
		<div class="absolute top-0 right-0 z-10">
			<SaveToBoard
				boards={boards}
				user={user}
				itemType="kanji"
				itemId={kanji.literal}
				serviceError={boardServiceError}
				actionError={boardError}
				busyBoardId={boardBusyId}
				creatingBoard={creatingBoard}
				onAdd={async ({ boardId }) => addToBoard(boardId)}
				onRemove={async ({ boardId, cardId }) => removeFromBoard(boardId, cardId)}
				onCreate={async ({ name }) => createBoardAndSave(name)}
			/>
		</div>

		<!-- Left: meta -->
		<div class="space-y-5 pt-14 sm:pt-0 lg:col-span-5">
			<div class="flex items-center gap-3 flex-wrap">
				{#if kanji.jlpt_level}
					<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase px-3 py-1 bg-secondary-container/20 rounded-full">JLPT N{kanji.jlpt_level}</span>
				{/if}
				{#if kanji.grade}
					<span class="text-xs font-label font-bold text-outline tracking-widest uppercase px-3 py-1 bg-surface-container-high rounded-full">Grade {kanji.grade}</span>
				{/if}
				{#if kanji.frequency}
					<span class="text-xs font-label text-outline px-3 py-1 bg-surface-container-high rounded-full">Freq #{kanji.frequency}</span>
				{/if}
				{#if refs?.kodansha}
					<span class="text-xs font-label text-outline px-3 py-1 bg-surface-container-high rounded-full" title="Kodansha Kanji Learner's Dictionary index">Kodansha {refs.kodansha}</span>
				{/if}
				{#if refs?.classic_nelson}
					<span class="text-xs font-label text-outline px-3 py-1 bg-surface-container-high rounded-full" title="Classic Nelson index">Nelson {refs.classic_nelson}</span>
				{/if}
			</div>

			{#if isAuthenticated && boardServiceError}
				<div class="rounded-[1.25rem] bg-surface-container-low p-4 text-sm leading-7 text-on-surface-variant">
					<p class="font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">Board sync unavailable</p>
					<p class="mt-2">{boardServiceError}</p>
				</div>
			{/if}

			<h1 class="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tighter leading-tight">
				{heroTitle()}
			</h1>

			<!-- Primary meaning — large and clear -->
			<p class="font-body text-lg text-on-surface-variant leading-snug italic">
				{kanji.meanings.slice(0, 4).join(' · ')}
			</p>

			<!-- Readings with romaji -->
			<div class="space-y-3">
				{#if kanji.on_readings.length > 0}
					<div class="space-y-0.5">
						<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">On-yomi (音読み)</span>
						<div class="flex flex-wrap gap-x-4 gap-y-1">
							{#each kanji.on_readings as r}
								{@const fr = formatReading(r)}
								<span class="font-headline text-lg text-on-surface leading-tight">
									{katakanaToHiragana(fr.kana)}
									<span class="font-label text-sm text-outline ml-1 font-normal">{fr.romaji}</span>
								</span>
							{/each}
						</div>
					</div>
				{/if}
				{#if kanji.kun_readings.length > 0}
					<div class="space-y-0.5">
						<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">Kun-yomi (訓読み)</span>
						<div class="flex flex-wrap gap-x-4 gap-y-1">
							{#each kanji.kun_readings as r}
								{@const fr = formatReading(r)}
								<span class="font-headline text-lg text-on-surface leading-tight">
									{fr.kana}
									<span class="font-label text-sm text-outline ml-1 font-normal">{fr.romaji}</span>
								</span>
							{/each}
						</div>
					</div>
				{/if}
				{#if kanji.nanori && kanji.nanori.length > 0}
					<div class="space-y-0.5">
						<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">Names (名乗り)</span>
						<div class="flex flex-wrap gap-x-4 gap-y-1">
							{#each kanji.nanori as r}
								{@const fr = formatReading(r)}
								<span class="font-headline text-base text-on-surface-variant leading-tight">
									{fr.kana}
									<span class="font-label text-sm text-outline ml-1 font-normal">{fr.romaji}</span>
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Radicals -->
			{#if radicals.length > 0}
				<div class="space-y-2">
					<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block">Radicals</span>
					<div class="flex gap-2 flex-wrap">
						{#each radicals as r}
							{#if r.target}
								<a
									href="/kanji/{encodeURIComponent(r.target)}"
									class="font-headline text-2xl px-3 py-1.5 bg-surface-container-low hover:bg-surface-container transition-colors rounded-lg text-on-surface"
									title="View {r.target}"
								>{r.display}</a>
							{:else}
								<span
									class="font-headline text-2xl px-3 py-1.5 bg-surface-container-low rounded-lg text-on-surface-variant"
									title="Stroke component — no standalone kanji"
								>{r.display}</span>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<a href={tanoshiiUrl} target="_blank" rel="noopener noreferrer"
				class="inline-flex items-center gap-1 text-xs font-label text-secondary hover:text-primary hover:underline transition-colors">
				View on Tanoshii Japanese
				<span class="material-symbols-outlined text-sm leading-none">open_in_new</span>
			</a>

			{#if corrections.length > 0}
				<p class="text-[11px] font-label text-outline italic">
					Data revalidated against external sources:
					{corrections.map((c) => `${c.field} ${c.old == null ? '—' : String(c.old)} → ${String(c.new)} (${c.source})`).join('; ')}.
				</p>
			{/if}
		</div>

		<!-- Right: giant kanji art -->
		<div class="lg:col-span-7 flex justify-center lg:justify-end">
			<div class="relative group select-none">
				<div class="absolute -inset-8 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/8 transition-all duration-700 pointer-events-none"></div>
				<span class="font-headline text-[14rem] md:text-[18rem] leading-none text-on-surface relative">
					{kanji.literal}
				</span>
			</div>
		</div>
	</section>

	<!-- ── 2. Stroke Order Study ──────────────────────────────────────────────── -->
	{#if kanji.svg_file}
		<section class="space-y-6">
			<div class="flex items-center justify-between border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-3xl font-bold text-secondary">Stroke Order Study</h2>
				{#if kanji.stroke_count}
					<span class="font-label text-xs uppercase tracking-[0.2em] text-outline">{kanji.stroke_count} Strokes Total</span>
				{/if}
			</div>
			<StrokeOrder svgFile={kanji.svg_file} split={true} />
			<p class="text-sm text-on-surface-variant font-body leading-relaxed max-w-lg">
				Watch the flow of each stroke. Japanese calligraphy emphasizes
				<span class="text-primary italic">brush velocity</span> and
				<span class="text-primary italic">pressure</span> at the start and end of each stroke.
			</p>
		</section>
	{/if}

	<!-- ── 3. Conjugation Matrix ──────────────────────────────────────────────── -->
	{#if adjForms.length > 0 || verbForms.length > 0}
		<section class="space-y-6">
			<div class="flex items-center gap-4 border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-3xl font-bold text-secondary">Conjugation Matrix</h2>
				{#if adjForms.length + verbForms.length > 1}
					<span class="text-xs font-label px-2 py-0.5 border border-primary text-primary tracking-widest uppercase">
						{adjForms.length + verbForms.length} Forms
					</span>
				{/if}
				<span class="text-xs font-label px-2 py-0.5 border border-primary text-primary tracking-widest uppercase">Comprehensive</span>
			</div>

			<div class="space-y-10">
				{#each adjForms as form}
					{#if form.adjForms}
						<div class="space-y-4">
							<h3 class="font-headline text-lg text-primary flex items-center gap-2">
								<span class="material-symbols-outlined text-xl">auto_stories</span>
								{form.word}
								<span class="ml-1 font-headline text-sm font-normal text-on-surface-variant">
									({form.reading}{form.altReadings.length > 0 ? ' / ' + form.altReadings.join(' / ') : ''})
								</span>
								{#if form.meanings.length > 0}
									<span class="ml-2 font-headline text-sm font-normal text-on-surface-variant italic">
										— {form.meanings.slice(0, 2).join('; ')}
									</span>
								{/if}
							</h3>
							<div class="overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/20">
								<table class="w-full text-left border-collapse">
									<thead>
										<tr class="bg-surface-container-low border-b border-outline-variant/20">
											<th class="p-4 font-label text-xs uppercase tracking-widest text-outline">Form</th>
											<th class="p-4 font-headline text-sm font-bold text-on-surface">Japanese</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-outline-variant/10">
										{#each form.adjForms as f}
											<tr class="hover:bg-surface-container-low/50 transition-colors">
												<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
													{f.label}
													<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{ADJ_ENGLISH[f.label] ?? ''}</span>
												</td>
												<td class="p-4 font-headline text-xl text-on-surface">{f.form}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}
				{/each}

				{#each verbForms as form}
					{#if form.conjugation}
						{@const c = form.conjugation}
						<div class="space-y-4">
							<h3 class="font-headline text-lg text-primary flex items-center gap-2">
								<span class="material-symbols-outlined text-xl">history_edu</span>
								{form.word}
								<span class="ml-1 font-headline text-sm font-normal text-on-surface-variant">
									({form.reading}{form.altReadings.length > 0 ? ' / ' + form.altReadings.join(' / ') : ''})
								</span>
								{#if form.meanings.length > 0}
									<span class="ml-2 font-headline text-sm font-normal text-on-surface-variant italic">
										— {form.meanings.slice(0, 2).join('; ')}
									</span>
								{/if}
							</h3>
							<div class="overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/20">
								<table class="w-full text-left border-collapse">
									<thead>
										<tr class="bg-surface-container-low border-b border-outline-variant/20">
											<th class="p-4 font-label text-xs uppercase tracking-widest text-outline">State</th>
											<th class="p-4 font-headline text-sm font-bold text-on-surface">Present</th>
											<th class="p-4 font-headline text-sm font-bold text-on-surface">Past</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-outline-variant/10">
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Plain Positive
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Plain Positive']}</span>
											</td>
											<td class="p-4 font-headline text-lg">{c.dictionaryForm}</td>
											<td class="p-4 font-headline text-lg">{c.forms.ta}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Plain Negative
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Plain Negative']}</span>
											</td>
											<td class="p-4 font-headline text-lg text-primary">{c.forms.nai}</td>
											<td class="p-4 font-headline text-lg text-primary">{c.forms.nakatta}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Polite
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Polite']}</span>
											</td>
											<td class="p-4 font-headline text-lg">{c.forms.masu}</td>
											<td class="p-4 font-headline text-lg">{c.forms.masuPast}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Polite Negative
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Polite Negative']}</span>
											</td>
											<td class="p-4 font-headline text-lg text-primary">{c.forms.masuNeg}</td>
											<td class="p-4 font-headline text-lg text-primary">{c.forms.masuPastNeg}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Te-form
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Te-form']}</span>
											</td>
											<td class="p-4 font-headline text-lg" colspan="2">{c.forms.te}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Provisional (ば)
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Provisional (ば)']}</span>
											</td>
											<td class="p-4 font-headline text-lg italic">{c.forms.ba}</td>
											<td class="p-4 font-headline text-lg text-outline">—</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Conditional
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Conditional']}</span>
											</td>
											<td class="p-4 font-headline text-lg">{c.forms.nara}</td>
											<td class="p-4 font-headline text-lg">{c.forms.tara}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Conditional Neg.
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Conditional Neg.']}</span>
											</td>
											<td class="p-4 font-headline text-lg text-primary">{c.forms.nai}なら</td>
											<td class="p-4 font-headline text-lg text-primary">{c.forms.nakatta}ら</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Potential
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Potential']}</span>
											</td>
											<td class="p-4 font-headline text-lg" colspan="2">{c.forms.potential}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Volitional
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Volitional']}</span>
											</td>
											<td class="p-4 font-headline text-lg" colspan="2">{c.forms.volitional}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Passive
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Passive']}</span>
											</td>
											<td class="p-4 font-headline text-lg" colspan="2">{c.forms.passive}</td>
										</tr>
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">
												Causative
												<span class="block text-[10px] font-label text-outline mt-0.5 normal-case">{CONJUGATION_ENGLISH['Causative']}</span>
											</td>
											<td class="p-4 font-headline text-lg" colspan="2">{c.forms.causative}</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</section>
	{/if}

	<!-- ── 4. Words using this kanji ─────────────────────────────────────────── -->
	{#if vocab.length > 0}
		<section class="space-y-6">
			<div class="flex items-center justify-between border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-3xl font-bold text-secondary">Words</h2>
				<span class="font-label text-xs uppercase tracking-[0.2em] text-outline">{vocab.length} entries</span>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each vocab as v}
					<a
						href="/vocab/{encodeURIComponent(v.word)}"
						class="bg-surface-container-lowest p-5 hover:bg-surface-container-low transition-colors group"
					>
						<div class="flex items-start justify-between gap-2 mb-2">
							<span class="font-headline text-2xl text-on-surface leading-none">{v.word}</span>
							{#if v.is_common}
								<span class="text-xs bg-secondary-container/20 text-secondary px-2 py-0.5 rounded-full font-label shrink-0 mt-0.5">Common</span>
							{/if}
						</div>
						<p class="text-sm text-outline font-body mb-1">{v.readings[0]}</p>
						<p class="text-sm text-on-surface-variant font-body line-clamp-2">{v.meanings[0]}</p>
						{#if v.pos_tags.length > 0}
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each getDisplayPosTags(v.pos_tags, 2) as tag}
									<span class="text-[10px] font-label uppercase tracking-[0.2em] text-outline">{tag}</span>
								{/each}
							</div>
						{/if}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- ── 5. Examples (KanjiAlive) ──────────────────────────────────────────── -->
	{#if examples.length > 0}
		<section class="space-y-6">
			<div class="flex items-center justify-between border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-3xl font-bold text-secondary">Examples</h2>
				<span class="font-label text-xs uppercase tracking-[0.2em] text-outline">via Kanji alive</span>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each examples as ex}
					<div class="p-5 bg-surface-container-lowest border-l-2 border-secondary/30 space-y-2">
						<p class="font-headline text-xl text-on-surface leading-snug">{ex.japanese}</p>
						<p class="text-sm text-on-surface-variant font-body">{ex.meaning}</p>
						{#if ex.audio?.mp3}
							<audio controls preload="none" class="w-full h-9 mt-1">
								<source src={ex.audio.mp3} type="audio/mpeg" />
								{#if ex.audio.ogg}<source src={ex.audio.ogg} type="audio/ogg" />{/if}
							</audio>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- ── 6. Etymology (Kanji Networks) + Mnemonic (Kanji alive) ────────────── -->
	<section class="space-y-5">
		<div class="flex items-center justify-between border-b border-outline-variant/30 pb-4">
			<h2 class="font-headline text-3xl font-bold text-secondary">Etymology</h2>
			{#if etymology}
				<a href="/references" class="font-label text-xs uppercase tracking-[0.2em] text-outline hover:text-primary transition-colors">via Kanji Networks</a>
			{/if}
		</div>

		{#if etymology || mnemonic}
			<div class="p-6 bg-surface-container border-l-2 border-primary/30 space-y-4">
				{#if etymology}
					<p class="text-on-surface font-body text-sm leading-relaxed whitespace-pre-line">{#each formatEtymology(etymology) as tok}{#if tok.bold}<strong class="font-semibold text-primary">{tok.text}</strong>{:else}{tok.text}{/if}{/each}</p>
				{/if}
				{#if mnemonic}
					<div class="pt-3 {etymology ? 'border-t border-outline-variant/20' : ''}">
						<span class="text-[10px] font-label font-bold uppercase tracking-widest text-outline block mb-1">Mnemonic — via Kanji alive</span>
						<p class="text-on-surface-variant font-body text-sm leading-relaxed">{#each formatMnHint(mnemonic) as tok}{#if tok.bold}<strong class="font-semibold text-primary">{tok.text}</strong>{:else}{tok.text}{/if}{/each}</p>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-outline font-body py-4">No etymology available for this kanji yet.</p>
		{/if}
	</section>

</div>
