<script lang="ts">
	import SaveToBoard from '$lib/components/SaveToBoard.svelte';
	import StrokeOrder from '$lib/components/StrokeOrder.svelte';
	import { formatReading, katakanaToHiragana } from '$lib/utils/kana';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type BoardMembership = {
		id: string;
		name: string;
		card_count: number;
		isSaved: boolean;
		cardId: string | null;
	};

	let { kanji, radicals, mnemonics: initialMnemonics, boards: initialBoards, boardsError: initialBoardsError, wordForms, vocab, user } = $derived(data);
	let mnemonics = $state<typeof initialMnemonics>([]);
	let boards = $state<BoardMembership[]>([]);
	let boardError = $state('');
	let boardBusyId = $state('');
	let creatingBoard = $state(false);
	let boardServiceError = $state('');
	const isAuthenticated = $derived(Boolean(user));

	$effect(() => {
		mnemonics = [...initialMnemonics];
		boards = [...(initialBoards ?? [])];
		boardServiceError = initialBoardsError ?? '';
		boardError = '';
	});

	let showMnemonicForm = $state(false);
	let newMnemonic = $state('');
	let newEtymology = $state('');
	let submitting = $state(false);

	const tanoshiiUrl = $derived(`https://www.tanoshiijapanese.com/dictionary/?j=${encodeURIComponent(kanji.literal)}`);
	const loginRedirect = $derived(`/login?redirectTo=${encodeURIComponent(`/kanji/${kanji.literal}`)}`);

	// Derive the hero heading from word forms or fall back to readings
	const heroTitle = $derived(() => {
		if (wordForms.length === 0) return kanji.on_readings.slice(0, 2).join(' / ') || kanji.literal;
		return wordForms.slice(0, 2).map((wf) => wf.word).join(' / ');
	});

	// Separate adjective and verb forms for the two-table conjugation matrix
	const adjForm = $derived(wordForms.find((wf) => wf.type === 'adjective-i') ?? null);
	const verbForm = $derived(wordForms.find((wf) => wf.type === 'verb-ichidan' || wf.type === 'verb-godan') ?? null);

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
	<title>{kanji.literal} — {kanji.meanings[0] ?? 'Kanji'} — JLang Support</title>
</svelte:head>

