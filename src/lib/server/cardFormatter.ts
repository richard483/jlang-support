export type FlashcardInput = {
	front: string;
	back: string;
	reading?: string;
};

export type KanjiCardSource = {
	literal: string;
	meanings: string[];
	on_readings: string[];
	kun_readings: string[];
};

export type VocabCardSource = {
	word: string;
	readings: string[];
	meanings: string[];
	alt_forms?: string[];
};

export type ParsedBoardCard = {
	type: 'kanji' | 'vocab' | 'unknown';
	identifier: string;
};

export function formatKanjiCard(kanji: KanjiCardSource): FlashcardInput {
	const meanings = kanji.meanings.filter(Boolean);
	const onReadings = kanji.on_readings.filter(Boolean);
	const kunReadings = kanji.kun_readings.filter(Boolean);
	const reading = [
		onReadings.length ? `ON: ${onReadings.join(', ')}` : '',
		kunReadings.length ? `KUN: ${kunReadings.join(', ')}` : ''
	]
		.filter(Boolean)
		.join('\n');

	return {
		front: `KANJI:${kanji.literal}`,
		back: meanings.join(', '),
		...(reading ? { reading } : {})
	};
}

export function formatVocabCard(vocab: VocabCardSource): FlashcardInput {
	const readings = vocab.readings.filter(Boolean);
	const meanings = vocab.meanings.filter(Boolean);
	const altForms = (vocab.alt_forms ?? []).filter(Boolean);
	const reading = [
		readings.join(', '),
		altForms.length ? `ALT: ${altForms.join(', ')}` : ''
	]
		.filter(Boolean)
		.join('\n');

	return {
		front: `VOCAB:${vocab.word}`,
		back: meanings.join(', '),
		...(reading ? { reading } : {})
	};
}

export function parseCardType(frontText: string): ParsedBoardCard {
	const [firstLine = ''] = frontText.split('\n');
	if (firstLine.startsWith('KANJI:')) {
		return {
			type: 'kanji',
			identifier: firstLine.slice('KANJI:'.length).trim()
		};
	}

	if (firstLine.startsWith('VOCAB:')) {
		return {
			type: 'vocab',
			identifier: firstLine.slice('VOCAB:'.length).trim()
		};
	}

	return {
		type: 'unknown',
		identifier: firstLine.trim()
	};
}

export function getCardSummary(frontText: string, backText?: string) {
	const [firstLine = '', ...rest] = frontText.split('\n');
	const legacySummary = rest
		.map((line) => line.trim())
		.filter(Boolean)
		.join(' ');
	const isStructured = firstLine.startsWith('KANJI:') || firstLine.startsWith('VOCAB:');

	if (isStructured && legacySummary) {
		return legacySummary;
	}

	if (backText?.trim()) {
		return backText.trim();
	}

	return legacySummary;
}

export function getCardPreview(frontText: string) {
	const parsed = parseCardType(frontText);
	return parsed.identifier ? parsed : null;
}

export function findBoardCard(
	cards: Array<{ id: string; front_text: string }>,
	type: 'kanji' | 'vocab',
	identifier: string
) {
	return (
		cards.find((card) => {
			const parsed = parseCardType(card.front_text);
			return parsed.type === type && parsed.identifier === identifier;
		}) ?? null
	);
}
