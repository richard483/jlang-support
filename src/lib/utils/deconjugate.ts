export interface DeconjugationCandidate {
	dictionaryForm: string;
	conjugationType: string;
	verbGroup: 'ichidan' | 'godan' | 'suru' | 'kuru' | 'adjective-i' | 'unknown';
}

export function deconjugate(word: string): DeconjugationCandidate[] {
	const candidates: DeconjugationCandidate[] = [];

	if (word.endsWith('て') && word.length > 1) {
		const stem = word.slice(0, -1);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'te-form', verbGroup: 'ichidan' });
	}
	if (word.endsWith('た') && word.length > 1) {
		const stem = word.slice(0, -1);
		candidates.push({ dictionaryForm: stem + 'る', conjugationType: 'past', verbGroup: 'ichidan' });
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
		['いた', 'く', 'past'],
		['いだ', 'ぐ', 'past'],
		['した', 'す', 'past'],
		['った', 'う', 'past'],
		['った', 'つ', 'past'],
		['った', 'る', 'past'],
		['んだ', 'ぬ', 'past'],
		['んだ', 'ぶ', 'past'],
		['んだ', 'む', 'past'],
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

	if (word.endsWith('して')) {
		const stem = word.slice(0, -2);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'te-form', verbGroup: 'suru' });
	}
	if (word.endsWith('した')) {
		const stem = word.slice(0, -2);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'past', verbGroup: 'suru' });
	}
	if (word.endsWith('しない')) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'negative', verbGroup: 'suru' });
	}
	if (word.endsWith('します')) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'polite', verbGroup: 'suru' });
	}
	if (word.endsWith('できる')) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'する', conjugationType: 'potential', verbGroup: 'suru' });
	}

	if (word === 'きて' || word === '来て') {
		candidates.push({ dictionaryForm: 'くる', conjugationType: 'te-form', verbGroup: 'kuru' });
		candidates.push({ dictionaryForm: '来る', conjugationType: 'te-form', verbGroup: 'kuru' });
	}
	if (word === 'きた' || word === '来た') {
		candidates.push({ dictionaryForm: 'くる', conjugationType: 'past', verbGroup: 'kuru' });
		candidates.push({ dictionaryForm: '来る', conjugationType: 'past', verbGroup: 'kuru' });
	}
	if (word === 'こない' || word === '来ない') {
		candidates.push({ dictionaryForm: 'くる', conjugationType: 'negative', verbGroup: 'kuru' });
		candidates.push({ dictionaryForm: '来る', conjugationType: 'negative', verbGroup: 'kuru' });
	}

	if (word.endsWith('くない') && word.length > 3) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'い', conjugationType: 'negative', verbGroup: 'adjective-i' });
	}
	if (word.endsWith('かった') && word.length > 3) {
		const stem = word.slice(0, -3);
		candidates.push({ dictionaryForm: stem + 'い', conjugationType: 'past', verbGroup: 'adjective-i' });
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
