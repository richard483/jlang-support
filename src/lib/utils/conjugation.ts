/**
 * Japanese verb conjugation engine.
 * Handles ichidan (Group 2 / る-verbs), godan (Group 1 / う-verbs), and irregular verbs (する, くる).
 */

export type VerbGroup = 'ichidan' | 'godan' | 'suru' | 'kuru';

export interface ConjugationResult {
	dictionaryForm: string;
	group: VerbGroup;
	stemMasu: string; // masu stem (連用形)
	forms: {
		masu: string;       // ます form (polite non-past)
		masuNeg: string;    // ません
		masuPast: string;   // ました
		masuPastNeg: string;// ませんでした
		te: string;         // て form
		ta: string;         // た form (plain past)
		nai: string;        // ない form (plain negative)
		nakatta: string;    // なかった (plain past negative)
		ba: string;         // ば conditional
		potential: string;  // potential form
		volitional: string; // volitional (let's / I will)
		imperative: string; // imperative
		passive: string;    // passive
		causative: string;  // causative
	};
}

// Maps final kana of godan verb stem to its masu-stem equivalent
const GODAN_MASU_STEM: Record<string, string> = {
	う: 'い',
	く: 'き',
	ぐ: 'ぎ',
	す: 'し',
	つ: 'ち',
	ぬ: 'に',
	ぶ: 'び',
	む: 'み',
	る: 'り'
};

// Maps final kana for て/た forms (each godan ending has its own sound change)
const GODAN_TE: Record<string, string> = {
	う: 'って',
	く: 'いて',
	ぐ: 'いで',
	す: 'して',
	つ: 'って',
	ぬ: 'んで',
	ぶ: 'んで',
	む: 'んで',
	る: 'って'
};

const GODAN_TA: Record<string, string> = {
	う: 'った',
	く: 'いた',
	ぐ: 'いだ',
	す: 'した',
	つ: 'った',
	ぬ: 'んだ',
	ぶ: 'んだ',
	む: 'んだ',
	る: 'った'
};

// Exception: 行く → 行って (not 行いて)
const GODAN_TE_EXCEPTIONS: Record<string, string> = {
	行く: '行って',
	いく: 'いって'
};

const GODAN_TA_EXCEPTIONS: Record<string, string> = {
	行く: '行った',
	いく: 'いった'
};

function getGodanFinalKana(verb: string): string {
	return verb.slice(-1);
}

function getGodanStem(verb: string): string {
	return verb.slice(0, -1);
}

export function conjugate(verb: string, group: VerbGroup): ConjugationResult {
	if (group === 'suru' || verb === 'する' || verb.endsWith('する')) {
		return conjugateSuru(verb);
	}
	if (group === 'kuru' || verb === 'くる' || verb === '来る') {
		return conjugateKuru(verb);
	}
	if (group === 'ichidan') {
		return conjugateIchidan(verb);
	}
	return conjugateGodan(verb);
}

function conjugateIchidan(verb: string): ConjugationResult {
	// Drop final る to get stem
	const stem = verb.slice(0, -1);

	return {
		dictionaryForm: verb,
		group: 'ichidan',
		stemMasu: stem,
		forms: {
			masu: `${stem}ます`,
			masuNeg: `${stem}ません`,
			masuPast: `${stem}ました`,
			masuPastNeg: `${stem}ませんでした`,
			te: `${stem}て`,
			ta: `${stem}た`,
			nai: `${stem}ない`,
			nakatta: `${stem}なかった`,
			ba: `${stem}れば`,
			potential: `${stem}られる`,
			volitional: `${stem}よう`,
			imperative: `${stem}ろ`,
			passive: `${stem}られる`,
			causative: `${stem}させる`
		}
	};
}

