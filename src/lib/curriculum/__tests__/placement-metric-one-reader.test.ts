// ============================================================================
// 1E.7 / D11 — NIEZMIENNIK JEDNEGO CZYTELNIKA miernika placementu.
//
// Bliźniak `placement-one-writer.test.ts` (jeden pisarz do curriculum_placements),
// tylko od strony ODCZYTU. Powód jest ten sam i twardszy niż estetyka: rekomendacja
// Leo z 2026-08-01 — „czy ta reguła ma dokładnie jeden nośnik" — powstała po
// ustaleniu, że TA SAMA reguła w dwóch kopiach wyprodukowała w funkcji placementu
// CZTERY osobne wady (D0, D4, K1, znalezisko A).
//
// Co konkretnie chronimy: regułę wyłączenia przebiegów weryfikacyjnych
// (`klasyfikujZdarzenie`). Drugie zapytanie po `curriculum.placement.computed`,
// napisane gdziekolwiek indziej — w trasie, w skrypcie, w panelu — z bardzo dużym
// prawdopodobieństwem NIE odtworzy tej reguły, bo ona nie wynika z danych: wynika
// z rozstrzygnięcia produktowego (§6a). Rozjazd byłby BEZOBJAWOWY — drugi odczyt
// pokazałby wyższą skuteczność placementu i wyglądałby wiarygodniej niż pierwszy.
// ============================================================================

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const KATALOG_GLOWNY = process.cwd();
const SKANOWANE = ["src", "tools"];

/** Jedyny plik produkcyjny, któremu wolno CZYTAĆ zdarzenia miernika. */
const DOZWOLONY_CZYTELNIK = "src/lib/curriculum/placement-metric.ts";

/** Jedyny pisarz zdarzeń — wolno mu znać nazwy akcji, bo je emituje. */
const DOZWOLONY_PISARZ_ZDARZEN = "src/lib/curriculum/placement-service.ts";

/** Cienki uruchamiacz raportu — importuje czytelnika, sam reguły nie zna. */
const DOZWOLONY_URUCHAMIACZ = "tools/report-placement-metric.ts";

/** Narzędzie wpisu do rejestru — pisze do tabeli, nie czyta miernika. */
const DOZWOLONY_PISARZ_REJESTRU = "tools/pilot-enroll.ts";

const NAZWY_AKCJI = ["curriculum.placement.computed", "curriculum.placement.skipped"];

/** Rejestr uczestników = nośnik reguły w danych. Też ma zamknięty krąg dotykających. */
const TABELA_REJESTRU = /pilot_participants|pilotParticipants/;

function plikiZrodlowe(katalog: string): string[] {
	const wynik: string[] = [];
	for (const wpis of readdirSync(katalog)) {
		const sciezka = join(katalog, wpis);
		if (statSync(sciezka).isDirectory()) {
			if (wpis === "node_modules" || wpis === ".next") continue;
			wynik.push(...plikiZrodlowe(sciezka));
			continue;
		}
		if (!/\.(ts|tsx)$/.test(wpis)) continue;
		// Testy poza zakresem — mają prawo wstawić rekwizyt i nazwać akcję.
		if (/\.(test|spec)\.tsx?$/.test(wpis) || sciezka.includes("__tests__")) continue;
		wynik.push(sciezka);
	}
	return wynik;
}

function wzglednaSciezka(plik: string): string {
	return relative(KATALOG_GLOWNY, plik).split("\\").join("/");
}

/**
 * Usuwa komentarze przed skanem. Strażnik pyta o UŻYCIE w kodzie, nie o wzmiankę
 * w dokumentacji: `path-key.ts` opisuje w komentarzu, dokąd trafia ślad pominięcia,
 * i nie jest przez to czytelnikiem miernika. Bez tego kroku guard karałby za
 * tłumaczenie własnego kodu, czyli za rzecz, której od tego repo wymagamy.
 *
 * Ograniczenie świadome: to prosty zdejmowacz, nie parser — napis zawierający
 * sekwencję komentarza zostanie ucięty. Kierunek błędu jest bezpieczny dla
 * dokumentacji i niebezpieczny dla wykrywalności, dlatego kontrola dodatnia
 * niżej sprawdza, że skan po zdjęciu komentarzy WCIĄŻ widzi prawdziwego czytelnika.
 */
