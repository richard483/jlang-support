/**
 * Converts a hiragana/katakana string to Hepburn romaji.
 * Strips KanjiDic2 dot notation (e.g. "たの.しい" → "tanoshii").
 * Handles double consonants (っ/ッ) and long vowels (ー).
 */

// Compound kana must be checked before single kana
const DIGRAPHS: Record<string, string> = {
	// Hiragana digraphs
	きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
	しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
	ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
	にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
	ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
	みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
	りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
	ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
	じゃ: 'ja',  じゅ: 'ju',  じょ: 'jo',
	ぢゃ: 'ja',  ぢゅ: 'ju',  ぢょ: 'jo',
	びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
	ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
	// Katakana digraphs (ア行小文字 compounds)
	キャ: 'kya', キュ: 'kyu', キョ: 'kyo',
	シャ: 'sha', シュ: 'shu', ショ: 'sho',
	チャ: 'cha', チュ: 'chu', チョ: 'cho',
	ニャ: 'nya', ニュ: 'nyu', ニョ: 'nyo',
	ヒャ: 'hya', ヒュ: 'hyu', ヒョ: 'hyo',
	ミャ: 'mya', ミュ: 'myu', ミョ: 'myo',
	リャ: 'rya', リュ: 'ryu', リョ: 'ryo',
	ギャ: 'gya', ギュ: 'gyu', ギョ: 'gyo',
	ジャ: 'ja',  ジュ: 'ju',  ジョ: 'jo',
	ヂャ: 'ja',  ヂュ: 'ju',  ヂョ: 'jo',
	ビャ: 'bya', ビュ: 'byu', ビョ: 'byo',
	ピャ: 'pya', ピュ: 'pyu', ピョ: 'pyo',
	ファ: 'fa',  フィ: 'fi',  フェ: 'fe',  フォ: 'fo',
	ウィ: 'wi',  ウェ: 'we',  ウォ: 'wo',
	ティ: 'ti',  ディ: 'di',  トゥ: 'tu',  ドゥ: 'du',
};

const SINGLE: Record<string, string> = {
	// Hiragana
	あ: 'a',   い: 'i',   う: 'u',   え: 'e',   お: 'o',
	か: 'ka',  き: 'ki',  く: 'ku',  け: 'ke',  こ: 'ko',
	が: 'ga',  ぎ: 'gi',  ぐ: 'gu',  げ: 'ge',  ご: 'go',
	さ: 'sa',  し: 'shi', す: 'su',  せ: 'se',  そ: 'so',
	ざ: 'za',  じ: 'ji',  ず: 'zu',  ぜ: 'ze',  ぞ: 'zo',
	た: 'ta',  ち: 'chi', つ: 'tsu', て: 'te',  と: 'to',
	だ: 'da',  ぢ: 'ji',  づ: 'zu',  で: 'de',  ど: 'do',
	な: 'na',  に: 'ni',  ぬ: 'nu',  ね: 'ne',  の: 'no',
	は: 'ha',  ひ: 'hi',  ふ: 'fu',  へ: 'he',  ほ: 'ho',
	ば: 'ba',  び: 'bi',  ぶ: 'bu',  べ: 'be',  ぼ: 'bo',
	ぱ: 'pa',  ぴ: 'pi',  ぷ: 'pu',  ぺ: 'pe',  ぽ: 'po',
	ま: 'ma',  み: 'mi',  む: 'mu',  め: 'me',  も: 'mo',
	や: 'ya',  ゆ: 'yu',  よ: 'yo',
	ら: 'ra',  り: 'ri',  る: 'ru',  れ: 're',  ろ: 'ro',
	わ: 'wa',  ゐ: 'i',   ゑ: 'e',   を: 'o',
	ん: 'n',
	// Katakana (same readings, different script)
	ア: 'a',   イ: 'i',   ウ: 'u',   エ: 'e',   オ: 'o',
	カ: 'ka',  キ: 'ki',  ク: 'ku',  ケ: 'ke',  コ: 'ko',
	ガ: 'ga',  ギ: 'gi',  グ: 'gu',  ゲ: 'ge',  ゴ: 'go',
	サ: 'sa',  シ: 'shi', ス: 'su',  セ: 'se',  ソ: 'so',
	ザ: 'za',  ジ: 'ji',  ズ: 'zu',  ゼ: 'ze',  ゾ: 'zo',
	タ: 'ta',  チ: 'chi', ツ: 'tsu', テ: 'te',  ト: 'to',
	ダ: 'da',  ヂ: 'ji',  ヅ: 'zu',  デ: 'de',  ド: 'do',
	ナ: 'na',  ニ: 'ni',  ヌ: 'nu',  ネ: 'ne',  ノ: 'no',
	ハ: 'ha',  ヒ: 'hi',  フ: 'fu',  ヘ: 'he',  ホ: 'ho',
	バ: 'ba',  ビ: 'bi',  ブ: 'bu',  ベ: 'be',  ボ: 'bo',
	パ: 'pa',  ピ: 'pi',  プ: 'pu',  ペ: 'pe',  ポ: 'po',
	マ: 'ma',  ミ: 'mi',  ム: 'mu',  メ: 'me',  モ: 'mo',
	ヤ: 'ya',  ユ: 'yu',  ヨ: 'yo',
	ラ: 'ra',  リ: 'ri',  ル: 'ru',  レ: 're',  ロ: 'ro',
	ワ: 'wa',  ヲ: 'o',
	ン: 'n',
};

const DOUBLE_CONSONANT = { っ: true, ッ: true } as Record<string, boolean>;
const LONG_VOWEL = 'ー';

/** Convert kana string to Hepburn romaji. */
export function kanaToRomaji(input: string): string {
	// Strip KanjiDic2 okurigana dot notation
	const text = input.replace(/\./g, '');
	let result = '';
	let i = 0;

	while (i < text.length) {
		const ch = text[i];

		// Long vowel mark — repeat previous vowel
		if (ch === LONG_VOWEL) {
			const lastVowel = result.match(/[aeiou]$/)?.[0] ?? '';
			result += lastVowel;
			i++;
			continue;
		}

		// Double-consonant (っ/ッ) — double first consonant of next mora
		if (DOUBLE_CONSONANT[ch]) {
			const next2 = DIGRAPHS[text.slice(i + 1, i + 3)];
			const next1 = SINGLE[text[i + 1]];
			const mora = next2 ?? next1 ?? '';
			result += mora ? mora[0] : '';
			i++;
			continue;
		}

		// Try 2-char digraph first
		const digraph = DIGRAPHS[text.slice(i, i + 2)];
		if (digraph) {
			result += digraph;
			i += 2;
			continue;
		}

		// Single kana
		const single = SINGLE[ch];
		if (single) {
			result += single;
			i++;
			continue;
		}

		// Pass through anything not recognised (kanji, punctuation, spaces)
		result += ch;
		i++;
	}

	return result;
}

/**
 * Convert katakana to hiragana (U+30A1–U+30F6 → U+3041–U+3096).
 * Non-katakana characters are passed through unchanged.
 */
export function katakanaToHiragana(input: string): string {
	return input.replace(/[\u30A1-\u30F6]/g, (ch) =>
		String.fromCharCode(ch.charCodeAt(0) - 0x60)
	);
}

/**
 * Format a KanjiDic2 reading for display: strips the dot, returns kana + romaji.
 * e.g. "たの.しい" → { kana: "たのしい", romaji: "tanoshii" }
 */
export function formatReading(raw: string): { kana: string; romaji: string } {
	const kana = raw.replace(/\./g, '');
	return { kana, romaji: kanaToRomaji(kana) };
}
