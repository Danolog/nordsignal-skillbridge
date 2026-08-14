// @vitest-environment node
/**
 * STRAŻNIK — każda trasa czytająca nośnik treści ma wpis w śladzie funkcji.
 *
 * ── PO CO ────────────────────────────────────────────────────────────────────
 * Ładowarki z `src/lib/tresc/dokumenty-pilotazu.ts` czytają pliki `docs/**` przez
 * `readFileSync` ze ścieżki składanej w czasie działania. Statyczna analiza śladu
 * funkcji bezserwerowej Vercela takiego odczytu NIE WIDZI, więc każda trasa, która
 * do niego dochodzi, musi być wymieniona w `outputFileTracingIncludes`. Bez wpisu
 * strona działa lokalnie i pada na produkcji błędem „ENOENT".
 *
 * Ta reguła była zapisana WYŁĄCZNIE w komentarzu i natychmiast przeciekła: przy
 * pierwszym podejściu miała cztery adresatów, a wpisy dostało dwóch. Brakowało
 * `/signup` i `/api/auth/[...path]` — czyli akurat tych, na których odczyt wykonuje
 * się przy KAŻDEJ rejestracji, a nie przy wejściu na stronę z treścią. Reguła
 * pilnowana pamięcią jest regułą do pierwszego zmęczenia; stąd ten plik.
 *
 * ── DLACZEGO NIE „PRZECHODNIO PO IMPORTACH" ──────────────────────────────────
 * Kuszące jest policzyć wszystkie trasy, które przechodnio importują ładowarkę.
 * Byłby to strażnik BEZUŻYTECZNY: `src/lib/auth/server.ts` importuje kilkadziesiąt
 * tras API (każda woła `getSession`), a żadna z nich odczytu nie wykona — zaczep
 * `before` wychodzi na `ctx.path` długo przed dotknięciem dokumentu. Strażnik
 * żądający 40 wpisów zostałby wyciszony w tydzień, a wyciszony strażnik nie broni
 * niczego (ta sama pułapka co „krzyczenie na poprawny tekst" przy odciskach
 * aparatu wewnętrznego w klauzuli).
 *
 * Dlatego granica biegnie po KONSUMENTACH ładowarki (moduły, które faktycznie ją
 * wołają), a nie po imporcie przechodnim. Każdy konsument musi mieć jawnie
 * zadeklarowane, które trasy go wykonują — a każda taka trasa musi mieć wpis.
 * Dodanie piątego konsumenta ZATRZYMUJE się tutaj: test każe dopisać trasy.
 *
 * ── DOWODY MUTACJI (CLAUDE.md v1.17, reguła (2)) ─────────────────────────────
 * Wykonane 2026-08-14, każda cofnięta po pomiarze.
 *
 * MT1. Usunięcie wpisu `"/api/auth/[...path]"` z `next.config.ts`:
 *      PADA 1 z 5. Cytat: „Trasy czytające nośnik BEZ wpisu w
 *      outputFileTracingIncludes: /api/auth/[...path] … expected [ '/api/auth/[...path]' ]
 *      to deeply equal []". To jest dokładnie ta wada, którą Leo złapał przeglądem.
 *
 * MT2. Usunięcie wpisu `"/signup"` z `next.config.ts`:
 *      PADA 1 z 5, ten sam test, cytat z `/signup`.
 *
 * MT3. Nowy konsument bez deklaracji — dopisanie importu
 *      `wczytajRegulaminPilotazu` do `src/app/faculty/page.tsx`:
 *      PADA 1 z 5. Cytat: „Moduł woła ładowarkę nośnika, ale nie deklaruje, które
 *      trasy go wykonują: src/app/faculty/page.tsx". Czyli piąty konsument NIE
 *      przecieka — a to był cel tego pliku.
 *
 * Przebieg po cofnięciu wszystkich trzech: 5/5 zielonych.
 *
 * ── CZEGO NIE PILNUJE ────────────────────────────────────────────────────────
 * Nie dowodzi, że wpis DZIAŁA na Vercelu — to sprawdzalne dopiero na wdrożeniu
 * podglądowym (odwiedzić trasę i zobaczyć, że nie ma „ENOENT"). Strażnik pilnuje
 * KOMPLETNOŚCI listy, nie skuteczności mechanizmu Vercela.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const KORZEN = process.cwd();
const SRC = join(KORZEN, "src");

/** Ładowarki, których wywołanie oznacza odczyt pliku z `docs/**` w czasie działania. */
const LADOWARKI = [
	"wczytajZasadeDlaPracodawcy",
	"wczytajRegulaminPilotazu",
	// Woła `wczytajRegulaminPilotazu` w środku — dla konsumenta to ten sam odczyt.
	"wersjaRegulaminuPilotazu",
];

