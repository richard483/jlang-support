<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		svgFile: string;
	}

	let { svgFile }: Props = $props();

	// ── shared state ──────────────────────────────────────────────────────────
	let container = $state<HTMLDivElement | null>(null);
	let rawSvgText = $state('');
	let loaded = $state(false);
	let mode = $state<'animate' | 'steps'>('animate');

	// ── animate mode ──────────────────────────────────────────────────────────
	let svgContent = $state('');
	let playing = $state(false);
	let currentStroke = $state(0);
	let totalStrokes = $state(0);
	let strokePaths: SVGPathElement[] = [];
	let animTimeout: ReturnType<typeof setTimeout> | null = null;

	const DURATION = 500;
	const PAUSE = 100;

	// ── steps mode ────────────────────────────────────────────────────────────
	let stepSvgs = $state<string[]>([]);

	// ── fetch & init ──────────────────────────────────────────────────────────
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
			.then(async (text) => {
				rawSvgText = text;
				svgContent = text;
				await tick();
				initStrokes();
				loaded = true;
			});
	});

	function getOrderedPaths(svg: SVGSVGElement): SVGPathElement[] {
		const orderGroup = svg.querySelector('[id$="StrokeOrder"]') as SVGGElement | null;
		return (Array.from(svg.querySelectorAll('path')) as SVGPathElement[])
			.filter((p) => /-s\d+$/.test(p.id) && !(orderGroup?.contains(p)))
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

		svg.setAttribute('width', '192');
		svg.setAttribute('height', '192');
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
			path.style.stroke = '#1e40af';
			path.style.strokeWidth = '3';
			path.style.strokeLinecap = 'round';
			path.style.strokeLinejoin = 'round';
		});
	}

	// ── animate controls ─────────────────────────────────────────────────────
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
		if (animTimeout) {
			clearTimeout(animTimeout);
			animTimeout = null;
		}
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

	// ── steps mode ────────────────────────────────────────────────────────────
	function buildStepSvgs() {
		if (stepSvgs.length > 0) return; // already built
		const parser = new DOMParser();
		const serializer = new XMLSerializer();
		const results: string[] = [];

		for (let stepIdx = 0; stepIdx < totalStrokes; stepIdx++) {
			const doc = parser.parseFromString(rawSvgText, 'image/svg+xml');
			const svg = doc.documentElement as unknown as SVGSVGElement;

			svg.setAttribute('width', '80');
			svg.setAttribute('height', '80');

			// Show stroke number overlay
			const numGroup = svg.querySelector('[id*="StrokeNumbers"]') as SVGGElement | null;
			if (numGroup) {
				numGroup.style.display = '';
				// Scale up font size slightly for readability
				numGroup.style.fontSize = '9px';
			}

			// Hide the StrokeOrder overlay group (different from StrokeNumbers)
			const orderGroup = svg.querySelector('[id$="StrokeOrder"]') as SVGGElement | null;
			if (orderGroup) orderGroup.style.display = 'none';

			const paths = getOrderedPaths(svg);

			paths.forEach((path, j) => {
				if (j < stepIdx) {
					// Completed strokes: light gray
					path.style.stroke = '#9ca3af';
					path.style.fill = 'none';
					path.style.strokeWidth = '3';
					path.style.strokeLinecap = 'round';
					path.style.strokeLinejoin = 'round';
				} else if (j === stepIdx) {
					// Current stroke: indigo
					path.style.stroke = '#1e40af';
					path.style.fill = 'none';
					path.style.strokeWidth = '3.5';
					path.style.strokeLinecap = 'round';
					path.style.strokeLinejoin = 'round';
				} else {
					// Future strokes: invisible
					path.style.display = 'none';
				}
			});

			// Hide number labels for future strokes (keep only 1..stepIdx+1)
			if (numGroup) {
				const texts = Array.from(numGroup.querySelectorAll('text'));
				texts.forEach((t, j) => {
					if (j > stepIdx) (t as SVGTextElement).style.display = 'none';
					else if (j === stepIdx) {
						(t as SVGTextElement).style.fill = '#1e40af';
						(t as SVGTextElement).style.fontWeight = 'bold';
						(t as SVGTextElement).style.fontSize = '9px';
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

<div class="space-y-3">
	<!-- Tab bar -->
	{#if loaded}
		<div class="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
			<button
				onclick={() => switchMode('animate')}
				class="px-3 py-1 rounded-md text-sm font-medium transition-colors {mode === 'animate'
					? 'bg-white text-gray-800 shadow-sm'
					: 'text-gray-500 hover:text-gray-700'}"
			>
				Animate
			</button>
			<button
				onclick={() => switchMode('steps')}
				class="px-3 py-1 rounded-md text-sm font-medium transition-colors {mode === 'steps'
					? 'bg-white text-gray-800 shadow-sm'
					: 'text-gray-500 hover:text-gray-700'}"
			>
				Steps
			</button>
		</div>
	{/if}

	<!-- Animate mode -->
	{#if mode === 'animate'}
		<div
			bind:this={container}
			class="w-48 h-48 border border-gray-200 rounded-xl bg-white flex items-center justify-center overflow-hidden"
		>
			{#if svgContent}
				{@html svgContent}
			{:else}
				<div
					class="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"
				></div>
			{/if}
		</div>

		{#if loaded && totalStrokes > 0}
			<div class="flex items-center gap-2 flex-wrap">
				{#if playing}
					<button
						onclick={pause}
						class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
					>
						⏸ Pause
					</button>
				{:else}
					<button
						onclick={play}
						class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
					>
						▶ {currentStroke === 0 ? 'Play' : 'Continue'}
					</button>
				{/if}
				<button
					onclick={doReset}
					class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
					title="Reset"
				>
					↺
				</button>
				<button
					onclick={showAll}
					class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
				>
					Show all
				</button>
				<span class="text-xs text-gray-400 ml-auto tabular-nums">
					{currentStroke} / {totalStrokes}
				</span>
			</div>

			<div class="flex flex-wrap gap-1">
				{#each { length: totalStrokes } as _, i}
					<div
						class="w-2 h-2 rounded-full transition-colors duration-150 {i < currentStroke
							? 'bg-indigo-500'
							: 'bg-gray-200'}"
					></div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Steps mode -->
	{#if mode === 'steps' && stepSvgs.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each stepSvgs as svg, i}
				<div class="relative border border-gray-100 rounded-lg bg-white overflow-hidden">
					{@html svg}
					<span
						class="absolute bottom-0.5 right-1 text-[10px] font-mono text-gray-400 leading-none"
					>
						{i + 1}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