function conjugateGodan(verb: string): ConjugationResult {
	const finalKana = getGodanFinalKana(verb);
	const stem = getGodanStem(verb);
	const masuStemKana = GODAN_MASU_STEM[finalKana] ?? finalKana;
	const masuStem = stem + masuStemKana;

	const te = GODAN_TE_EXCEPTIONS[verb] ?? stem + (GODAN_TE[finalKana] ?? finalKana + 'て');
	const ta = GODAN_TA_EXCEPTIONS[verb] ?? stem + (GODAN_TA[finalKana] ?? finalKana + 'た');

	// a-row for negative: う→わ, others drop final kana and add a-row equivalent
	const A_ROW: Record<string, string> = {
		う: 'わ',
		く: 'か',
		ぐ: 'が',
		す: 'さ',
		つ: 'た',
		ぬ: 'な',
		ぶ: 'ば',
		む: 'ま',
		る: 'ら'
	};
	const E_ROW: Record<string, string> = {
		う: 'え',
		く: 'け',
		ぐ: 'げ',
		す: 'せ',
		つ: 'て',
		ぬ: 'ね',
		ぶ: 'べ',
		む: 'め',
		る: 'れ'
	};

	const aRow = stem + (A_ROW[finalKana] ?? finalKana);
	const eRow = stem + (E_ROW[finalKana] ?? finalKana);

	return {
		dictionaryForm: verb,
		group: 'godan',
		stemMasu: masuStem,
		forms: {
			masu: `${masuStem}ます`,
			masuNeg: `${masuStem}ません`,
			masuPast: `${masuStem}ました`,
			masuPastNeg: `${masuStem}ませんでした`,
			te,
			ta,
			nai: `${aRow}ない`,
			nakatta: `${aRow}なかった`,
			ba: `${eRow}ば`,
			potential: `${eRow}る`,
			volitional: `${masuStem}ましょう`,
			imperative: eRow,
			passive: `${aRow}れる`,
			causative: `${aRow}せる`
		}
	};
}

function conjugateSuru(verb: string): ConjugationResult {
	// Prefix for compound する verbs like 勉強する
	const prefix = verb.endsWith('する') ? verb.slice(0, -2) : '';
	const p = prefix;

	return {
		dictionaryForm: verb,
		group: 'suru',
		stemMasu: `${p}し`,
		forms: {
			masu: `${p}します`,
			masuNeg: `${p}しません`,
			masuPast: `${p}しました`,
			masuPastNeg: `${p}しませんでした`,
			te: `${p}して`,
			ta: `${p}した`,
			nai: `${p}しない`,
			nakatta: `${p}しなかった`,
			ba: `${p}すれば`,
			potential: `${p}できる`,
			volitional: `${p}しよう`,
			imperative: `${p}しろ`,
			passive: `${p}される`,
			causative: `${p}させる`
		}
	};
}

function conjugateKuru(verb: string): ConjugationResult {
	const isKanji = verb === '来る';
	const k = isKanji ? '来' : 'く';
	const ko = isKanji ? '来' : 'こ';
	const ki = isKanji ? '来' : 'き';

	return {
		dictionaryForm: verb,
		group: 'kuru',
		stemMasu: `${ki}`,
		forms: {
			masu: `${ki}ます`,
			masuNeg: `${ki}ません`,
			masuPast: `${ki}ました`,
			masuPastNeg: `${ki}ませんでした`,
			te: `${ki}て`,
			ta: `${ki}た`,
			nai: `${ko}ない`,
			nakatta: `${ko}なかった`,
			ba: `${k}れば`,
			potential: `${ko}られる`,
			volitional: `${ko}よう`,
			imperative: `${ko}い`,
			passive: `${ko}られる`,
			causative: `${ko}させる`
		}
	};
}

export const FORM_LABELS: Record<keyof ConjugationResult['forms'], string> = {
	masu: 'Polite (non-past)',
	masuNeg: 'Polite negative',
	masuPast: 'Polite past',
	masuPastNeg: 'Polite past negative',
	te: 'Te-form',
	ta: 'Plain past',
	nai: 'Plain negative',
	nakatta: 'Plain past negative',
	ba: 'Conditional (ば)',
	potential: 'Potential',
	volitional: 'Volitional (let\'s)',
	imperative: 'Imperative',
	passive: 'Passive',
	causative: 'Causative'
};