/**
 * KTO WYKONUJE ODCZYT — mapa konsument → trasy, na których ten odczyt się dzieje.
 *
 * Wpis jest ŚWIADOMĄ deklaracją, nie automatem: dla modułów spoza `src/app`
 * (np. konfiguracji uwierzytelniania) tylko człowiek wie, którymi trasami ich kod
 * naprawdę biegnie. Pusta lista jest legalna — znaczy „ten moduł nie czyta na
 * ścieżce żądania" — ale musi być wpisana jawnie, żeby ktoś to rozważył.
 */
const KONSUMENCI: Record<string, string[]> = {
	"src/app/passport/[id]/not-found.tsx": ["/passport/[id]"],
	"src/app/regulamin/page.tsx": ["/regulamin"],
	// Strona rejestracji czyta WERSJĘ dokumentu przy renderze (przy zapalonej fladze).
	"src/app/(auth)/signup/page.tsx": ["/signup"],
	// Zaczep `before` porównuje wersję z żądania z wersją z dokumentu. Wszystkie
	// żądania biblioteki uwierzytelniającej idą trasą zbiorczą — w tym `/sign-up/email`.
	"src/lib/auth/server.ts": ["/api/auth/[...path]"],
	// Moduł bramki: sam nie stoi na żadnej trasie, wołają go dwa wpisy wyżej.
	"src/lib/tresc/akceptacja-regulaminu.ts": [],
	// Same ładowarki — definicja, nie konsument.
	"src/lib/tresc/dokumenty-pilotazu.ts": [],
};

