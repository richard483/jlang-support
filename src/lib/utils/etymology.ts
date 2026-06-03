/**
 * Render-time formatting for Kanji Networks etymology text and KanjiAlive
 * mnemonic hints.
 *
 * The source etymology uses two markers: `*glosses*` (emphasis) and a trailing
 * `#` on cross-referenced characters/words (e.g. "亥#" = "see that entry"). We
 * render `*x*` as bold and drop the `#`, returning plain text tokens so the
 * caller can emit `<strong>` without `{@html}` (XSS-safe). The stored text is
 * left untouched.
 *
 * KanjiAlive mnemonics (`mn_hint`) may contain small `<span class='note'>…</span>`
 * markup; `formatMnHint` strips tags first, then applies the same tokenizer.
 */

export interface EtymToken {
	text: string;
	bold: boolean;
}

/** Tokenize etymology text: `*x*` → bold runs, `#` markers removed. */
export function formatEtymology(input: string | null | undefined): EtymToken[] {
	if (!input) return [];
	const cleaned = input.replace(/#/g, ''); // drop cross-ref markers
	const tokens: EtymToken[] = [];
	const re = /\*([^*]+)\*/g;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(cleaned)) !== null) {
		if (m.index > last) tokens.push({ text: cleaned.slice(last, m.index), bold: false });
		tokens.push({ text: m[1], bold: true });
		last = m.index + m[0].length;
	}
	if (last < cleaned.length) tokens.push({ text: cleaned.slice(last), bold: false });
	return tokens;
}

/** Strip HTML tags from a KanjiAlive mn_hint, then tokenize like etymology. */
export function formatMnHint(input: string | null | undefined): EtymToken[] {
	if (!input) return [];
	return formatEtymology(input.replace(/<[^>]*>/g, ''));
}
