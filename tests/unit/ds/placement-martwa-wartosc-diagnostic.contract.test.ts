/**
 * 1E.7 L1 — kontrakt: żadna ścieżka kodu produkcyjnego nie ZALICZA modułu
 * placementem, czyli nie zapisuje `curriculum_module_progress.verified_by_method
 * = 'diagnostic'`.
 *
 * DLACZEGO TEN TEST ISTNIEJE. ADR-014 D8 zakładał, że placement ZALICZA moduły
 * tą właśnie wartością. Rama hybrydowa (sign-off Darka 2026-07-26; korekta
 * Sophii w docs/product/decyzje-1e7-placement-v0.1.md §7 pkt 1) to odwróciła:
 * diagnoza OTWIERA nawigację, egzamin ZALICZA. Powód merytoryczny — diagnoza ma
 * rezydualną zgadywalność (≈8% na trafienie poziomu 3 na oślep), a egzamin próg
 * ≈90%; dwa instrumenty o różnej mocy dowodowej nie mogą dawać tego samego
 * skutku. Wartość została w CHECK-u (migracja 0035, bez migracji wstecznej), ale
 * jest MARTWA. Martwa wartość w enumie kusi, żeby jej użyć „bo jest" — zwłaszcza
 * kogoś, kto w L2/L3 będzie miał pod ręką moduł, poziom i gotową kolumnę.
 * Cena pomyłki: trwały wpis „zaliczone" w postępie studenta, wystawiony za jedno
 * trafione pytanie zamknięte. Nota C4 Leo + [WYMÓG BACKENDU] Sophii.
 *
 * ⚠ ZAKRES — dwie RÓŻNE kolumny o tej samej nazwie, nie mylić:
 *   • `competencies.verified_by_method` (migracja 0029, wartości 'self' |
 *     'diagnostic') — MAPA KOMPETENCJI. Zapis 'diagnostic' jest tu w pełni
 *     legalny i aktywny: diagnoza realnie ustala poziom kompetencji. Ten test
 *     go NIE zabrania.
 *   • `curriculum_module_progress.verified_by_method` (migracja 0035, wartości
 *     NULL | 'exam' | 'diagnostic' | 'test_out') — DRABINA. Tu 'diagnostic' jest
 *     martwe i tego pilnuje ten plik.
 * Źródło rozstrzygnięcia: docs/product/decyzje-1e7-placement-v0.1.md (wersja
 * wewnętrzna v0.2), §7 pkt 1 — ratyfikuje wprost, że ten kontrakt-test MUSI być
 * zawężony do curriculum_module_progress. Test w brzmieniu „nigdzie nie
 * zapisujemy 'diagnostic'" zablokowałby działającą diagnozę, wyglądając przy tym
 * na strażnika jakości. (v0.1 dokumentu cytowała tu omyłkowo migrację 0029 —
 * sprostowane w v0.2.)
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

/** Pliki produkcyjne (bez testów, fixture'ów i mocków). */
function plikiProdukcyjne(): { sciezka: string; tresc: string }[] {
	return readdirSync(SRC, { recursive: true, encoding: "utf8" })
		.filter((p) => /\.tsx?$/.test(p))
		.filter((p) => !/__tests__|__mocks__|\.test\.|\.spec\./.test(p))
		.map((p) => join(SRC, p))
		.map((sciezka) => ({
			sciezka: relative(process.cwd(), sciezka),
			tresc: readFileSync(sciezka, "utf8"),
		}));
}

/**
 * Wykrycie zapisu wartości 'diagnostic' = KONIUNKCJA dwóch warunków, celowo BEZ
 * wymogu sąsiedztwa: plik (a) przypisuje kolumnę verified_by_method oraz
 * (b) zawiera gdziekolwiek literał 'diagnostic'.
 *
 * Pierwsza wersja tego testu dopasowywała wzorzec sąsiedztwa
 * (`verifiedByMethod: "diagnostic"`) i PRZEGAPIŁA realny zapis w
 * src/app/api/onboarding/route.ts, gdzie wartość wychodzi z operatora
 * warunkowego rozbitego na cztery linie. Detektor, który przegapia zapis
 * istniejący DZIŚ w repo, nie ma prawa pilnować zapisu, który ktoś doda w L2/L3
 * — a tam pokusa będzie większa. Koniunkcja łapie formy WEWNĄTRZPLIKOWE:
 * operator warunkowy, zmienną lokalną, stałą zadeklarowaną w tym samym pliku,
 * surowy SQL — każda z nich potrzebuje literału w pliku, który przypisuje kolumnę.
 *
 * ⚠ ZNANA DZIURA — forma MIĘDZYPLIKOWA jest poza zasięgiem tego detektora.
 * Dowód (mutacja Leo, review L1, przeżyła): stała `export const METODA_DIAGNOZY =
 * "diagnostic"` w osobnym module + `verifiedByMethod: METODA_DIAGNOZY` w pliku
 * produkcyjnym dotykającym drabiny → plik zapisujący nie zawiera literału, test
 * przechodzi. To NIE jest scenariusz akademicki: nośnik odblokowania z plasterka
 * L3 najnaturalniej przyjmie właśnie postać modułu ze stałymi metod — dziura ma
 * kształt następnego plasterka. Domknięcie: carry-forward C2, próg spłaty =
 * najpóźniej PR zakładający nośnik L3 (kierunek: zamknięta lista dozwolonych
 * wartości przypisywanych do verifiedByMethod, zamiast szukania literału).
 *
 * Cena to teoretyczny fałszywy alarm (plik pisze 'exam', a o 'diagnostic' tylko
 * wspomina w komentarzu). Zmierzony koszt na dziś: ZERO — żaden z 4 plików
 * produkcyjnych dotykających drabiny nie zawiera literału 'diagnostic' ani razu.
 * Fałszywy alarm w tym miejscu i tak jest tani (jedno spojrzenie człowieka),
 * a przeoczony zapis kosztuje wpis „zaliczone" w postępie studenta.
 */
