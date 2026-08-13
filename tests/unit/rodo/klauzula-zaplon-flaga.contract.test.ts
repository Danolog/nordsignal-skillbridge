/**
 * STRAŻNIK ZAPŁONU: klauzula art. 13 jest wdrożona i WYŁĄCZONA — oraz nie da się
 * jej zapalić w oderwaniu od ścieżki usunięcia konta.
 *
 * ── Dlaczego to nie jest zwykły test flagi ───────────────────────────────────
 * Warunek W-1 z sekcji Z-2 dokumentu mówi: klauzula zapala się dopiero, gdy
 * ścieżka usunięcia konta DZIAŁA w produkcie. Sekcja 8 klauzuli obiecuje
 * studentowi „usuniesz konto samodzielnie w ustawieniach profilu"; przy zgaszonej
 * ścieżce to zdanie jest nieprawdziwe w chwili wypowiadania. Sprzężenie flag
 * (`requires` w `src/lib/flags.ts`) jest MECHANIZMEM, który to egzekwuje —
 * i celowo żyje w ewaluacji flagi, bo zmienną na Vercelu przestawia się bez
 * wdrożenia.
 *
 * ── ŚWIADOMY DŁUG Z PROGIEM (CLAUDE.md v1.17) ────────────────────────────────
 * Sprzężenia NIE DA SIĘ dziś zadeklarować: flaga usuwania konta (E1b) nie
 * istnieje jeszcze w rejestrze, a `requires` wskazujące nieistniejącą nazwę nie
 * przechodzi kontraktu kompilacji (`_RequirementsAreFlagNames`). Zamiast zostawić
 * to jako notatkę w opisie flagi — czyli dług ukryty — stoi tu strażnik z jawnym
 * progiem:
 *
 *   PRÓG: w chwili, gdy w rejestrze FLAGS pojawi się flaga usuwania konta,
 *   `privacyNoticeArt13` MUSI wymienić ją w `requires`. Do tego czasu test
 *   pilnuje, że flagi nie ma — więc próg nie może minąć niezauważony.
 *
 * ── DOWÓD, ŻE STRAŻNIK STRZEŻE (mutacja, nie zielona suita) ──────────────────
 * M4 — próg przekroczony bez domknięcia sprzężenia (dokładnie to, co się stanie,
 *      gdy E1b Ethana wejdzie do rejestru, a ktoś zapomni o `requires`).
 *   Zmiana: `src/lib/flags.ts` — do rejestru dopisana flaga
 *           `accountDeletion: { envVar: "FLAG_ACCOUNT_DELETION", description: "E1b",
 *           defaultValue: false }`, bez dopisania jej do `requires` klauzuli.
 *   Padł: „gdy flaga usuwania konta wejdzie do rejestru, klauzula MUSI ją wymagać (W-1)".
 *   Komunikat: „W rejestrze jest flaga usuwania konta (accountDeletion), a klauzula
 *          art. 13 jej NIE wymaga. Warunek W-1 sekcji Z-2: sekcja 8 klauzuli obiecuje
 *          studentowi samodzielne usunięcie konta — przy zgaszonej ścieżce to zdanie
 *          jest nieprawdziwe w chwili wypowiadania. Dopisz ją do `requires`."
 *   Data: 2026-08-13. Mutacja cofnięta.
 *
 * Kontrola dwustronna: bez mutacji wszystkie testy tego pliku są zielone, a test
 * „domyślnie zgaszona" dowodzi, że pilnujemy stanu, nie samego istnienia wpisu.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { FLAGS, isFeatureEnabled, requirementsOf } from "@/lib/flags";

/** Jak rozpoznajemy flagę ścieżki usunięcia konta, zanim poznamy jej nazwę. */
const WZORZEC_USUWANIA_KONTA = /deletion|usuwan|usuniec|delete.*account|account.*delet/i;

function flagiUsuwaniaKonta(): string[] {
	return Object.entries(FLAGS)
		.filter(
			([nazwa, def]) =>
				WZORZEC_USUWANIA_KONTA.test(nazwa) || WZORZEC_USUWANIA_KONTA.test(def.envVar),
		)
		.map(([nazwa]) => nazwa);
}

describe("klauzula art. 13 · zapłon", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("flaga istnieje i jest domyślnie ZGASZONA (gotowe i wyłączone)", () => {
		expect(FLAGS.privacyNoticeArt13).toBeDefined();
		expect(FLAGS.privacyNoticeArt13.defaultValue).toBe(false);
		vi.stubEnv("FLAG_PRIVACY_NOTICE_ART13", "");
		expect(isFeatureEnabled("privacyNoticeArt13")).toBe(false);
	});

	it("nieznana wartość env nie zapala klauzuli (fail-closed)", () => {
		vi.stubEnv("FLAG_PRIVACY_NOTICE_ART13", "tak");
		expect(isFeatureEnabled("privacyNoticeArt13")).toBe(false);
	});

	it("opis flagi odsyła do warunków Z-2, a nie powtarza ich liczby", () => {
		// Nośnikiem listy warunków jest tabela Z-2 (strażnik
		// klauzula-liczba-warunkow.contract.test.ts). Opis flagi ją WOŁA.
		expect(FLAGS.privacyNoticeArt13.description).toMatch(/Z-2/);
	});

	it("gdy flaga usuwania konta wejdzie do rejestru, klauzula MUSI ją wymagać (W-1)", () => {
		const kandydaci = flagiUsuwaniaKonta();
		const wymagane = requirementsOf("privacyNoticeArt13") as readonly string[];
		const nieobjete = kandydaci.filter((f) => !wymagane.includes(f));

		expect(
			nieobjete,
			`W rejestrze jest flaga usuwania konta (${nieobjete.join(", ")}), a klauzula art. 13 ` +
				`jej NIE wymaga. Warunek W-1 sekcji Z-2: sekcja 8 klauzuli obiecuje studentowi ` +
				`samodzielne usunięcie konta — przy zgaszonej ścieżce to zdanie jest nieprawdziwe ` +
				`w chwili wypowiadania. Dopisz ją do \`requires\` flagi privacyNoticeArt13.`,
		).toEqual([]);
	});

	it("dopóki tamtej flagi nie ma, próg jest jawny (a nie zapomniany)", () => {
		// Kontrola dodatnia progu: gdyby ten test zaczął padać, znaczy to, że
		// E1b wszedł do rejestru — i że test wyżej właśnie zaczął pilnować czegoś
		// realnego. Wtedy usuwa się ten test, nie tamten.
		expect(
			flagiUsuwaniaKonta(),
			"Flaga usuwania konta pojawiła się w rejestrze — próg minął. Dopisz ją do " +
				"`requires` flagi privacyNoticeArt13 i skasuj ten test (jego rolę przejmuje test wyżej).",
		).toEqual([]);
	});
});
