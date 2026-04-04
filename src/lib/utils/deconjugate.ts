export interface DeconjugationCandidate {
	dictionaryForm: string;
	conjugationType: string;
	verbGroup: 'ichidan' | 'godan' | 'suru' | 'kuru' | 'adjective-i' | 'unknown';
}

const EXCEPTIONS: Record<string, DeconjugationCandidate[]> = {
	'行って': [{ dictionaryForm: '行く', conjugationType: 'te-form', verbGroup: 'godan' }],
	'いって': [
		{ dictionaryForm: 'いく', conjugationType: 'te-form', verbGroup: 'godan' },
		{ dictionaryForm: '言う', conjugationType: 'te-form', verbGroup: 'godan' }
	],
	'行った': [{ dictionaryForm: '行く', conjugationType: 'ta-form', verbGroup: 'godan' }],
	'いった': [
		{ dictionaryForm: 'いく', conjugationType: 'ta-form', verbGroup: 'godan' },
		{ dictionaryForm: '言う', conjugationType: 'ta-form', verbGroup: 'godan' }
	],
	'言わない': [{ dictionaryForm: '言う', conjugationType: 'negative', verbGroup: 'godan' }],
	'言いました': [{ dictionaryForm: '言う', conjugationType: 'polite-past', verbGroup: 'godan' }],
	'行かない': [{ dictionaryForm: '行く', conjugationType: 'negative', verbGroup: 'godan' }],
	'行きません': [{ dictionaryForm: '行く', conjugationType: 'polite-negative', verbGroup: 'godan' }],
	'来ました': [
		{ dictionaryForm: 'くる', conjugationType: 'polite-past', verbGroup: 'kuru' },
		{ dictionaryForm: '来る', conjugationType: 'polite-past', verbGroup: 'kuru' }
	],
	'来ません': [
		{ dictionaryForm: 'くる', conjugationType: 'polite-negative', verbGroup: 'kuru' },
		{ dictionaryForm: '来る', conjugationType: 'polite-negative', verbGroup: 'kuru' }
	]
};