const PRZYPISUJE_METODE = /verifiedByMethod\s*:|verified_by_method\s*=/;
const LITERAL_DIAGNOSTIC = /['"`]diagnostic['"`]/;
const zapisujeDiagnostic = (tresc: string): boolean =>
	PRZYPISUJE_METODE.test(tresc) && LITERAL_DIAGNOSTIC.test(tresc);

/** Dotknięcie tabeli drabiny — w Drizzle albo w surowym SQL. */
const TABELA_DRABINY = /curriculumModuleProgress|curriculum_module_progress/;

/**
 * Pliki, którym WOLNO zapisać 'diagnostic' — bo piszą do `competencies`, nie do
 * drabiny. Lista jest zamknięta świadomie: nowy plik na tej liście ma wymusić
 * decyzję („na pewno kompetencje, nie drabina?"), a nie przejść niezauważony.
 */
const DOZWOLONE_ZAPISY_KOMPETENCJI = [
	"src/app/api/assessment/[id]/complete/route.ts", // zamknięcie diagnozy → poziomy kompetencji
	"src/app/api/onboarding/route.ts", // onboarding z pomiarem/carryover → poziomy kompetencji
];

/**
 * schema.ts DEKLARUJE CHECK z wartością 'diagnostic' i ma tak zostać — Sophia
 * §7 pkt 1: „wartość zostaje w schemacie, bez migracji wstecznej". Deklaracja
 * dozwolonego zbioru to nie zapis do kolumny.
 */
const DEKLARACJA_SCHEMATU = "src/lib/db/schema.ts";

describe("1E.7 L1 · verified_by_method='diagnostic' jest martwe w DRABINIE", () => {
	it("żaden plik produkcyjny dotykający curriculum_module_progress nie zapisuje 'diagnostic'", () => {
		const winowajcy = plikiProdukcyjne()
			.filter((f) => f.sciezka !== DEKLARACJA_SCHEMATU)
			.filter((f) => TABELA_DRABINY.test(f.tresc))
			.filter((f) => zapisujeDiagnostic(f.tresc))
			.map((f) => f.sciezka);

		expect(
			winowajcy,
			`Placement pod ramą hybrydową ODBLOKOWUJE, nie zalicza. Zapis 'diagnostic' do ` +
				`curriculum_module_progress wystawiłby „zaliczone" za trafione pytanie zamknięte ` +
				`(zgadywalność ≈8%) — zaliczenie wymaga przejścia modułu albo egzaminu (≈90%). ` +
				`Jeśli potrzebujesz oznaczyć odblokowanie, to jest OSOBNY nośnik (slice L3), nie ta kolumna.`,
		).toEqual([]);
	});

	it("zbiór plików zapisujących 'diagnostic' jest zamknięty i dotyczy WYŁĄCZNIE competencies", () => {
		const zapisujace = plikiProdukcyjne()
			.filter((f) => f.sciezka !== DEKLARACJA_SCHEMATU)
			.filter((f) => zapisujeDiagnostic(f.tresc))
			.map((f) => f.sciezka)
			.sort();

		expect(
			zapisujace,
			"nowy plik zapisujący 'diagnostic' — sprawdź, czy na pewno kompetencje",
		).toEqual([...DOZWOLONE_ZAPISY_KOMPETENCJI].sort());
	});

	it("dozwolone pliki faktycznie NIE dotykają drabiny (to jest warunek bezpieczeństwa tej listy)", () => {
		// Bez tego asertu lista wyżej byłaby furtką: ktoś dopisuje zapis do drabiny
		// w pliku, który już jest na liście, i pierwszy test go nie zobaczy.
		for (const sciezka of DOZWOLONE_ZAPISY_KOMPETENCJI) {
			const tresc = readFileSync(join(process.cwd(), sciezka), "utf8");
			expect(
				TABELA_DRABINY.test(tresc),
				`${sciezka} zaczął dotykać curriculum_module_progress, a wolno mu zapisywać ` +
					`'diagnostic' — zdejmij go z listy albo rozdziel ścieżki zapisu`,
			).toBe(false);
		}
	});

	it("skaner faktycznie widzi kod (bezpiecznik przed cichym zerem — pusty zbiór plików przechodzi wszystko)", () => {
		const pliki = plikiProdukcyjne();
		expect(pliki.length).toBeGreaterThan(100);
		expect(pliki.some((f) => TABELA_DRABINY.test(f.tresc))).toBe(true);
		expect(pliki.some((f) => zapisujeDiagnostic(f.tresc))).toBe(true);
		// Detektor musi widzieć OBA realne zapisy, w tym ten przez operator
		// warunkowy — to jest asercja na czułość samego detektora, nie na kod.
		expect(
			plikiProdukcyjne()
				.filter((f) => zapisujeDiagnostic(f.tresc))
				.map((f) => f.sciezka)
				.sort(),
		).toEqual([DEKLARACJA_SCHEMATU, ...DOZWOLONE_ZAPISY_KOMPETENCJI].sort());
	});
});