/** Usuwa komentarze — wariant Ethana (#317): psuje się w stronę CZERWONĄ, nie otwartą. */
function bezKomentarzy(tresc: string): string {
	return tresc.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

function plikiProdukcyjne(): { sciezka: string; tresc: string }[] {
	return readdirSync(SRC, { recursive: true, encoding: "utf8" })
		.filter((p) => /\.tsx?$/.test(p))
		.filter((p) => !/__tests__|__mocks__|\.test\.|\.spec\.|[/\\]test[/\\]/.test(p))
		.map((p) => join(SRC, p))
		.map((sciezka) => ({
			sciezka: relative(KORZEN, sciezka).replace(/\\/g, "/"),
			tresc: bezKomentarzy(readFileSync(sciezka, "utf8")),
		}));
}

/** Moduły, w których KOD (nie komentarz) woła którąkolwiek ładowarkę. */
function konsumenciWKodzie(): string[] {
	return plikiProdukcyjne()
		.filter(({ tresc }) => LADOWARKI.some((l) => tresc.includes(l)))
		.map(({ sciezka }) => sciezka)
		.sort();
}

/** Klucze `outputFileTracingIncludes` z konfiguracji — czytane z pliku, nie z pamięci. */
function wpisySladu(): Record<string, string[]> {
	const config = readFileSync(join(KORZEN, "next.config.ts"), "utf8");
	const blok = config.slice(
		config.indexOf("outputFileTracingIncludes"),
		config.indexOf("async headers()"),
	);
	const wpisy: Record<string, string[]> = {};
	for (const [, trasa, pliki] of blok.matchAll(/"([^"]+)":\s*\[([^\]]*)\]/g)) {
		wpisy[trasa] = [...pliki.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
	}
	return wpisy;
}

describe("ślad funkcji — trasy czytające nośnik treści", () => {
	it("każdy moduł wołający ładowarkę deklaruje, które trasy go wykonują", () => {
		const niezadeklarowane = konsumenciWKodzie().filter((p) => !(p in KONSUMENCI));
		expect(
			niezadeklarowane,
			"Moduł woła ładowarkę nośnika, ale nie deklaruje, które trasy go wykonują. " +
				"Dopisz go do KONSUMENCI (pusta lista = „nie czyta na ścieżce żądania”).",
		).toEqual([]);
	});

	it("każda zadeklarowana trasa ma wpis w outputFileTracingIncludes", () => {
		const wpisy = wpisySladu();
		const trasy = [...new Set(Object.values(KONSUMENCI).flat())].sort();
		const bezWpisu = trasy.filter((t) => !(t in wpisy));
		expect(
			bezWpisu,
			"Trasy czytające nośnik BEZ wpisu w outputFileTracingIncludes — na produkcji " +
				"padną z ENOENT, lokalnie zadziałają.",
		).toEqual([]);
	});

	it("wpis każdej takiej trasy wskazuje istniejący plik nośnika", () => {
		const wpisy = wpisySladu();
		const trasy = [...new Set(Object.values(KONSUMENCI).flat())];
		for (const trasa of trasy) {
			const pliki = wpisy[trasa] ?? [];
			const dokumenty = pliki.filter((p) => p.includes("/docs/"));
			expect(dokumenty.length, `Trasa ${trasa} nie wskazuje żadnego dokumentu`).toBeGreaterThan(0);
			for (const plik of dokumenty) {
				// Kontrola dwustronna: wpis wskazujący nieistniejący plik jest gorszy niż
				// jego brak — wygląda na domknięty, a nie wciąga niczego.
				expect(() => readFileSync(join(KORZEN, plik.replace(/^\.\//, "")), "utf8")).not.toThrow();
			}
		}
	});

	it("kontrola negatywna skanu: ładowarki naprawdę istnieją pod tymi nazwami", () => {
		// Gdyby skan przechodził dlatego, że ktoś przemianował ładowarki, ten test padnie.
		const zrodlo = readFileSync(join(SRC, "lib/tresc/dokumenty-pilotazu.ts"), "utf8");
		expect(zrodlo).toContain("export function wczytajZasadeDlaPracodawcy");
		expect(zrodlo).toContain("export function wczytajRegulaminPilotazu");
	});

	it("usuwanie komentarzy psuje się w stronę czerwoną, nie otwartą (wariant #317)", () => {
		// SONDA Z KONTROLĄ. Poprzedni wariant filtra uznawał `//` w środku napisu
		// („a//b") za początek komentarza i wycinał RESZTĘ LINII — druga kopia warunku
		// w takiej linii stawała się dla strażnika niewidzialna. To psucie w stronę
		// OTWARTĄ: bramka milczy, choć wada jest. Wariant Ethana wymaga białego znaku
		// przed `//`, więc taką linię ZOSTAWIA — najwyżej zgłosi coś nadmiarowo.
		expect(bezKomentarzy('const s = "a//b"; wczytajRegulaminPilotazu();')).toContain(
			"wczytajRegulaminPilotazu",
		);
		// A prawdziwy komentarz nadal znika (inaczej strażnik karałby za dokumentowanie).
		expect(bezKomentarzy("kod(); // wczytajRegulaminPilotazu w opisie")).not.toContain(
			"wczytajRegulaminPilotazu",
		);
		expect(bezKomentarzy("/* wczytajRegulaminPilotazu w bloku */ kod();")).not.toContain(
			"wczytajRegulaminPilotazu",
		);
	});
});
