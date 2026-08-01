// ============================================================================
// 1E.3 (ADR-014 D3) — kontrakt packera banku egzaminacyjnego (mastery gate).
// Test JEDNOSTKOWY (bez DB): parsuje COMMITOWANY fixture i sprawdza strukturę.
//
// ODSPRZĘGNIĘCIE OD FIXTURE (Opcja A, sign-off Olivera 2026-07-24):
//   Unit-kontrakt packera stoi na fixture `fixtures/exam-bank-sample.md` — pliku
//   commitowanym, syntetycznym, wiernym formatowi §6. Kontrakt (allowlista/
//   nie-wyciek, determinizm, samozgodność dystraktorów, granica §6, de-dup)
//   egzekwujemy na fixture, żeby nie zależał od cyklu życia treści; zachowana
//   pełna intencja adwersaryjna Quinn, guardy NIE osłabione.
//
// SPROSTOWANIE 2026-08-01 (Sophia): poprzednia wersja tego nagłówka twierdziła,
//   że realny bank Sophii (`docs/curation/sophia-1e3-egzamin-f1-v0.1.md`) jest
//   „NIECOMMITOWANYM DRAFTem", i na tym założeniu oparto `skip-if-absent` niżej.
//   To była nieprawda: plik wszedł do repo tego samego dnia (63bee3b, PR #232,
//   2026-07-24), godziny po napisaniu tego testu (0461dcd, PR #227). Skutek:
//   `existsSync` był PRAWDĄ, więc walidacja realnego banku od 2026-07-24 biegła
//   w CI — nikt tego nie wiedział, bo komentarz mówił coś przeciwnego. Bramka
//   działająca „przypadkiem" jest tak samo zła jak pominięta: nikt jej nie pilnuje.
//
// STAN OD 2026-08-01: bank egzaminu F1 to TREŚĆ PRYWATNA (repo publiczne — klucze
//   nie). Publikacja OBU wariantów izomorficznych unieważniała obronę „po oblaniu
//   dostajesz wariant B", więc plik przeniesiony do Danolog/nordsignal-skillbridge-content.
//   Walidacja realnego banku niżej NIE jest już „skip-if-absent": w naszym CI treść
//   jest zaciągana i brak pliku = TWARDY BŁĄD, a PR z forka (bez sekretu) daje
//   JAWNE pominięcie z `::warning::`. Nigdy cichy zielony.
// ============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gradeAnswer } from "../../../src/lib/assessment/grade";
import { packExamBankFromMarkdown, validateExamBank } from "../../../tools/content-curriculum-exam";
// Realny bank F1 niesie klucze OBU wariantów izomorficznych → prywatne repo treści.
// Fixture syntetyczny (niżej) zostaje publiczny — to format, nie klucz.
import { czytajTrescTekst, describeTresc } from "../../support/tresc-prywatna";

// Koncepty fixture (allowlista modułu) — 2 koncepty × 3 sloty (równomierne, ADR D1).
const FIXTURE_CONCEPTS = ["dodawanie", "mnozenie"] as const;
const SLOT_COUNT = 6;

const FIXTURE = join(process.cwd(), "tests/unit/exam/fixtures/exam-bank-sample.md");
const markdown = readFileSync(FIXTURE, "utf8");
const bank = packExamBankFromMarkdown(markdown, "fx-module-1");

describe("packer banku egzaminacyjnego (fixture) — 6 slotów × 2 warianty", () => {
	it("parsuje dokładnie 6 slotów (E1..E6)", () => {
		expect(bank.slots).toHaveLength(SLOT_COUNT);
		expect(bank.slots.map((s) => s.slotRef)).toEqual(
			Array.from({ length: SLOT_COUNT }, (_, i) => `e${i + 1}`),
		);
	});

	it("każdy slot ma 2 warianty izomorficzne A/B, każdy z 4 opcjami i 1 poprawną", () => {
		for (const slot of bank.slots) {
			expect(slot.variants.map((v) => v.variant).sort()).toEqual(["A", "B"]);
			for (const v of slot.variants) {
				expect(v.options).toHaveLength(4);
				expect(v.correct).toBeGreaterThanOrEqual(0);
				expect(v.correct).toBeLessThan(4);
			}
		}
	});

	it("kontrakt validateExamBank czysty (6×2, koncepty ⊆ modułu, samozgodność, de-dup)", () => {
		expect(validateExamBank(bank, { slotCount: SLOT_COUNT, concepts: FIXTURE_CONCEPTS })).toEqual(
			[],
		);
	});

	it("allowlista konceptów — walidator ŁAPIE koncept spoza modułu (nie-wyciek)", () => {
		// Gdyby slot niósł koncept spoza allowlisty modułu, kontrakt MUSI go zgłosić.
		const leaked = {
			...bank,
			slots: [{ ...bank.slots[0], conceptSlug: "koncept-spoza-modulu" }, ...bank.slots.slice(1)],
		};
		const problems = validateExamBank(leaked, {
			slotCount: SLOT_COUNT,
			concepts: FIXTURE_CONCEPTS,
		});
		expect(problems.some((p) => /spoza konceptów modułu/.test(p))).toBe(true);
	});

	it("pokrycie konceptów: 2 koncepty × 3 sloty (równomierne, ADR D1)", () => {
		const perConcept = new Map<string, number>();
		for (const slot of bank.slots) {
			perConcept.set(slot.conceptSlug, (perConcept.get(slot.conceptSlug) ?? 0) + 1);
		}
		for (const c of FIXTURE_CONCEPTS) expect(perConcept.get(c)).toBe(3);
	});
});

