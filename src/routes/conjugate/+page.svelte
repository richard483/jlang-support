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
	<title>Verb Conjugation</title>
</svelte:head>

<div class="space-y-6 max-w-2xl">
	<h1 class="text-2xl font-bold">Verb Conjugation</h1>

	<div class="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
		<div class="flex gap-3 flex-wrap">
			<input
				type="text"
				bind:value={verb}
				placeholder="食べる, 書く, 勉強する..."
				class="flex-1 min-w-40 border border-gray-300 rounded-lg px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
				onkeydown={(e) => e.key === 'Enter' && run()}
			/>

			<select
				bind:value={group}
				class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
			>
				<option value="ichidan">Ichidan (る-verb)</option>
				<option value="godan">Godan (う-verb)</option>
				<option value="suru">する (irregular)</option>
				<option value="kuru">くる (irregular)</option>
			</select>

			<button
				onclick={run}
				class="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
			>
				Conjugate
			</button>
		</div>

		<p class="text-xs text-gray-400">
			Tip: Enter the dictionary (plain) form. For compound する verbs like 勉強する, select "する".
		</p>
	</div>

	{#if error}
		<p class="text-red-500 text-sm">{error}</p>
	{/if}

	{#if result}
		<div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
			<div class="px-5 py-4 border-b border-gray-100 flex items-baseline gap-3">
				<span class="text-3xl font-thin">{result.dictionaryForm}</span>
				<span class="text-sm text-gray-400">{result.group} verb · masu stem: {result.stemMasu}</span>
			</div>

			<table class="w-full text-sm">
				<tbody>
					{#each Object.entries(result.forms) as [key, value]}
						<tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
							<td class="px-5 py-2.5 text-gray-500 w-48">{FORM_LABELS[key as keyof typeof FORM_LABELS]}</td>
							<td class="px-5 py-2.5 text-xl font-light">{value}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
