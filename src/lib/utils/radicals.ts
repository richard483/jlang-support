/**
 * Radical-glyph normalization.
 *
 * KRADFILE decomposes kanji into radicals, but a handful of those radicals are
 * abstract stroke-shape components (ノ ｜ ハ …) or CJK radical/component variants
 * (氵 亻 …) that have no kanji entry of their own. Linking straight to
 * `/kanji/<glyph>` for those produces a dead 404. This maps such glyphs to the
 * standalone kanji they correspond to so the radical link resolves to a real
 * detail page.
 *
 * Whether the mapped target actually exists is verified against the DB at the
 * call site — glyphs with no equivalent are rendered non-linked.
 */
const RADICAL_TO_KANJI: Record<string, string> = {
	// KRADFILE abstract stroke-shape components actually present in our data
	ノ: '丿', // diagonal stroke
	'｜': '丨', // vertical stroke
	ハ: '八', // the 八 shape
	// CJK radical / component variants → parent kanji (covers future KRADFILE2 imports)
	氵: '水',
	氺: '水',
	亻: '人',
	忄: '心',
	扌: '手',
	犭: '犬',
	礻: '示',
	衤: '衣',
	艹: '艸',
	辶: '辵',
	阝: '阜',
	飠: '食'
};

/** Map a radical glyph to the standalone kanji it represents, or return it unchanged. */
export function normalizeRadical(ch: string): string {
	return RADICAL_TO_KANJI[ch] ?? ch;
}
