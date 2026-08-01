/**
 * 1E.7 L1 — kontrakt tagów placementu: manifest drabiny kontra bank pytań.
 *
 * Most diagnoza → drabina to CZYSTA KONFIGURACJA w danych (pole
 * `diagnosticConcept` per moduł → curriculum_modules.diagnostic_concept_id).
 * Konfiguracja w danych ma jedną wadę: literówka nie jest błędem kompilacji.
 * Ingest ma na to strażnik twardy (`resolveDiagnosticConceptId` — wyjątek,
 * nigdy ciche NULL), ale ingest odpala się dopiero przy wdrożeniu. Ten test
 * przesuwa wykrycie o kilka dni wcześniej — do CI, przed review.
 *
 * Dwie rzeczy, których ingest z zasady NIE złapie i które łapie wyłącznie ten
 * plik (podział ról za wymogiem Sophii — „brak wpisu = błąd konfiguracji do
 * wyłapania kontrakt-testem, jawny NULL = decyzja"):
 *   1. BRAK KLUCZA na module — ingest traktuje go jak `null`, więc przeoczenie
 *      przy dodawaniu modułu po cichu wyłączyłoby placement dla tego modułu.
 *   2. CICHA PODMIANA MAPY — mapa jest rozstrzygnięciem produktowym Sophii
 *      (DECYZJA 1, docs/product/decyzje-1e7-placement-v0.1.md), nie detalem
 *      implementacyjnym. Zmiana tagu bez zmiany dokumentu ma wywalić CI, tak
 *      samo jak dryf kolejności modułów wywala kontrakt drabiny 1E.1c.
 *
 * Źródło prawdy o zbiorze diagnostycznym: tools/content/question-bank-ds-partia-1.json
 * (to ten sam plik, z którego `db:ingest-question-bank` ładuje koncepty rynkowe).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
// Manifest drabiny ZOSTAJE publiczny (sama struktura, zero kluczy). Bank pytań
// niesie klucze → prywatne repo treści. Ten test wiąże jedno z drugim, więc
// dzieli los banku: brak treści = twardy błąd, fork bez sekretu = pominięcie.
import { czytajTrescJson, describeTresc } from "../../support/tresc-prywatna";

type LadderModule = {
	slug: string;
	title: string;
	diagnosticConcept?: string | null;
};

const ladder = JSON.parse(
	readFileSync(join(process.cwd(), "tools", "content", "curriculum-ds-drabina.json"), "utf8"),
) as { path: string; modules: LadderModule[] };

const bank = czytajTrescJson<{ slug: string; name: string; trunk: string; diagnostic: boolean }[]>(
	"tools/content/question-bank-ds-partia-1.json",
	[],
);

const conceptBySlug = new Map(bank.map((c) => [c.slug, c]));

/**
 * Mapa wiążąca — DECYZJA 1 Sophii (v0.1, 2026-07-26), sign-off ramy hybrydowej
 * przez Darka 2026-07-26. `null` = „nie zmierzyliśmy", NIE „student nie umie".
 */
const MAPA_WIAZACA: Record<string, string | null> = {
	"l0-start": null, // setup Colab = czynność, nie wiedza; brak egzaminu = brak drogi awaryjnej
	"f1-python-1": "ds-python",
	"f2-python-2": null, // w banku zero pytań o pętle i definiowanie funkcji
	"f3-dane-python": null, // w banku zero pytań o słowniki, listę słowników i agregaty
	"m-pandas": "ds-pandas",
	"m-eda": "ds-eda", // świadomie NIE ds-git — Git wchodzi tu just-in-time jako narzędzie
	"m-sql": "ds-sql",
	"m-ml": "ds-uczenie-maszynowe",
	"m-llm": "ds-llm", // para SŁABA — pierwsza do rewizji przy rozbudowie banku
};

describeTresc("1E.7 L1 · kontrakt tagów placementu (manifest ↔ bank)", () => {
	it("KAŻDY moduł ma pole diagnosticConcept — brak klucza to błąd konfiguracji, nie milczące NULL", () => {
		for (const m of ladder.modules) {
			expect(
				Object.hasOwn(m, "diagnosticConcept"),
				`moduł '${m.slug}': brak pola 'diagnosticConcept'. Ingest potraktowałby to jak ` +
					`null i po cichu wyłączył placement. Wpisz jawnie slug albo null (DECYZJA 1 Sophii).`,
			).toBe(true);
		}
	});

	it("wartość to slug (string niepusty) albo jawny null — nigdy undefined, pusty string ani inny typ", () => {
		for (const m of ladder.modules) {
			const tag = m.diagnosticConcept;
			if (tag === null) continue;
			expect(typeof tag, `moduł '${m.slug}': tag typu ${typeof tag}`).toBe("string");
			expect(
				(tag as string).trim().length,
				`moduł '${m.slug}': pusty slug — użyj null, jeśli nie ma czym zmierzyć`,
			).toBeGreaterThan(0);
		}
	});

	it("każdy niepusty tag ISTNIEJE w banku (łapie literówkę zanim wywali ingest na wdrożeniu)", () => {
		for (const m of ladder.modules) {
			if (!m.diagnosticConcept) continue;
			expect(
				conceptBySlug.has(m.diagnosticConcept),
				`moduł '${m.slug}': tag '${m.diagnosticConcept}' nie istnieje w banku ` +
					`question-bank-ds-partia-1.json. Dostępne: ${[...conceptBySlug.keys()].sort().join(", ")}`,
			).toBe(true);
		}
	});

	it("każdy tag wskazuje koncept trunk='market' + diagnostic=true (zbiór, o który realnie pyta diagnoza)", () => {
		for (const m of ladder.modules) {
			if (!m.diagnosticConcept) continue;
			const concept = conceptBySlug.get(m.diagnosticConcept);
			if (!concept) continue; // rozstrzyga poprzedni test — tu bez podwójnego krzyku
			expect(
				{ trunk: concept.trunk, diagnostic: concept.diagnostic },
				`moduł '${m.slug}' → '${m.diagnosticConcept}': koncept spoza zbioru diagnozy ` +
					`nigdy nie dostanie poziomu w result_json, więc tag zablokowałby moduł na stałe`,
			).toEqual({ trunk: "market", diagnostic: true });
		}
	});

	it("mapa modułów zgodna z DECYZJĄ 1 Sophii — zmiana tagu wymaga zmiany dokumentu decyzji", () => {
		const zManifestu = Object.fromEntries(
			ladder.modules.map((m) => [m.slug, m.diagnosticConcept ?? null]),
		);
		expect(zManifestu).toEqual(MAPA_WIAZACA);
	});

	it("żaden koncept nie taguje dwóch modułów (jeden pomiar nie może otwierać dwóch modułów naraz)", () => {
		// DECYZJA 4: rozciągnięcie ds-python na F1+F2+F3 obeszłoby ochronę prefiksową
		// — jeden strzał (≈8% szansy na ślepe trafienie) otwierałby trzy moduły.
		const tagi = ladder.modules.map((m) => m.diagnosticConcept).filter((t): t is string => !!t);
		expect(new Set(tagi).size, `duplikat tagu w: ${tagi.join(", ")}`).toBe(tagi.length);
	});

	it("l0-start NIGDY nie ma tagu (DECYZJA 3 — jedyny moduł bez egzaminu, brak drogi awaryjnej)", () => {
		const l0 = ladder.modules.find((m) => m.slug === "l0-start");
		expect(l0?.diagnosticConcept ?? null).toBeNull();
	});
});