describe("de-dup — jedno źródło prawdy (reguła twarda 1)", () => {
	it("slotRef globalnie unikalne (E1..E6 raz każdy)", () => {
		const refs = bank.slots.map((s) => s.slotRef);
		expect(new Set(refs).size).toBe(refs.length);
	});

	it("ref wariantu globalnie unikalny (12 wariantów, zero kolizji)", () => {
		const refs = bank.slots.flatMap((s) => s.variants.map((v) => v.ref));
		expect(refs).toHaveLength(SLOT_COUNT * 2);
		expect(new Set(refs).size).toBe(SLOT_COUNT * 2);
	});

	it("walidator ŁAPIE zduplikowany slot (regresja de-dup, gdyby kondensat wciekł)", () => {
		const doubled = { ...bank, slots: [...bank.slots, bank.slots[0]] };
		const problems = validateExamBank(doubled, {
			slotCount: SLOT_COUNT,
			concepts: FIXTURE_CONCEPTS,
		});
		expect(problems.some((p) => /zduplikowany/.test(p))).toBe(true);
	});
});

describe("bezpieczeństwo klucza — packer trzyma correct, test pilnuje samozgodności", () => {
	it("każdy wariant ma poprawny indeks przechodzący przez gradeAnswer", () => {
		// validateExamBank egzekwuje samozgodność; tu jawnie potwierdzamy brak problemu.
		const problems = validateExamBank(bank, { slotCount: SLOT_COUNT });
		expect(problems.filter((p) => /niesamozgodny/.test(p))).toEqual([]);
	});
});

// ============================================================================
// P4 ADWERSARYJNIE — determinizm packera + samozgodność klucza w OBIE strony.
// ============================================================================
describe("P4 determinizm packera (jak notebooki — 1:1 odtwarzalność)", () => {
	it("pack tego samego źródła dwukrotnie → wynik identyczny (deep equal)", () => {
		// Determinizm packera to warunek de-dup i audytowalności (Built-to-Sell):
		// re-ingest tego samego markdownu nie może dać innego banku (inne refy →
		// rozjazd plan_json ↔ config_json.examSlots). Łapie niedeterminizm
		// wprowadzony np. przez Set/Map z niestabilną kolejnością albo Date/random.
		const again = packExamBankFromMarkdown(markdown, "fx-module-1");
		expect(again).toEqual(bank);
	});

	it("inny moduleSlug zmienia WYŁĄCZNIE prefiks refów, nie strukturę/klucze", () => {
		const other = packExamBankFromMarkdown(markdown, "inny-slug");
		expect(other.slots.map((s) => s.slotRef)).toEqual(bank.slots.map((s) => s.slotRef));
		for (let i = 0; i < bank.slots.length; i++) {
			for (let j = 0; j < bank.slots[i].variants.length; j++) {
				const a = bank.slots[i].variants[j];
				const b = other.slots[i].variants[j];
				expect(b.ref.startsWith("inny-slug-")).toBe(true);
				// Klucz i treść niezależne od slug — tylko ref się różni.
				expect(b.correct).toBe(a.correct);
				expect(b.stem).toBe(a.stem);
				expect(b.options).toEqual(a.options);
			}
		}
	});
});

