import db from '$lib/server/db';
import { formatKanjiCard } from '$lib/server/cardFormatter';

export type BoardKanjiRecord = {
	literal: string;
	meanings: string[];
	on_readings: string[];
	kun_readings: string[];
	jlpt_level: number | null;
	grade: number | null;
	stroke_count: number | null;
};

export function buildBoardFlashcard(kanji: Pick<BoardKanjiRecord, 'literal' | 'meanings' | 'on_readings' | 'kun_readings'>) {
	return formatKanjiCard(kanji);
}

export async function fetchKanjiRecord(literal: string) {
	const { rows } = await db.query<BoardKanjiRecord>(
		`select literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
		 from kanji
		 where literal = $1`,
		[literal]
	);

	return rows[0] ?? null;
}

export async function fetchKanjiMap(literals: string[]) {
	const uniqueLiterals = Array.from(new Set(literals.filter((literal) => [...literal].length === 1)));
	if (uniqueLiterals.length === 0) {
		return new Map<string, BoardKanjiRecord>();
	}

	const { rows } = await db.query<BoardKanjiRecord>(
		`select literal, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count
		 from kanji
		 where literal = any($1::text[])`,
		[uniqueLiterals]
	);

	return new Map(rows.map((row) => [row.literal, row]));
}