export function deconjugate(word: string): DeconjugationCandidate[] {
	const candidates: DeconjugationCandidate[] = [];

	if (EXCEPTIONS[word]) {
		candidates.push(...EXCEPTIONS[word]);
	}

	if (word.endsWith('て') && word.length > 1) {
		const stem = word.slice(0, -1);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'te-form', verbGroup: 'ichidan' });
	}
	if (word.endsWith('た') && word.length > 1) {
		const stem = word.slice(0, -1);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'ta-form', verbGroup: 'ichidan' });
	}
	if (word.endsWith('ない') && word.length > 2) {
		const stem = word.slice(0, -2);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'negative', verbGroup: 'ichidan' });
	}
	if (word.endsWith('ます') && word.length > 2) {
		const stem = word.slice(0, -2);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'polite', verbGroup: 'ichidan' });
	}
	if (word.endsWith('ません') && word.length > 3) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'polite-negative', verbGroup: 'ichidan' });
	}
	if (word.endsWith('ました') && word.length > 3) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'polite-past', verbGroup: 'ichidan' });
	}
	if (word.endsWith('られる') && word.length > 3) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'potential', verbGroup: 'ichidan' });
	}
	if (word.endsWith('させる') && word.length > 3) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'causative', verbGroup: 'ichidan' });
	}
	if (word.endsWith('よう') && word.length > 2) {
		const stem = word.slice(0, -2);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'volitional', verbGroup: 'ichidan' });
	}
	if (word.endsWith('なかった') && word.length > 4) {
		candidates.push({ dictionaryForm: word.slice(0, -4) + 'る', conjugationType: 'past-negative', verbGroup: 'ichidan' });
	}

	const godanTeRules: [string, string, string][] = [
		['いて', 'く', 'te-form'],
		['いで', 'ぐ', 'te-form'],
		['して', 'す', 'te-form'],
		['って', 'う', 'te-form'],
		['って', 'つ', 'te-form'],
		['って', 'る', 'te-form'],
		['んで', 'ぬ', 'te-form'],
		['んで', 'ぶ', 'te-form'],
		['んで', 'む', 'te-form'],
	];
	for (const [suffix, ending, type] of godanTeRules) {
		if (word.endsWith(suffix)) {
			const stem = word.slice(0, -suffix.length);
			candidates.push({ dictionaryForm: stem + ending, conjugationType: type, verbGroup: 'godan' });
		}
	}

	const godanTaRules: [string, string, string][] = [
		['いた', 'く', 'ta-form'],
		['いだ', 'ぐ', 'ta-form'],
		['した', 'す', 'ta-form'],
		['った', 'う', 'ta-form'],
		['った', 'つ', 'ta-form'],
		['った', 'る', 'ta-form'],
		['んだ', 'ぬ', 'ta-form'],
		['んだ', 'ぶ', 'ta-form'],
		['んだ', 'む', 'ta-form'],
	];
	for (const [suffix, ending, type] of godanTaRules) {
		if (word.endsWith(suffix)) {
			const stem = word.slice(0, -suffix.length);
			candidates.push({ dictionaryForm: stem + ending, conjugationType: type, verbGroup: 'godan' });
		}
	}

	if (word.endsWith('ない') && word.length > 2) {
		const preNai = word.slice(0, -2);
		const lastChar = preNai.slice(-1);
		const A_TO_DICT: Record<string, string> = {
			'か': 'く', 'が': 'ぐ', 'さ': 'す', 'た': 'つ',
			'な': 'ぬ', 'ば': 'ぶ', 'ま': 'む', 'ら': 'る', 'わ': 'う'
		};
		if (A_TO_DICT[lastChar]) {
			const stem = preNai.slice(0, -1);
			candidates.push({
				dictionaryForm: stem + A_TO_DICT[lastChar],
				conjugationType: 'negative',
				verbGroup: 'godan'
			});
		}
	}

	if (word.endsWith('ます') && word.length > 2) {
		const preMasu = word.slice(0, -2);
		const lastChar = preMasu.slice(-1);
		const I_TO_DICT: Record<string, string> = {
			'き': 'く', 'ぎ': 'ぐ', 'し': 'す', 'ち': 'つ',
			'に': 'ぬ', 'び': 'ぶ', 'み': 'む', 'り': 'る', 'い': 'う'
		};
		if (I_TO_DICT[lastChar]) {
			const stem = preMasu.slice(0, -1);
			candidates.push({
				dictionaryForm: stem + I_TO_DICT[lastChar],
				conjugationType: 'polite',
				verbGroup: 'godan'
			});
		}
	}

	if (word.endsWith('ました') && word.length > 3) {
		const beforeMashita = word.slice(0, -3);
		const lastChar = beforeMashita.slice(-1);
		const I_TO_DICT: Record<string, string> = {
			'き': 'く', 'ぎ': 'ぐ', 'し': 'す', 'ち': 'つ',
			'に': 'ぬ', 'び': 'ぶ', 'み': 'む', 'り': 'る', 'い': 'う'
		};
		if (I_TO_DICT[lastChar]) {
			const stem = beforeMashita.slice(0, -1);
			candidates.push({
				dictionaryForm: stem + I_TO_DICT[lastChar],
				conjugationType: 'polite-past',
				verbGroup: 'godan'
			});
		}
	}

	if (word.endsWith('ません') && word.length > 3) {
		const beforeMasen = word.slice(0, -3);
		const lastChar = beforeMasen.slice(-1);
		const I_TO_DICT: Record<string, string> = {
			'き': 'く', 'ぎ': 'ぐ', 'し': 'す', 'ち': 'つ',
			'に': 'ぬ', 'び': 'ぶ', 'み': 'む', 'り': 'る', 'い': 'う'
		};
		if (I_TO_DICT[lastChar]) {
			const stem = beforeMasen.slice(0, -1);
			candidates.push({
				dictionaryForm: stem + I_TO_DICT[lastChar],
				conjugationType: 'polite-negative',
				verbGroup: 'godan'
			});
		}
	}

	if (word.endsWith('なかった') && word.length > 4) {
		const beforeNakatta = word.slice(0, -4);
		const lastChar = beforeNakatta.slice(-1);
		const A_TO_DICT: Record<string, string> = {
			'か': 'く', 'が': 'ぐ', 'さ': 'す', 'た': 'つ',
			'な': 'ぬ', 'ば': 'ぶ', 'ま': 'む', 'ら': 'る', 'わ': 'う'
		};
		if (A_TO_DICT[lastChar]) {
			const stem = beforeNakatta.slice(0, -1);
			candidates.push({
				dictionaryForm: stem + A_TO_DICT[lastChar],
				conjugationType: 'past-negative',
				verbGroup: 'godan'
			});
		}
	}

	if (word.endsWith('して')) {
		const stem = word.slice(0, -2);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'te-form', verbGroup: 'suru' });
	}
	if (word.endsWith('した')) {
		const stem = word.slice(0, -2);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'ta-form', verbGroup: 'suru' });
	}
	if (word.endsWith('しない')) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'negative', verbGroup: 'suru' });
	}
	if (word.endsWith('します')) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'polite', verbGroup: 'suru' });
	}
	if (word.endsWith('しました')) {
		const stem = word.slice(0, -4);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'polite-past', verbGroup: 'suru' });
	}
	if (word.endsWith('できる')) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'potential', verbGroup: 'suru' });
	}

	const kuruMappings: [string, string, string][] = [
		['きて', 'くる', 'te-form'], ['来て', '来る', 'te-form'],
		['きた', 'くる', 'ta-form'], ['来た', '来る', 'ta-form'],
		['こない', 'くる', 'negative'], ['来ない', '来る', 'negative'],
		['きます', 'くる', 'polite'], ['来ます', '来る', 'polite'],
		['こられる', 'くる', 'potential'], ['来られる', '来る', 'potential'],
		['こよう', 'くる', 'volitional'], ['来よう', '来る', 'volitional'],
		['こない', 'くる', 'negative'], ['来ない', '来る', 'negative'],
	];
	for (const [conj, dict, form] of kuruMappings) {
		if (word === conj) {
			candidates.push({ dictionaryForm: dict, conjugationType: form, verbGroup: 'kuru' });
			if (dict === 'くる' && conj.includes('来')) {
				candidates.push({ dictionaryForm: '来る', conjugationType: form, verbGroup: 'kuru' });
			} else if (dict === '言う' || (dict === 'いく' && conj === 'いって')) {
				candidates.push({ dictionaryForm: '言う', conjugationType: form, verbGroup: 'godan' });
			}
		}
	}

	if (word.endsWith('くない') && word.length > 3) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'い', conjugationType: 'negative', verbGroup: 'adjective-i' });
	}
	if (word.endsWith('かった') && word.length > 3) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'い', conjugationType: 'ta-form', verbGroup: 'adjective-i' });
	}
	if (word.endsWith('くなかった') && word.length > 5) {
		const stem = word.slice(0, -5);
		candidates.push({ dictionaryForm: stem + 'い', conjugationType: 'past-negative', verbGroup: 'adjective-i' });
	}
	if (word.endsWith('くて') && word.length > 2) {
		const stem = word.slice(0, -2);
		candidates.push({ dictionaryForm: stem + 'い', conjugationType: 'te-form', verbGroup: 'adjective-i' });
	}

	const seen = new Set<string>();
	return candidates.filter(c => {
		if (seen.has(c.dictionaryForm)) return false;
		seen.add(c.dictionaryForm);
		return true;
	});
}
