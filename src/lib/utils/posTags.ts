const POS_DISPLAY_LABELS = new Map<string, string>([
	['Adverb (fukushi)', 'Adverb'],
	['Conjunction', 'Conjunction'],
	['Counter', 'Counter'],
	['Expression (phrase, clause, etc.)', 'Expression'],
	['Expressions (phrases, clauses, etc.)', 'Expression'],
	['Ichidan verb', 'Ichidan verb'],
	['Intransitive verb', 'Intransitive'],
	['Interjection (kandoushi)', 'Interjection'],
	['Kuru verb - special class', 'Kuru verb'],
	['Na-adjective (keiyodoshi)', 'Na-adjective'],
	['Noun (common) (futsuumeishi)', 'Noun'],
	['Particle', 'Particle'],
	['Prefix', 'Prefix'],
	['Pronoun', 'Pronoun'],
	['Suru verb - included', 'Suru verb'],
	['Suru verb - special class', 'Suru verb'],
	['Suffix', 'Suffix'],
	['Transitive verb', 'Transitive'],
	['I-adjective (keiyoushi)', 'I-adjective']
]);

export function formatPosTag(tag: string) {
	if (POS_DISPLAY_LABELS.has(tag)) {
		return POS_DISPLAY_LABELS.get(tag) ?? tag;
	}

	if (tag.startsWith('Godan verb')) {
		return 'Godan verb';
	}

	if (tag.startsWith('Noun')) {
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