function bezKomentarzy(tresc: string): string {
	return tresc.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("1E.7 D11 — jeden czytelnik miernika placementu", () => {
	it("żaden plik produkcyjny poza czytelnikiem i pisarzem nie zna nazw akcji miernika", () => {
		const winowajcy: string[] = [];
		for (const katalog of SKANOWANE) {
			for (const plik of plikiZrodlowe(join(KATALOG_GLOWNY, katalog))) {
				const wzgledna = wzglednaSciezka(plik);
				if (wzgledna === DOZWOLONY_CZYTELNIK || wzgledna === DOZWOLONY_PISARZ_ZDARZEN) continue;
				const tresc = bezKomentarzy(readFileSync(plik, "utf8"));
				for (const akcja of NAZWY_AKCJI) {
					if (tresc.includes(akcja)) winowajcy.push(`${wzgledna} (${akcja})`);
				}
			}
		}
		expect(
			winowajcy,
			"Druga droga odczytu miernika placementu. Reguła wyłączenia przebiegów " +
				"weryfikacyjnych (§6a) NIE wynika z danych — wynika z rozstrzygnięcia " +
				"produktowego, więc drugie zapytanie prawie na pewno jej nie odtworzy " +
				"i pokaże wyższą skuteczność niż pierwsze. Czytaj przez " +
				"`zbierzMiernik` z placement-metric.ts albo dopisz plik do listy PO " +
				"przeglądzie — z dowodem, że reguła obowiązuje też na tej drodze.",
		).toEqual([]);
	});

	it("rejestr uczestników ma zamknięty krąg dotykających", () => {
		const dozwolone = new Set([
			DOZWOLONY_CZYTELNIK,
			DOZWOLONY_URUCHAMIACZ,
			DOZWOLONY_PISARZ_REJESTRU,
			"src/lib/db/schema.ts",
			// STRAŻNIK UPRAWNIEŃ, nie czytelnik treści (W1 Ryana, #270). `k3-validate`
			// zna tę tabelę wyłącznie z nazwy — sprawdza, że app_student i app_faculty
			// nie mają na niej ŻADNYCH grantów (w tym TRUNCATE, który wymyka się RLS).
			// Nie czyta ani jednego wiersza rejestru, więc nie może odtworzyć reguły
			// wyłączenia ani się z nią rozjechać.
			"tools/k3-validate.ts",
		]);
		const winowajcy: string[] = [];
		for (const katalog of SKANOWANE) {
			for (const plik of plikiZrodlowe(join(KATALOG_GLOWNY, katalog))) {
				const wzgledna = wzglednaSciezka(plik);
				if (dozwolone.has(wzgledna)) continue;
				if (TABELA_REJESTRU.test(bezKomentarzy(readFileSync(plik, "utf8"))))
					winowajcy.push(wzgledna);
			}
		}
		expect(
			winowajcy,
			"Rejestr uczestników pilotażu jest nośnikiem reguły wyłączenia w danych. " +
				"Nowy pisarz albo czytelnik tej tabeli = zmiana reguły, nie użycie danych.",
		).toEqual([]);
	});

	it("kontrola: dozwolony czytelnik FAKTYCZNIE czyta (lista nie zwietrzała)", () => {
		// Bez tej kontroli test świeciłby na zielono także wtedy, gdyby odczyt
		// zniknął — pilnowałby wtedy pustego zbioru. Dokładnie ta klasa atrapy,
		// którą Leo znalazł 2026-08-01.
		const tresc = bezKomentarzy(readFileSync(join(KATALOG_GLOWNY, DOZWOLONY_CZYTELNIK), "utf8"));
		for (const akcja of NAZWY_AKCJI) expect(tresc).toContain(akcja);
		expect(TABELA_REJESTRU.test(tresc)).toBe(true);
	});
});