<div class="space-y-20 py-4">

	<!-- ── 1. Hero ────────────────────────────────────────────────────────────── -->
	<section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
		<!-- Left: meta -->
		<div class="lg:col-span-5 space-y-5">
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
							<a
								href="/kanji/{encodeURIComponent(r)}"
								class="font-headline text-2xl px-3 py-1.5 bg-surface-container-low hover:bg-surface-container transition-colors rounded-lg text-on-surface"
								title="View {r}"
							>{r}</a>
						{/each}
					</div>
				</div>
			{/if}

			<a href={tanoshiiUrl} target="_blank" rel="noopener noreferrer"
				class="inline-flex items-center gap-1 text-xs font-label text-secondary hover:text-primary hover:underline transition-colors">
				View on Tanoshii Japanese
				<span class="material-symbols-outlined text-sm leading-none">open_in_new</span>
			</a>
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
	{#if adjForm || verbForm}
		<section class="space-y-6">
			<div class="flex items-center gap-4 border-b border-outline-variant/30 pb-4">
				<h2 class="font-headline text-3xl font-bold text-secondary">Conjugation Matrix</h2>
				<span class="text-xs font-label px-2 py-0.5 border border-primary text-primary tracking-widest uppercase">Comprehensive</span>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-10">
				<!-- Adjective & Functional Forms -->
				{#if adjForm && adjForm.adjForms}
					<div class="space-y-4">
						<h3 class="font-headline text-lg text-primary flex items-center gap-2">
							<span class="material-symbols-outlined text-xl">auto_stories</span>
							Adjective &amp; Functional Forms
							<span class="ml-2 font-headline text-sm font-normal text-on-surface-variant">— {adjForm.word}</span>
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
									{#each adjForm.adjForms as f}
										<tr class="hover:bg-surface-container-low/50 transition-colors">
											<td class="p-4 text-xs font-label text-secondary uppercase tracking-tight">{f.label}</td>
											<td class="p-4 font-headline text-xl text-on-surface">{f.form}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Verb & Tense Logic -->
				{#if verbForm && verbForm.conjugation}
					{@const c = verbForm.conjugation}
					<div class="space-y-4">
						<h3 class="font-headline text-lg text-primary flex items-center gap-2">
							<span class="material-symbols-outlined text-xl">history_edu</span>
							Verb &amp; Tense Logic
							<span class="ml-2 font-headline text-sm font-normal text-on-surface-variant">— {verbForm.word}</span>
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
										<td class="p-4 text-xs font-label text-secondary uppercase">Plain Positive</td>
										<td class="p-4 font-headline text-lg">{c.dictionaryForm}</td>
										<td class="p-4 font-headline text-lg">{c.forms.ta}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Plain Negative</td>
										<td class="p-4 font-headline text-lg text-primary">{c.forms.nai}</td>
										<td class="p-4 font-headline text-lg text-primary">{c.forms.nakatta}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Polite</td>
										<td class="p-4 font-headline text-lg">{c.forms.masu}</td>
										<td class="p-4 font-headline text-lg">{c.forms.masuPast}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Polite Negative</td>
										<td class="p-4 font-headline text-lg text-primary">{c.forms.masuNeg}</td>
										<td class="p-4 font-headline text-lg text-primary">{c.forms.masuPastNeg}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Te-form</td>
										<td class="p-4 font-headline text-lg" colspan="2">{c.forms.te}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Provisional (ば)</td>
										<td class="p-4 font-headline text-lg italic">{c.forms.ba}</td>
										<td class="p-4 font-headline text-lg text-outline">—</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Conditional</td>
										<td class="p-4 font-headline text-lg">{c.forms.nara}</td>
										<td class="p-4 font-headline text-lg">{c.forms.tara}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Conditional Neg.</td>
										<td class="p-4 font-headline text-lg text-primary">{c.forms.nai}なら</td>
										<td class="p-4 font-headline text-lg text-primary">{c.forms.nakatta}ら</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Potential</td>
										<td class="p-4 font-headline text-lg" colspan="2">{c.forms.potential}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Volitional</td>
										<td class="p-4 font-headline text-lg" colspan="2">{c.forms.volitional}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Passive</td>
										<td class="p-4 font-headline text-lg" colspan="2">{c.forms.passive}</td>
									</tr>
									<tr class="hover:bg-surface-container-low/50 transition-colors">
										<td class="p-4 text-xs font-label text-secondary uppercase">Causative</td>
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
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- ── 5. Mnemonics ───────────────────────────────────────────────────────── -->
	<section class="space-y-5">
		<div class="flex items-center justify-between border-b border-outline-variant/30 pb-4">
			<h2 class="font-headline text-3xl font-bold text-secondary">Mnemonics &amp; Etymology</h2>
			{#if isAuthenticated}
				<button
					onclick={() => (showMnemonicForm = !showMnemonicForm)}
					class="text-sm font-label text-primary hover:underline"
				>{showMnemonicForm ? 'Cancel' : '+ Add'}</button>
			{/if}
		</div>

		{#if !isAuthenticated}
			<div class="rounded-[1.5rem] bg-surface-container-low p-6">
				<p class="font-headline text-2xl text-on-surface">Save personal notes after login.</p>
				<p class="mt-2 max-w-2xl text-sm leading-7 text-on-surface-variant">
					Boards and mnemonics are private to your account now. Sign in to keep study notes tied to your own kanji workflow.
				</p>
				<a
					href={loginRedirect}
					class="mt-4 inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-label font-semibold text-on-primary transition-opacity hover:opacity-90"
				>
					Login to add notes
				</a>
			</div>
		{:else}
			{#if showMnemonicForm}
				<div class="space-y-3 p-6 bg-surface-container-low">
					<textarea
						bind:value={newMnemonic}
						placeholder="How do you remember this kanji?"
						class="w-full bg-surface-container-high border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 px-3 py-2 text-sm font-body resize-none h-20 outline-none rounded-none"
					></textarea>
					<input
						bind:value={newEtymology}
						type="text"
						placeholder="Etymology hint (optional)"
						class="w-full bg-surface-container-high border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 px-3 py-2 text-sm font-body outline-none rounded-none"
					/>
					<button
						onclick={addMnemonic}
						disabled={submitting || !newMnemonic.trim()}
						class="px-6 py-2 bg-primary text-on-primary rounded-full text-sm font-label font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
					>{submitting ? 'Saving…' : 'Save'}</button>
				</div>
			{/if}

			{#if mnemonics.length === 0 && !showMnemonicForm}
				<p class="text-sm text-outline font-body py-4">No mnemonics yet. Add one to help remember this kanji!</p>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each mnemonics as m}
					<div class="p-6 bg-surface-container relative group border-l-2 border-primary/30">
						<p class="text-on-surface font-body text-sm leading-relaxed">{m.mnemonic}</p>
						{#if m.etymology}
							<p class="text-xs text-outline font-body italic mt-2">{m.etymology}</p>
						{/if}
						<button
							onclick={() => deleteMnemonic(m.id)}
							class="absolute top-4 right-4 text-xs font-label text-error opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
						>delete</button>
					</div>
				{/each}
			</div>
		{/if}
	</section>

</div>
