/**
 * 1E.3 (ADR-014 D3) — packer + walidator banku pytań EGZAMINACYJNYCH (mastery
 * gate). CZYSTA logika, bez DB. Odpowiednik content-curriculum-atoms.ts, ale dla
 * pytań egzaminacyjnych kalibrowanych OSOBNO (blocker treści C1).
 *
 * ŹRÓDŁO PRAWDY (de-dup, reguła twarda 1): pytania egzaminu F1 czytamy WYŁĄCZNIE
 * z `docs/curation/sophia-1e3-egzamin-f1-v0.1.md`, sekcja §6. Kondensat E1–E15
 * w `sophia-1e2-f1-atomy.md` (sekcja „Egzamin modułu F1") NIE jest źródłem —
 * packer go NIE otwiera. Jedno źródło → jeden bank.
 *
 * FORMAT §6 (autorski Sophii): blok pytania `**E{n}.** {opis}`, dwa warianty
 * izomorficzne `- **A. {stem}** — {opcje}` / `- **B. …}`, gdzie opcje są
 * rozdzielone ` / `, a poprawna jest **pogrubiona**; linia konceptu `- → \`slug\`
 * → {atom}`; kondensat feedbacku `- **Feedback studenta (D3):** „…"`.
 *
 * Konsumowane przez:
 *   - src/lib/assessment/__tests__/… (kontrakt banku: 15×2, de-dup, samozgodność),
 *   - (docelowo) ingest egzaminu — pytania do question_items (DENY), refy do
 *     config_json.examSlots pozycji egzaminu (R4: bez nowej kolumny).
 */

import { gradeAnswer } from "../src/lib/assessment/grade";

/** Wariant pytania egzaminacyjnego (z kluczem) — kształt zgodny z ExamVariant. */
export type PackedExamVariant = {
	ref: string;
	variant: string;
	stem: string;
	options: string[];
	correct: number;
	feedbackMd: string;
};

/** Slot egzaminu (E1..E15) — koncept + warianty izomorficzne. */
export type PackedExamSlot = {
	slotRef: string;
	conceptSlug: string;
	variants: PackedExamVariant[];
};

/** Spakowany bank egzaminacyjny modułu (kształt zgodny z ExamBank). */
export type PackedExamBank = {
	moduleSlug: string;
	slots: PackedExamSlot[];
};

const KEBAB = /^[a-z0-9-]+$/;

/** Zwija zawijanie do spacji (markdown renderuje pojedynczy newline jako spację). */
function unwrap(text: string): string {
	return text.replace(/\s*\n\s*/g, " ").trim();
}