describe("P4 samozgodność klucza — poprawny ZALICZA, każdy dystraktor NIE", () => {
	it("gradeAnswer: wskazany correct → true; KAŻDY inny indeks → false", () => {
		for (const slot of bank.slots) {
			for (const v of slot.variants) {
				const where = `${slot.slotRef}${v.variant}`;
				// Klucz samozgodny w stronę „poprawną".
				expect(
					gradeAnswer("single_choice", { correct: v.correct }, { selected: v.correct }),
					`${where}: poprawny indeks powinien zaliczać`,
				).toBe(true);
				// I w stronę „błędną": żaden dystraktor nie może przejść (inaczej dwie
				// „poprawne” = student zdaje na złej odpowiedzi).
				for (let idx = 0; idx < v.options.length; idx++) {
					if (idx === v.correct) continue;
					expect(
						gradeAnswer("single_choice", { correct: v.correct }, { selected: idx }),
						`${where}: dystraktor ${idx} NIE może zaliczać`,
					).toBe(false);
				}
			}
		}
	});
});

// ============================================================================
// P4 ADWERSARYJNIE — granica źródła §6. Packer czyta WYŁĄCZNIE sekcję §6; blok
// pytania umieszczony w §7 NIE może trafić do banku. Łapie regresję de-dup
// „jedno źródło prawdy”. Fixture NIESIE własny blok E99 w §7 (dowód na realnych
// danych fixture) + niezależny syntetyczny guard inline (izolacja od źródła).
// ============================================================================
describe("P4 granica §6 — pytania spoza sekcji §6 NIE wchodzą do banku", () => {
	it("blok E99 z §7 fixture jest ignorowany (bank = tylko E1..E6 z §6)", () => {
		expect(bank.slots.map((s) => s.slotRef)).not.toContain("e99");
		expect(bank.slots.flatMap((s) => s.variants.map((v) => v.ref))).not.toContain(
			"fx-module-1-e99-a",
		);
	});

	const SYNTH = [
		"# Test",
		"## 6. Bank pytań",
		"### Koncept `c-typy`",
		"**E1.** Pytanie e1.",
		"- **A. Stem e1 A?** — o0 / **o1** / o2 / o3",
		"- **B. Stem e1 B?** — **o0** / o1 / o2 / o3",
		"- → `c-typy` → F.1",
		'- **Feedback studenta (D3):** „fb e1."',
		"",
		"**E2.** Pytanie e2.",
		"- **A. Stem e2 A?** — o0 / o1 / **o2** / o3",
		"- **B. Stem e2 B?** — o0 / **o1** / o2 / o3",
		"- → `c-typy` → F.2",
		'- **Feedback studenta (D3):** „fb e2."',
		"",
		"## 7. Brama przed oddaniem",
		"**E99.** Blok POZA §6 — nie powinien wejść.",
		"- **A. Stem e99 A?** — o0 / **o1** / o2 / o3",
		"- **B. Stem e99 B?** — **o0** / o1 / o2 / o3",
		"- → `c-typy` → F.99",
		'- **Feedback studenta (D3):** „fb e99."',
		"",
	].join("\n");

	it("blok E99 z sekcji §7 (inline) jest ignorowany (bank = tylko E1, E2 z §6)", () => {
		const synthBank = packExamBankFromMarkdown(SYNTH, "syn");
		expect(synthBank.slots.map((s) => s.slotRef)).toEqual(["e1", "e2"]);
		expect(synthBank.slots.flatMap((s) => s.variants.map((v) => v.ref))).not.toContain("syn-e99-a");
	});
});

// ============================================================================
// BRAMKA REALNEGO BANKU F1 — treść prywatna, nie „skip-if-absent".
//
// Był tu `it.skipIf(!existsSync(...))` postawiony na fałszywym założeniu, że plik
// jest niecommitowanym draftem (patrz SPROSTOWANIE w nagłówku). Po przeniesieniu
// banku do prywatnego repo treści `existsSync` znowu bywa fałszem — ale teraz
// rozróżniamy DLACZEGO: brak treści w naszym CI to awaria zaciągu (twardy błąd),
// a nie „lokalnie nie mam pliku". Deklarację pominięcia trzeba wypowiedzieć
// jawnie (SKILLBRIDGE_TRESC_OPCJONALNA=1) i zostawia ona ślad w logu.
// ============================================================================
const BANK_F1 = "docs/curation/sophia-1e3-egzamin-f1-v0.1.md";
const F1_CONCEPTS = [
	"typ-wartosci",
	"wyrazenie-obliczenie",
	"f-string-budowanie-tekstu",
	"porownanie-bool",
	"decyzja-if-else",
] as const;

describeTresc("realny bank egzaminu F1 (15×2) — treść prywatna", () => {
	it("realny bank przechodzi kontrakt 15 slotów × 2 warianty i walidację ingestu", () => {
		const real = packExamBankFromMarkdown(czytajTrescTekst(BANK_F1), "f1-python-1");
		expect(real.slots).toHaveLength(15);
		expect(validateExamBank(real, { slotCount: 15, concepts: F1_CONCEPTS })).toEqual([]);
	});
});
