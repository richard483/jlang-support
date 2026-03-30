<script lang="ts">
	import { conjugate, FORM_LABELS, type VerbGroup, type ConjugationResult } from '$lib/utils/conjugation';

	let verb = $state('');
	let group = $state<VerbGroup>('ichidan');
	let result = $state<ConjugationResult | null>(null);
	let error = $state('');

	function run() {
		error = '';
		result = null;
		const v = verb.trim();
		if (!v) return;
		try {
			result = conjugate(v, group);
		} catch (e) {
			error = String(e);
		}
	}
</script>

<svelte:head>
	<title>Verb Conjugation — JLang Support</title>
</svelte:head>

<div class="space-y-12 max-w-2xl">

	<!-- Header -->
	<div class="border-b border-outline-variant/30 pb-6">
		<span class="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-2 block">Tools</span>
		<h1 class="font-headline text-4xl md:text-5xl font-bold text-on-surface tracking-tighter">Verb Conjugation</h1>
		<p class="font-body text-on-surface-variant mt-3 leading-relaxed">
			Enter the dictionary (plain) form. For compound する verbs like <span class="font-headline text-on-surface">勉強する</span>, select "する irregular".
		</p>
	</div>

	<!-- Input card -->
	<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 space-y-5 shadow-sm">
		<div class="flex gap-3 flex-wrap items-end">
			<div class="flex-1 min-w-48 space-y-1.5">
				<label class="font-label text-[10px] uppercase tracking-widest text-outline block">Verb / Adjective</label>
				<input
					type="text"
					bind:value={verb}
					placeholder="食べる, 書く, 勉強する…"
					class="w-full h-12 px-4 bg-surface-container border-none border-b-2 border-outline-variant focus:border-primary rounded-none font-headline text-xl placeholder:text-outline transition-all duration-200 outline-none"
					onkeydown={(e) => e.key === 'Enter' && run()}
				/>
			</div>

			<div class="space-y-1.5">
				<label class="font-label text-[10px] uppercase tracking-widest text-outline block">Type</label>
				<select
					bind:value={group}
					class="h-12 px-4 bg-surface-container border-none border-b-2 border-outline-variant focus:border-primary rounded-none font-body text-sm text-on-surface outline-none transition-all duration-200 appearance-none pr-8 cursor-pointer"
				>
					<option value="ichidan">Ichidan (る-verb)</option>
					<option value="godan">Godan (う-verb)</option>
					<option value="suru">する (irregular)</option>
					<option value="kuru">くる (irregular)</option>
				</select>
			</div>
		</div>

		<button
			onclick={run}
			class="px-6 py-2.5 bg-primary text-on-primary rounded-full font-label font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
		>
			Conjugate
		</button>
	</div>

	{#if error}
		<p class="text-sm font-body text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
	{/if}

	{#if result}
		<div class="space-y-6">
			<!-- Result header -->
			<div class="flex items-baseline gap-4 pb-4 border-b border-outline-variant/30">
				<span class="font-headline text-5xl text-primary">{result.dictionaryForm}</span>
				<div class="space-y-0.5">
					<span class="font-label text-xs uppercase tracking-widest text-secondary block">{result.group} verb</span>
					<span class="font-body text-sm text-outline">ます stem: <span class="font-headline text-on-surface">{result.stemMasu}</span></span>
				</div>
			</div>

			<!-- Forms table -->
			<div class="overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-surface-container-low border-b border-outline-variant/20">
							<th class="px-6 py-3 font-label text-[10px] uppercase tracking-widest text-outline">Form</th>
							<th class="px-6 py-3 font-label text-[10px] uppercase tracking-widest text-outline">Japanese</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-outline-variant/10">
						{#each Object.entries(result.forms) as [key, value]}
							<tr class="hover:bg-surface-container-low/50 transition-colors">
								<td class="px-6 py-3 font-label text-xs text-secondary uppercase tracking-tight w-52">
									{FORM_LABELS[key as keyof typeof FORM_LABELS]}
								</td>
								<td class="px-6 py-3 font-headline text-xl text-on-surface">{value}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

</div>
