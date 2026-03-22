<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50 text-gray-900">
	<nav class="bg-white border-b border-gray-200 px-4 py-3">
		<div class="max-w-4xl mx-auto flex items-center gap-6">
			<a href="/" class="text-xl font-bold text-indigo-600">漢字</a>
			<a href="/browse" class="text-sm text-gray-600 hover:text-indigo-600">Browse</a>
			<a href="/bookmarks" class="text-sm text-gray-600 hover:text-indigo-600">Bookmarks</a>
			<a href="/conjugate" class="text-sm text-gray-600 hover:text-indigo-600">Conjugate</a>
		</div>
	</nav>

	<main class="max-w-4xl mx-auto px-4 py-8">
		{@render children()}
	</main>
</div>
