<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		svgFile: string;
		/** When true: animate pane + steps grid shown side-by-side (no tabs). */
		split?: boolean;
	}

	let { svgFile, split = false }: Props = $props();

	// ── shared ────────────────────────────────────────────────────────────────
	let container = $state<HTMLDivElement | null>(null);
	let rawSvgText = $state('');
	let loaded = $state(false);
	let mode = $state<'animate' | 'steps'>('animate');

	// ── animate ───────────────────────────────────────────────────────────────
	let svgContent = $state('');
	let playing = $state(false);
	let currentStroke = $state(0);
	let totalStrokes = $state(0);
	let strokePaths: SVGPathElement[] = [];
	let animTimeout: ReturnType<typeof setTimeout> | null = null;

	const DURATION = 500;
	const PAUSE = 100;

	// ── steps ─────────────────────────────────────────────────────────────────
	let stepSvgs = $state<string[]>([]);

	// ── fetch ─────────────────────────────────────────────────────────────────
	$effect(() => {
		if (!svgFile) return;
		loaded = false;
		rawSvgText = '';
		svgContent = '';
		strokePaths = [];
		stepSvgs = [];
		currentStroke = 0;
		playing = false;

		fetch(`/kanjivg/${svgFile}`)
			.then((r) => r.text())
			.then((text) => {
				rawSvgText = text;
				svgContent = text.replace(/<!DOCTYPE[\s\S]*?]>\s*/m, '');
				loaded = true;
			});
	});

	// Re-init stroke paths whenever the animate container is (re-)mounted.
	// totalStrokes is set here, so buildStepSvgs() must be called after initStrokes().
	$effect(() => {
		if (!container || !loaded) return;
		void mode;
		tick().then(() => {
			pause();
			currentStroke = 0;
			initStrokes();
			if (split) buildStepSvgs();
		});
	});

	function getOrderedPaths(svg: SVGSVGElement): SVGPathElement[] {
		const orderGroup = svg.querySelector('[id$="StrokeOrder"]') as SVGGElement | null;
		return (Array.from(svg.querySelectorAll('path')) as SVGPathElement[])
			.filter((p) => /-s\d+$/.test(p.id) && !orderGroup?.contains(p))
			.sort((a, b) => {
				const na = parseInt(a.id.match(/-s(\d+)$/)?.[1] ?? '0');
				const nb = parseInt(b.id.match(/-s(\d+)$/)?.[1] ?? '0');
				return na - nb;
			});
	}

	function initStrokes() {
		if (!container) return;
		const svg = container.querySelector('svg');
		if (!svg) return;

		svg.style.width = '100%';
		svg.style.height = '100%';
		svg.style.display = 'block';

		const orderGroup = svg.querySelector('[id$="StrokeOrder"]') as SVGGElement | null;
		if (orderGroup) orderGroup.style.display = 'none';

		strokePaths = getOrderedPaths(svg as SVGSVGElement);
		totalStrokes = strokePaths.length;

		strokePaths.forEach((path) => {
			const len = path.getTotalLength();
			path.style.strokeDasharray = String(len);
			path.style.strokeDashoffset = String(len);
			path.style.transition = 'none';
			path.style.fill = 'none';
			path.style.stroke = '#a04100';
			path.style.strokeWidth = '3';
			path.style.strokeLinecap = 'round';
			path.style.strokeLinejoin = 'round';
		});
	}

	// ── animate controls ──────────────────────────────────────────────────────
	function animateFrom(index: number) {
		if (index >= strokePaths.length) {
			playing = false;
			currentStroke = totalStrokes;
			return;
		}
		currentStroke = index + 1;
		const path = strokePaths[index];
		path.getBoundingClientRect();
		path.style.transition = `stroke-dashoffset ${DURATION}ms ease-in-out`;
		path.style.strokeDashoffset = '0';
		animTimeout = setTimeout(() => animateFrom(index + 1), DURATION + PAUSE);
	}

	function play() {
		if (currentStroke >= totalStrokes) doReset();
		playing = true;
		animateFrom(currentStroke);
	}

	function pause() {
		playing = false;
		if (animTimeout) { clearTimeout(animTimeout); animTimeout = null; }
	}

	function doReset() {
		pause();
		strokePaths.forEach((p) => {
			const len = p.getTotalLength();
			p.style.transition = 'none';
			p.style.strokeDashoffset = String(len);
		});
		currentStroke = 0;
	}

	function showAll() {
		pause();
		strokePaths.forEach((p) => {
			p.style.transition = 'none';
			p.style.strokeDashoffset = '0';
		});
		currentStroke = totalStrokes;
	}

	// ── steps builder ─────────────────────────────────────────────────────────
	function fixSvgNamespaces(text: string): string {
		return text
			.replace(/<!DOCTYPE[\s\S]*?]>/m, '')
			.replace(/<svg /, '<svg xmlns:kvg="http://kanjivg.tagaini.net" ');
	}

	function buildStepSvgs() {
		if (stepSvgs.length > 0) return;
		const parser = new DOMParser();
		const serializer = new XMLSerializer();
		const results: string[] = [];
		const cleanSvgText = fixSvgNamespaces(rawSvgText);

		for (let stepIdx = 0; stepIdx < totalStrokes; stepIdx++) {
			const doc = parser.parseFromString(cleanSvgText, 'image/svg+xml');
			const svg = doc.documentElement as unknown as SVGSVGElement;
			svg.setAttribute('width', '80');
			svg.setAttribute('height', '80');

			const numGroup = svg.querySelector('[id*="StrokeNumbers"]') as SVGGElement | null;
			if (numGroup) { numGroup.style.display = ''; numGroup.style.fontSize = '9px'; }

			const orderGroup = svg.querySelector('[id$="StrokeOrder"]') as SVGGElement | null;
			if (orderGroup) orderGroup.style.display = 'none';

			getOrderedPaths(svg).forEach((path, j) => {
				if (j < stepIdx) {
					path.style.stroke = '#dfc0b3';
					path.style.fill = 'none';
					path.style.strokeWidth = '3';
					path.style.strokeLinecap = 'round';
					path.style.strokeLinejoin = 'round';
				} else if (j === stepIdx) {
					path.style.stroke = '#a04100';
					path.style.fill = 'none';
					path.style.strokeWidth = '3.5';
					path.style.strokeLinecap = 'round';
					path.style.strokeLinejoin = 'round';
				} else {
					path.style.display = 'none';
				}
			});

			if (numGroup) {
				Array.from(numGroup.querySelectorAll('text')).forEach((t, j) => {
					if (j > stepIdx) (t as SVGTextElement).style.display = 'none';
					else if (j === stepIdx) {
						(t as SVGTextElement).style.fill = '#a04100';
						(t as SVGTextElement).style.fontWeight = 'bold';
					}
				});
			}

			results.push(serializer.serializeToString(svg));
		}
		stepSvgs = results;
	}

	function switchMode(m: 'animate' | 'steps') {
		mode = m;
		if (m === 'steps') buildStepSvgs();
	}
