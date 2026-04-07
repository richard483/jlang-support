const POS_DISPLAY_LABELS = new Map<string, string>([
	['adverb (fukushi)', 'Adverb'],
	['conjunction', 'Conjunction'],
	['counter', 'Counter'],
	['expression (phrase, clause, etc.)', 'Expression'],
	['expressions (phrases, clauses, etc.)', 'Expression'],
	['ichidan verb', 'Ichidan verb'],
	['intransitive verb', 'Intransitive'],
	['interjection (kandoushi)', 'Interjection'],
	['kuru verb - special class', 'Kuru verb'],
	['na-adjective (keiyodoshi)', 'Na-adjective'],
	['noun (common) (futsuumeishi)', 'Noun'],
	['particle', 'Particle'],
	['prefix', 'Prefix'],
	['pronoun', 'Pronoun'],
	['suru verb - included', 'Suru verb'],
	['suru verb - special class', 'Suru verb'],
	['suffix', 'Suffix'],
	['transitive verb', 'Transitive'],
	['i-adjective (keiyoushi)', 'I-adjective']
]);

export function formatPosTag(tag: string) {
	const normalized = tag.trim().toLowerCase();

	if (POS_DISPLAY_LABELS.has(normalized)) {
		return POS_DISPLAY_LABELS.get(normalized) ?? tag;
	}

	if (normalized.startsWith('godan verb')) {
		return 'Godan verb';
	}

	if (normalized.startsWith('noun')) {
		return 'Noun';
	}

	return tag;
}

export function getDisplayPosTags(tags: string[], limit = tags.length) {
	const formatted = tags
		.map((tag) => formatPosTag(tag))
		.filter(Boolean)
		.filter((tag, index, all) => all.indexOf(tag) === index);

	return formatted.slice(0, limit);
}
