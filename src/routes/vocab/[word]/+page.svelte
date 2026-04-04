<script lang="ts">
	import SaveToBoard from '$lib/components/SaveToBoard.svelte';
	import type { PageData } from './$types';
	import StrokeOrder from '$lib/components/StrokeOrder.svelte';
	import { formatReading, katakanaToHiragana } from '$lib/utils/kana';
	import { getDisplayPosTags } from '$lib/utils/posTags';

	let { data }: { data: PageData } = $props();
	type BoardMembership = {
		id: string;
		name: string;
		card_count: number;
		isSaved: boolean;
		cardId: string | null;
	};

	let { vocab, kanjiList, boards: initialBoards, boardsError: initialBoardsError, user, conjugation, adjForms, verbGroup } = $derived(data);
	let boards = $state<BoardMembership[]>([]);
	let boardError = $state('');
	let boardBusyId = $state('');

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
	let creatingBoard = $state(false);
	let boardServiceError = $state('');

	$effect(() => {
		boards = [...(initialBoards ?? [])];
		boardServiceError = initialBoardsError ?? '';
		boardError = '';
	});

	async function addToBoard(boardId: string) {
		boardError = '';
		boardBusyId = boardId;

		try {
			const response = await fetch(`/api/boards/${encodeURIComponent(boardId)}/vocab`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ word: vocab.word })
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
			const response = await fetch(`/api/boards/${encodeURIComponent(boardId)}/vocab`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ card_id: cardId, word: vocab.word })
			});
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message || 'Failed to remove vocabulary from board.');
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
			boardError = error instanceof Error ? error.message : 'Failed to remove vocabulary from board.';
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

			const addResponse = await fetch(`/api/boards/${encodeURIComponent(createPayload.deck_id)}/vocab`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ word: vocab.word })
			});
			const addPayload = (await addResponse.json().catch(() => ({}))) as {
				message?: string;
				card_id?: string;
			};
			if (!addResponse.ok) {
				throw new Error(addPayload.message || 'Failed to save vocabulary to the new board.');
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
	<title>{vocab.word} — {vocab.readings[0]} — JLang Support</title>
</svelte:head>

<div class="space-y-20 py-4">

	<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
	<section class="relative grid grid-cols-1 gap-8 items-end border-b border-outline-variant/30 pb-10 lg:grid-cols-12">
		<div class="absolute top-0 right-0 z-10">
			<SaveToBoard
				boards={boards}
				user={user}
				itemType="vocab"
				itemId={vocab.word}
				serviceError={boardServiceError}
				actionError={boardError}
				busyBoardId={boardBusyId}
				creatingBoard={creatingBoard}
				onAdd={async ({ boardId }) => addToBoard(boardId)}
				onRemove={async ({ boardId, cardId }) => removeFromBoard(boardId, cardId)}
				onCreate={async ({ name }) => createBoardAndSave(name)}
			/>
		</div>

		<div class="space-y-5 pt-14 sm:pt-0 lg:col-span-7">
			<!-- Badges -->
			<div class="flex items-center gap-2 flex-wrap">
				{#if vocab.is_common}
					<span class="text-xs font-label font-bold text-secondary tracking-widest uppercase px-3 py-1 bg-secondary-container/20 rounded-full">Common</span>
				{/if}
				{#if vocab.alt_forms && vocab.alt_forms.length > 0}
					<span class="text-xs font-label text-outline px-3 py-1 bg-surface-container-high rounded-full">Also: {vocab.alt_forms.join('、')}</span>
				{/if}
				{#each getDisplayPosTags(vocab.pos_tags, 4) as tag}
					<span class="text-xs font-label font-bold uppercase tracking-widest text-primary px-3 py-1 bg-primary/10 rounded-full">
						{tag}
					</span>
				{/each}
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

	{#if user && boardServiceError}
		<div class="rounded-[1.25rem] bg-surface-container-low p-4 text-sm leading-7 text-on-surface-variant">
			<p class="font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">Board sync unavailable</p>
			<p class="mt-2">{boardServiceError}</p>
		</div>
	{/if}

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

	<!-- ── Conjugation Matrix ───────────────────────────────────────────────────── -->
	{#if conjugation || adjForms}
		<section class="space-y-6">
			<div class="flex items-center gap-4 border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-3xl font-bold text-secondary">Conjugation Matrix</h2>
				<span class="text-xs font-label px-2 py-0.5 border border-primary text-primary tracking-widest uppercase">Comprehensive</span>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-10">
				{#if adjForms}
					<div class="space-y-4">
						<h3 class="font-headline text-lg text-primary flex items-center gap-2">
							<span class="material-symbols-outlined text-xl">auto_stories</span>
							Adjective &amp; Functional Forms
							<span class="ml-2 font-headline text-sm font-normal text-on-surface-variant">— {vocab.word}</span>
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
									{#each adjForms as f}
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

				{#if conjugation}
					{@const c = conjugation}
					<div class="space-y-4">
						<h3 class="font-headline text-lg text-primary flex items-center gap-2">
							<span class="material-symbols-outlined text-xl">history_edu</span>
							Verb &amp; Tense Logic
							<span class="ml-2 font-headline text-sm font-normal text-on-surface-variant">— {vocab.word}</span>
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
			</div>
		</section>
	{/if}

</div>