</script>

{#if split}
	<!-- ── Split layout: animate left, steps right ─────────────────────────── -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
		<!-- Animate pane -->
		<div class="lg:col-span-5 space-y-4">
			<div
				bind:this={container}
				class="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm relative aspect-square flex items-center justify-center overflow-hidden group"
			>
				<!-- Calligraphy guide lines -->
				<div class="absolute inset-0 pointer-events-none opacity-5">
					<div class="absolute inset-x-0 top-1/2 border-t border-on-surface"></div>
					<div class="absolute inset-y-0 left-1/2 border-l border-on-surface"></div>
					<div class="absolute inset-0 border border-on-surface m-12 rounded-full border-dashed"></div>
				</div>
				{#if svgContent}
					<div class="w-full h-full p-8">{@html svgContent}</div>
				{:else}
					<div class="w-6 h-6 border-2 border-outline border-t-primary rounded-full animate-spin"></div>
				{/if}
				{#if loaded && totalStrokes > 0}
					<div class="absolute bottom-4 left-4 flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
						<span class="font-label text-[10px] uppercase tracking-widest text-outline">
							{playing ? 'Drawing…' : currentStroke === 0 ? 'Ready' : currentStroke === totalStrokes ? 'Complete' : `Stroke ${currentStroke}`}
						</span>
					</div>
				{/if}
			</div>

			{#if loaded && totalStrokes > 0}
				<div class="flex items-center gap-2 flex-wrap px-1">
					{#if playing}
						<button onclick={pause} class="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-sm font-label font-medium transition-colors">
							<span class="material-symbols-outlined text-sm leading-none">pause</span> Pause
						</button>
					{:else}
						<button onclick={play} class="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary hover:opacity-90 rounded-full text-sm font-label font-medium transition-opacity">
							<span class="material-symbols-outlined text-sm leading-none">play_arrow</span>
							{currentStroke === 0 ? 'Play' : 'Continue'}
						</button>
					{/if}
					<button onclick={doReset} class="p-2 bg-surface-container-high hover:bg-surface-container-highest rounded-full transition-colors" title="Reset">
						<span class="material-symbols-outlined text-sm leading-none">replay</span>
					</button>
					<button onclick={showAll} class="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-sm font-label transition-colors">
						Show all
					</button>
					<span class="ml-auto text-xs font-label text-outline tabular-nums">{currentStroke} / {totalStrokes}</span>
				</div>
				<!-- Progress bar -->
				<div class="h-0.5 bg-outline-variant/30 rounded-full mx-1 overflow-hidden">
					<div
						class="h-full bg-primary rounded-full transition-all duration-300"
						style="width: {totalStrokes > 0 ? (currentStroke / totalStrokes) * 100 : 0}%"
					></div>
				</div>
			{/if}
		</div>

		<!-- Steps grid pane -->
		<div class="lg:col-span-7">
			{#if stepSvgs.length > 0}
				<div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-2">
					{#each stepSvgs as svg, i}
						<div class="relative bg-surface-container-lowest p-2 aspect-square flex items-center justify-center rounded-xl shadow-sm border border-outline-variant/10">
							{@html svg}
							<span class="absolute bottom-0.5 right-1 text-[9px] font-mono text-outline leading-none">{i + 1}</span>
						</div>
					{/each}
				</div>
			{:else if loaded}
				<div class="flex items-center justify-center h-32 text-outline text-sm font-label">Building steps…</div>
			{/if}
		</div>
	</div>

{:else}
	<!-- ── Tab layout (standalone usage) ──────────────────────────────────── -->
	<div class="space-y-3">
		{#if loaded}
			<div class="flex gap-1 bg-surface-container-high rounded-full p-1 w-fit">
				<button
					onclick={() => switchMode('animate')}
					class="px-3 py-1 rounded-full text-sm font-label font-medium transition-colors {mode === 'animate' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
				>Animate</button>
				<button
					onclick={() => switchMode('steps')}
					class="px-3 py-1 rounded-full text-sm font-label font-medium transition-colors {mode === 'steps' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
				>Steps</button>
			</div>
		{/if}

		{#if mode === 'animate'}
			<div bind:this={container} class="w-48 h-48 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl flex items-center justify-center overflow-hidden">
				{#if svgContent}
					<div class="w-full h-full p-4">{@html svgContent}</div>
				{:else}
					<div class="w-5 h-5 border-2 border-outline border-t-primary rounded-full animate-spin"></div>
				{/if}
			</div>

			{#if loaded && totalStrokes > 0}
				<div class="flex items-center gap-2 flex-wrap">
					{#if playing}
						<button onclick={pause} class="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-sm font-label transition-colors">⏸ Pause</button>
					{:else}
						<button onclick={play} class="px-3 py-1.5 bg-primary text-on-primary rounded-full text-sm font-label hover:opacity-90 transition-opacity">▶ {currentStroke === 0 ? 'Play' : 'Continue'}</button>
					{/if}
					<button onclick={doReset} class="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-sm font-label transition-colors">↺</button>
					<button onclick={showAll} class="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-sm font-label transition-colors">Show all</button>
					<span class="ml-auto text-xs text-outline tabular-nums">{currentStroke} / {totalStrokes}</span>
				</div>
				<div class="flex flex-wrap gap-1">
					{#each { length: totalStrokes } as _, i}
						<div class="w-2 h-2 rounded-full transition-colors {i < currentStroke ? 'bg-primary' : 'bg-outline-variant'}"></div>
					{/each}
				</div>
			{/if}
		{/if}

		{#if mode === 'steps' && stepSvgs.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each stepSvgs as svg, i}
					<div class="relative border border-outline-variant/10 rounded-xl bg-surface-container-lowest overflow-hidden">
						{@html svg}
						<span class="absolute bottom-0.5 right-1 text-[10px] font-mono text-outline leading-none">{i + 1}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