/** Wyciąga sekcję §6 (od „## 6." do następnego „## "). */
function extractBankSection(markdown: string, where: string): string {
	const m = markdown.match(/^## 6\.[^\n]*\n([\s\S]*?)(?=^## \d)/m);
	if (!m) throw new Error(`${where}: nie znalazłem sekcji §6 (bank pytań)`);
	return m[1];
}

/**
 * Tekst wyświetlany opcji: zdejmuje pogrubienie (znacznik poprawnej) i backticki
 * (dekoracja kodu). Cudzysłowy ZOSTAJĄ — `"3.5"` (str) to inna opcja niż `3.5`
 * (float); zdjęcie cudzysłowów scaliłoby je i fałszywie wykazało duplikat. Do
 * gradingu liczy się WYŁĄCZNIE indeks poprawnej — tekst służy prezentacji i
 * kontroli unikalności opcji.
 */
function optionText(optRaw: string): string {
	return optRaw.trim().replace(/^\*\*/, "").replace(/\*\*$/, "").replace(/`/g, "").trim();
}

/** Czy opcja jest pogrubiona (poprawna). */
function isBold(optRaw: string): boolean {
	return /^\*\*.*\*\*$/.test(optRaw.trim());
}

/** Parsuje jedną linię wariantu `- **A. {stem}** — {opcje}`. */
function parseVariantLine(
	line: string,
	slotRef: string,
	where: string,
): { variant: string; stem: string; options: string[]; correct: number } {
	const m = line.match(/^-\s+\*\*([AB])\.\s+([\s\S]+?)\*\*\s+—\s+(.+)$/);
	if (!m) {
		throw new Error(`${where} ${slotRef}: nieparsowalna linia wariantu: "${line.slice(0, 70)}"`);
	}
	const variant = m[1];
	const stem = unwrap(m[2]);
	const rawOptions = m[3].split(" / ").map((o) => o.trim());
	if (rawOptions.length !== 4) {
		throw new Error(`${where} ${slotRef}${variant}: ${rawOptions.length} opcji (oczekiwane 4)`);
	}
	const boldCount = rawOptions.filter(isBold).length;
	if (boldCount !== 1) {
		throw new Error(
			`${where} ${slotRef}${variant}: liczba poprawnych (pogrubionych) = ${boldCount}`,
		);
	}
	const correct = rawOptions.findIndex(isBold);
	const options = rawOptions.map(optionText);
	if (new Set(options).size !== options.length) {
		throw new Error(`${where} ${slotRef}${variant}: zduplikowane opcje`);
	}
	return { variant, stem, options, correct };
}

/**
 * packExamBankFromMarkdown — parsuje §6 pliku Sophii → bank egzaminacyjny.
 * Refy: slot "e{n}", wariant "{moduleSlug}-e{n}-{a|b}".
 */
export function packExamBankFromMarkdown(
	markdown: string,
	moduleSlug: string,
	where = "sophia-1e3",
): PackedExamBank {
	const section = extractBankSection(markdown, where);
	// Bloki pytań: dziel na `**E{n}.`.
	const blocks = section.split(/^\*\*E(?=\d+\.)/m).slice(1);
	const slots: PackedExamSlot[] = [];
	for (const block of blocks) {
		const numMatch = block.match(/^(\d+)\./);
		if (!numMatch) continue;
		const n = Number(numMatch[1]);
		const slotRef = `e${n}`;
		const lines = block.split("\n");

		const conceptLine = lines.find((l) => /^-\s+→\s+`/.test(l));
		const conceptMatch = conceptLine?.match(/→\s+`([a-z0-9-]+)`/);
		if (!conceptMatch) throw new Error(`${where} ${slotRef}: brak linii konceptu (- → \`slug\`)`);
		const conceptSlug = conceptMatch[1];

		const feedbackLine = lines.find((l) => /\*\*Feedback studenta/.test(l));
		const feedbackMatch = feedbackLine?.match(/\*\*Feedback studenta[^:]*:\*\*\s*(.+)$/);
		const feedbackMd = feedbackMatch
			? feedbackMatch[1]
					.replace(/^[„”"]/, "")
					.replace(/[„”"]\s*$/, "")
					.trim()
			: "";

		const variantLines = lines.filter((l) => /^-\s+\*\*[AB]\.\s/.test(l));
		if (variantLines.length !== 2) {
			throw new Error(`${where} ${slotRef}: ${variantLines.length} warianty (oczekiwane 2: A, B)`);
		}
		const variants: PackedExamVariant[] = variantLines.map((line) => {
			const parsed = parseVariantLine(line, slotRef, where);
			return {
				ref: `${moduleSlug}-${slotRef}-${parsed.variant.toLowerCase()}`,
				variant: parsed.variant,
				stem: parsed.stem,
				options: parsed.options,
				correct: parsed.correct,
				feedbackMd,
			};
		});
		slots.push({ slotRef, conceptSlug, variants });
	}
	return { moduleSlug, slots };
}

/**
 * validateExamBank — kontrakt banku egzaminacyjnego. Zwraca listę problemów
 * (pusta = OK). Egzekwuje: liczbę slotów, 2 warianty A/B per slot, 4 opcje,
 * dokładnie 1 poprawną, koncept kebab-case, GLOBALNĄ unikalność refów (de-dup),
 * samozgodność klucza przez gradeAnswer (wzorzec banku A5).
 */
export function validateExamBank(
	bank: PackedExamBank,
	expected: { slotCount: number; variantsPerSlot?: number; concepts?: readonly string[] },
): string[] {
	const problems: string[] = [];
	const variantsPerSlot = expected.variantsPerSlot ?? 2;
	if (bank.slots.length !== expected.slotCount) {
		problems.push(
			`bank ${bank.moduleSlug}: ${bank.slots.length} slotów (oczekiwane ${expected.slotCount})`,
		);
	}
	const slotRefs = new Set<string>();
	const variantRefs = new Set<string>();
	for (const slot of bank.slots) {
		const where = `${bank.moduleSlug} slot ${slot.slotRef}`;
		if (slotRefs.has(slot.slotRef)) problems.push(`${where}: zduplikowany slotRef`);
		slotRefs.add(slot.slotRef);
		if (!KEBAB.test(slot.conceptSlug)) problems.push(`${where}: koncept nie-kebab-case`);
		if (expected.concepts && !expected.concepts.includes(slot.conceptSlug)) {
			problems.push(`${where}: koncept "${slot.conceptSlug}" spoza konceptów modułu`);
		}
		if (slot.variants.length !== variantsPerSlot) {
			problems.push(`${where}: ${slot.variants.length} wariantów (oczekiwane ${variantsPerSlot})`);
		}
		const labels = new Set<string>();
		for (const v of slot.variants) {
			const vw = `${where}${v.variant}`;
			if (variantRefs.has(v.ref)) problems.push(`${vw}: zduplikowany ref wariantu "${v.ref}"`);
			variantRefs.add(v.ref);
			if (labels.has(v.variant)) problems.push(`${vw}: zduplikowana etykieta wariantu`);
			labels.add(v.variant);
			if (v.options.length !== 4) problems.push(`${vw}: ${v.options.length} opcji (oczekiwane 4)`);
			if (!Number.isInteger(v.correct) || v.correct < 0 || v.correct >= v.options.length) {
				problems.push(`${vw}: correct poza zakresem opcji`);
			} else if (!gradeAnswer("single_choice", { correct: v.correct }, { selected: v.correct })) {
				problems.push(`${vw}: klucz niesamozgodny (nie przechodzi przez gradeAnswer)`);
			}
			if (v.stem.trim().length < 5) problems.push(`${vw}: stem pusty/za krótki`);
		}
	}
	return problems;
}
