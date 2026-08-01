// 1E.7 L6 · STRAŻNIK PARYTETU — trójka powodów dziury musi być identyczna po obu
// stronach granicy serwer ⟂ klient (znalezisko A z przeglądu Leo).
//
// ── PO CO TEN PLIK ISTNIEJE (czytasz go, bo się zapalił) ──────────────────────
// Ta sama reguła — „które powody wolno pokazać w bloku 2b" (§12.4) — żyje dziś
// w DWÓCH kopiach, bo scalenie ich w jedno źródło przenosi eksportowany typ i było
// za drogie przed zapłonem 1E.7:
//   • serwer: `src/lib/curriculum/placement-screen.ts` (POWODY_DZIURY + typ PlacementHoleReason)
//   • klient: `src/components/curriculum/placement-summary-vm.ts` (własna tablica + własny typ)
//
// Rozjazd tych list jest AWARIĄ BEZOBJAWOWĄ: reguła jest fail-closed, więc powód,
// którego druga strona nie zna, kasuje CAŁY blok 2b — student po prostu nie dostaje
// wyjaśnienia, dlaczego diagnoza zatrzymała się w tym miejscu. Nic się nie wywala,
// nic nie trafia do dziennika, żaden typ tego nie łapie (dwa niezależne literały).
//
// Ten test NIE jest refaktorem i celowo go nie zastępuje. Refaktor ma próg:
// **pierwsza zmiana `PlacementReason`** — patrz komentarz przy POWODY_DZIURY.
//
// ── DLACZEGO PRZEZ CZYTANIE ŹRÓDŁA, A NIE PRZEZ IMPORT ────────────────────────
// Tablica po stronie klienta jest prywatna dla modułu. Wyeksportowanie jej byłoby
// zmianą w pliku, którego ten strażnik ma NIE dotykać (całe ryzyko, którym
// uzasadniono odłożenie refaktoru, ma zostać nietknięte). Czytamy więc źródło —
// i jeśli kształt deklaracji się zmieni, ten test też się zapali. To jest cecha,
// nie usterka: każda zmiana w tym miejscu ma przejść przez czyjeś oczy.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POWODY_DZIURY } from "../placement-screen";

const KORZEN_REPO = join(__dirname, "..", "..", "..", "..");
const PLIK_KLIENTA = "src/components/curriculum/placement-summary-vm.ts";
const PLIK_SERWERA = "src/lib/curriculum/placement-screen.ts";

function zrodlo(wzgledna: string): string {
	return readFileSync(join(KORZEN_REPO, wzgledna), "utf8");
}

/** Wartości z literału tablicy `const POWODY_DZIURY = [...] as const;` po stronie klienta. */
function listaKlienta(): string[] {
	const m = zrodlo(PLIK_KLIENTA).match(/const POWODY_DZIURY = \[([^\]]*)\]/);
	if (!m) {
		throw new Error(
			`STRAŻNIK NIE ZNALAZŁ LISTY POWODÓW w ${PLIK_KLIENTA}. ` +
				"Deklaracja `const POWODY_DZIURY = [...]` zmieniła kształt albo zniknęła. " +
				"Jeśli scaliłeś obie kopie w jedno źródło (refaktor znaleziska A) — ten test " +
				"jest już zbędny i wolno go skasować RAZEM z drugą kopią, nie wcześniej.",
		);
	}
	return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/** Wartości z unii `export type PlacementHoleReason = "a" | "b";` po stronie serwera. */
function uniaSerwera(): string[] {
	const m = zrodlo(PLIK_SERWERA).match(/export type PlacementHoleReason =([^;]+);/);
	if (!m) throw new Error(`STRAŻNIK NIE ZNALAZŁ typu PlacementHoleReason w ${PLIK_SERWERA}.`);
	return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/** Komunikat, który ma wystarczyć komuś, kto nie zna historii tej decyzji. */
function instrukcja(gdzieBrakuje: string, plik: string, brakujace: string[]): string {
	return (
		`ROZJAZD LIST POWODÓW DZIURY (znalezisko A, §12.4).\n` +
		`Brakuje po stronie ${gdzieBrakuje}: ${brakujace.map((x) => `"${x}"`).join(", ")}.\n` +
		`CO ZROBIĆ: dopisz te wartości w ${plik} — ORAZ do typu PlacementHoleReason w tym samym pliku ` +
		`(po stronie klienta typ jest wyprowadzony z tablicy, po stronie serwera to osobna unia).\n` +
		`DLACZEGO TO WAŻNE: reguła jest fail-closed — powód, którego druga strona nie zna, ` +
		`kasuje CAŁY blok 2b i student nie dostaje wyjaśnienia. Nic się nie wywali i nic nie ` +
		`trafi do dziennika, więc rozjazd znika po cichu.\n` +
		`ALTERNATYWA (właściwa docelowo): scal obie kopie w jedno źródło, wzorem ` +
		`src/lib/curriculum/placement-title.ts. Próg tego refaktoru to dokładnie ta chwila — ` +
		`pierwsza zmiana PlacementReason.`
	);
}

describe("strażnik: powody dziury identyczne po obu stronach granicy", () => {
	it("serwer i klient mają DOKŁADNIE te same wartości", () => {
		// Porównujemy jako zwykłe napisy — obie strony to dziś DWA niezależne literały,
		// więc typ jednej z nich nie może być kryterium dla drugiej.
		const serwer: string[] = [...POWODY_DZIURY];
		serwer.sort();
		const klient = listaKlienta().sort();

		const brakUKlienta = serwer.filter((x) => !klient.includes(x));
		const brakUSerwera = klient.filter((x) => !serwer.includes(x));

		expect(brakUKlienta, instrukcja("KLIENTA", PLIK_KLIENTA, brakUKlienta)).toEqual([]);
		expect(brakUSerwera, instrukcja("SERWERA", PLIK_SERWERA, brakUSerwera)).toEqual([]);
		// Równość zbiorów nie wystarcza — pilnujemy też liczności (duplikat w literale
		// przeszedłby przez porównanie różnic i zostawił dwie listy różnej długości).
		expect(klient).toEqual(serwer);
	});

	it("po stronie serwera tablica i unia typu też się zgadzają", () => {
		// Trzecia możliwa droga rozjazdu, w całości wewnątrz jednego pliku: ktoś dopisuje
		// wartość do unii `PlacementHoleReason`, a zapomina o tablicy (albo odwrotnie) —
		// wtedy `jestPowodemDziury` przepuszcza inny zbiór, niż obiecuje typ.
		const tablica: string[] = [...POWODY_DZIURY];
		expect(tablica.sort()).toEqual(uniaSerwera().sort());
	});

	it("strażnik faktycznie czyta oba pliki (kontrola: listy są niepuste)", () => {
		// Bez tego test przechodziłby także wtedy, gdyby regexy nic nie znajdowały
		// i obie listy były puste — czyli zieleń z pustki, ta sama klasa błędu,
		// którą ten plik ma wykrywać.
		expect(POWODY_DZIURY.length).toBeGreaterThan(0);
		expect(listaKlienta().length).toBeGreaterThan(0);
		expect(uniaSerwera().length).toBeGreaterThan(0);
	});
});
