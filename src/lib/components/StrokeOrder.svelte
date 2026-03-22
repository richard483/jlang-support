<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		svgFile: string;
	}

	let { svgFile }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let svgContent = $state('');
	let loaded = $state(false);
	let playing = $state(false);
	let currentStroke = $state(0);
	let totalStrokes = $state(0);
	let strokePaths: SVGPathElement[] = $state([]);
	let animTimeout: ReturnType<typeof setTimeout> | null = null;

	const DURATION = 500; // ms per stroke animation
	const PAUSE = 100; // ms gap between strokes

	$effect(() => {
		if (!svgFile) return;
		loaded = false;
		svgContent = '';
		strokePaths = [];
		currentStroke = 0;
		playing = false;

		fetch(`/kanjivg/${svgFile}`)
			.then((r) => r.text())
			.then(async (text) => {
				svgContent = text;
				await tick();
				initStrokes();
				loaded = true;
			});
	});

	function initStrokes() {
		if (!container) return;
		const svg = container.querySelector('svg');
		if (!svg) return;

		// Make SVG fill the container
		svg.setAttribute('width', '192');
		svg.setAttribute('height', '192');
		svg.style.display = 'block';

		// Hide the stroke-number overlay group if present
		const orderGroup = svg.querySelector('[id$="StrokeOrder"]') as SVGGElement | null;
		if (orderGroup) orderGroup.style.display = 'none';

		// Find all stroke paths (id ends with -sN) excluding number overlays
		const all = Array.from(svg.querySelectorAll('path')) as SVGPathElement[];
		const strokes = all
			.filter((p) => /-s\d+$/.test(p.id) && !(orderGroup?.contains(p)))
			.sort((a, b) => {
				const na = parseInt(a.id.match(/-s(\d+)$/)?.[1] ?? '0');
				const nb = parseInt(b.id.match(/-s(\d+)$/)?.[1] ?? '0');
				return na - nb;
			});

		strokePaths = strokes;
		totalStrokes = strokes.length;

		// Style all strokes: hide with dash offset
		strokes.forEach((path) => {
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

	function animateFrom(index: number) {
		if (index >= strokePaths.length) {
			playing = false;
			currentStroke = totalStrokes;
			return;
		}
		currentStroke = index + 1;
		const path = strokePaths[index];
		// Force reflow so transition fires
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
</script>

<div class="space-y-3">
	<!-- SVG canvas -->
	<div
		bind:this={container}
		class="w-48 h-48 border border-gray-200 rounded-xl bg-white flex items-center justify-center overflow-hidden"
	>
		{#if svgContent}
			{@html svgContent}
		{:else}
			<div class="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
		{/if}
	</div>

	{#if loaded && totalStrokes > 0}
		<!-- Controls -->
		<div class="flex items-center gap-2 flex-wrap">
			{#if playing}
				<button
					onclick={pause}
					class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
				>
					<span>⏸</span> Pause
				</button>
			{:else}
				<button
					onclick={play}
					class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
				>
					<span>▶</span>
					{currentStroke === 0 ? 'Play' : 'Continue'}
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

		<!-- Progress dots -->
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
</div>
