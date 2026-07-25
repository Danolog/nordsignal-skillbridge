// ============================================================================
// 1E.3 (ADR-014 D3) — TEST RÓWNOWAŻNOŚCI (C1, spłata N+1): rdzeń „correctives
// odbyte" po zbatchowaniu evaluateExamCycle to CZYSTA funkcja computeCorrectivesDoneAt.
// Dawniej logika żyła w zapytaniu `correctivesDoneAt` (min(answered_at) WHERE
// answered_at > failedAt PER SESJA, wszystkie wymagane obecne, boundary = max).
// Batch przeniósł domknięcie do pamięci; ten test LOCKUJE, że definicja `doneAt`
// i krawędzie są DOKŁADNIE te same — w szczególności PUŁAPKA PER-SESJA: filtr
// `answered_at > failedAt` należy do KONKRETNEJ sesji, nie do batcha.
//
// (Quinn dołoży adwersaryjne przypadki wielo-sesyjne na żywej bazie — [P5]
// integration już egzekwuje batchowaną evaluateExamCycle end-to-end: 1/2 → 423,
// 2/2 → 201.)
// ============================================================================

import { describe, expect, it } from "vitest";
import { computeCorrectivesDoneAt } from "../exam-service";

const t = (iso: string) => new Date(iso);
const FAILED_AT = t("2026-06-20T12:00:00.000Z");

describe("computeCorrectivesDoneAt — semantyka per-sesja failedAt (równoważność z SQL)", () => {
	it("brak wymaganych atomów → domknięcie = failedAt (koncept bez ukończalnego atomu nie blokuje)", () => {
		const done = computeCorrectivesDoneAt(FAILED_AT, [], new Map());
		expect(done).toEqual(FAILED_AT);
	});

	it("wszystkie wymagane atomy odrobione PO failedAt → boundary = MAX najwcześniejszych", () => {
		const a1 = t("2026-06-20T13:00:00.000Z");
		const a2 = t("2026-06-20T14:30:00.000Z"); // najpóźniejszy „ostatni brakujący"
		const done = computeCorrectivesDoneAt(
			FAILED_AT,
			["i1", "i2"],
			new Map([
				["i1", [a1]],
				["i2", [a2]],
			]),
		);
		expect(done).toEqual(a2);
	});

	it("PUŁAPKA PER-SESJA: atom odrobiony TYLKO PRZED failedAt → null (nie liczy się dla tej sesji)", () => {
		const before = t("2026-06-20T11:00:00.000Z"); // przed failedAt tej sesji
		const done = computeCorrectivesDoneAt(FAILED_AT, ["i1"], new Map([["i1", [before]]]));
		expect(done).toBeNull();
	});

	it("atom z odpowiedziami PRZED i PO failedAt → bierze MIN z tych PO (ignoruje wcześniejsze)", () => {
		const before = t("2026-06-20T11:30:00.000Z");
		const afterEarly = t("2026-06-20T13:15:00.000Z"); // min po failedAt
		const afterLate = t("2026-06-20T18:00:00.000Z");
		const done = computeCorrectivesDoneAt(
			FAILED_AT,
			["i1"],
			new Map([["i1", [afterLate, before, afterEarly]]]),
		);
		expect(done).toEqual(afterEarly);
	});

	it("strict `>` failedAt: odpowiedź DOKŁADNIE w failedAt nie kwalifikuje → null", () => {
		const done = computeCorrectivesDoneAt(FAILED_AT, ["i1"], new Map([["i1", [FAILED_AT]]]));
		expect(done).toBeNull();
	});

	it("jeden wymagany atom bez ŻADNEJ odpowiedzi → null (correctives NIEODBYTE)", () => {
		const a1 = t("2026-06-20T13:00:00.000Z");
		const done = computeCorrectivesDoneAt(
			FAILED_AT,
			["i1", "i2"],
			new Map([["i1", [a1]]]), // i2 nieobecny w mapie
		);
		expect(done).toBeNull();
	});

	it("ta sama mapa, DWIE różne sesje (różny failedAt) → różne domknięcia (dowód per-sesja)", () => {
		// Answer o 13:00. Sesja A failedAt 12:00 → kwalifikuje (>12:00). Sesja B failedAt
		// 13:30 → NIE kwalifikuje (13:00 !> 13:30) → null. To jest istota per-sesja:
		// batch fetchuje raz, ale próg należy do sesji, nie do zapytania.
		const answers = new Map([["i1", [t("2026-06-20T13:00:00.000Z")]]]);
		const doneA = computeCorrectivesDoneAt(t("2026-06-20T12:00:00.000Z"), ["i1"], answers);
		const doneB = computeCorrectivesDoneAt(t("2026-06-20T13:30:00.000Z"), ["i1"], answers);
		expect(doneA).toEqual(t("2026-06-20T13:00:00.000Z"));
		expect(doneB).toBeNull();
	});
});
