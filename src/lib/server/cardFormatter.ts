import { katakanaToHiragana } from '$lib/utils/kana';

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

function firstNonEmpty(values: string[]) {
	return values.find((value) => value.trim().length > 0) ?? '';
}

export function formatKanjiCard(kanji: KanjiCardSource): FlashcardInput {
	const meanings = kanji.meanings.filter(Boolean);
	const onReadings = kanji.on_readings.filter(Boolean);
	const kunReadings = kanji.kun_readings.filter(Boolean);
	const primaryReading = kunReadings[0] || (onReadings[0] ? katakanaToHiragana(onReadings[0]) : '');

	return {
		front: `KANJI:${kanji.literal}\n${meanings.join(', ')}`,
		back: [
			onReadings.length ? `ON: ${onReadings.join(', ')}` : '',
			kunReadings.length ? `KUN: ${kunReadings.join(', ')}` : ''
		]
			.filter(Boolean)
			.join('\n'),
		...(primaryReading ? { reading: primaryReading } : {})
	};
}

export function formatVocabCard(vocab: VocabCardSource): FlashcardInput {
	const readings = vocab.readings.filter(Boolean);
	const meanings = vocab.meanings.filter(Boolean);
	const altForms = (vocab.alt_forms ?? []).filter(Boolean);
	const primaryReading = firstNonEmpty(readings);

	return {
		front: `VOCAB:${vocab.word}\n${meanings.join(', ')}`,
		back: [
			readings.length ? readings.join(', ') : '',
			altForms.length ? `ALT: ${altForms.join(', ')}` : ''
		]
			.filter(Boolean)
			.join('\n'),
		...(primaryReading ? { reading: primaryReading } : {})
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

export function getCardSummary(frontText: string) {
	return frontText
		.split('\n')
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.join(' ');
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
