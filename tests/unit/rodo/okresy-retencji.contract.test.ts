/**
 * STRAŻNIK OKRESÓW PRZECHOWYWANIA — trzy nośniki, jedna liczba.
 *
 * Geneza: warunek W-B Leo (Tech Lead) przy zgłoszeniu #290, 2026-08-12. W wersji
 * v0.3 rejestru retencji napisałem, że strażnika zgodności okresów nie ma, i nazwałem
 * to „niepotwierdzonym". Leo zakwestionował nie decyzję, lecz sposób użycia reguły:
 * CLAUDE.md v1.17 rezerwuje ścieżkę „niepotwierdzony" dla przypadków, w których dowód
 * jest FIZYCZNIE NIEWYKONALNY (regułę pilnuje typ albo kompilator). Tutaj dowód był
 * jednym testem bez bazy — etykieta uczciwa, ale użyta szerzej, niż reguła pozwala.
 * Ten plik jest odpowiedzią. (Ryan, CRCO)
 *
 * ── DLACZEGO W OGÓLE SĄ TRZY KOPIE TEJ SAMEJ LICZBY ──────────────────────────
 * Nie z niechlujstwa — z przepisu. Okres przechowywania USTALA SIĘ w jednym miejscu
 * (`docs/data/retention.md`), ale RODO każe go POWTÓRZYĆ w dwóch innych:
 *   • `docs/data/ropa.md` — rejestr czynności przetwarzania; art. 30 ust. 1 lit. f
 *     wymaga podania planowanych terminów usunięcia;
 *   • `docs/legal/klauzula-informacyjna-art13.md` sekcja 7 — art. 13 ust. 2 lit. a
 *     wymaga podania okresu OSOBIE; nie wolno odesłać jej do rejestru wewnętrznego.
 * To jest „świadomy drugi nośnik" z CLAUDE.md v1.17 — dopuszczalny wyłącznie z progiem
 * ORAZ strażnikiem. Próg jest w nagłówku `retention.md`. Strażnikiem jest ten plik.
 *
 * ── JAK DZIAŁA ───────────────────────────────────────────────────────────────
 * Każdy wiersz o retencji w każdym z trzech dokumentów niesie klucz maszynowy
 * w komentarzu HTML: `<!-- retencja:review_logs -->` (niewidoczny dla czytelnika,
 * także dla studenta czytającego klauzulę). Test:
 *   1. wyciąga okres z każdego nośnika i sprowadza go do postaci kanonicznej;
 *   2. porównuje postacie kanoniczne klucz po kluczu;
 *   3. sprawdza KOMPLETNOŚĆ — brak klucza jest błędem, nie ciszą.
 * Sprowadzanie do postaci kanonicznej jest CELOWO wąskie i zamknięte: nieznane
 * sformułowanie okresu = test czerwony. Wolę fałszywy alarm przy przeredagowaniu
 * zdania niż milczenie przy zmianie liczby (awaria „mechanizm melduje w porządku,
 * nie sprawdzając tego, co miał sprawdzać" — rodzina awarii z CLAUDE.md v1.17).
 *
 * Porównywane są TRZY wymiary, nie sam okres — bo rozjazd potrafi siedzieć obok liczby:
 *   • `okres`     — 12m / konto / zgoda / bezterminowo;
 *   • `perRekord` — czy zegar biegnie osobno dla każdego wpisu, czy od jednej daty
 *                   (różnica „12 miesięcy od każdej oceny" vs „12 miesięcy od sesji");
 *   • `przeglad`  — czy okres niesie zastrzeżenie o przeglądzie (pilotaż).
 *
 * ── CZEGO TEN STRAŻNIK NIE WIDZI (jawne granice, nie przeoczenie) ────────────
 *   • Rejestr czynności (`ropa.md`) opisuje CZYNNOŚCI, nie tabele, i nie ma wpisu
 *     dla każdego wiersza rejestru retencji. Dlatego po jego stronie sprawdzam
 *     ZAWIERANIE (każdy zadeklarowany klucz musi się zgadzać), a nie równość zbiorów.
 *     Zamykam to od drugiej strony: KAŻDY akapit `**Retencja` w `ropa.md` musi mieć
 *     klucz — dopisanie akapitu bez klucza czerwieni test.
 *   • Akapit `ropa.md` bywa zbiorczy (jeden akapit, dwie tabele: `review_logs`
 *     + `review_states`). Sprawdzam wtedy OBECNOŚĆ obu okresów w akapicie, więc
 *     zamiana ich miejscami wewnątrz jednego akapitu przejdzie. Znana, nazwana luka
 *     — koszt jej domknięcia (rozbicie akapitu) przewyższa dziś zysk.
 *   • Test mierzy REPOZYTORIUM, nie to, co widzi student na produkcji. Zgodność
 *     wdrożonej strony z tym plikiem gwarantuje osobna bramka, nie ten test.
 *   • Test nie ocenia, czy okres jest ZGODNY Z PRAWEM. Pilnuje, żeby trzy dokumenty
 *     mówiły to samo. Ocena prawna to Wendy (Legal), Faza 3.
 *
 * ── DOWÓD, ŻE STRAŻNIK STRZEŻE (CLAUDE.md v1.17 — mutacja, nie zielona suita) ─
 * Cztery mutacje, każda po jednym nośniku i po jednym rodzaju wady. Wszystkie
 * wykonane 2026-08-12, wszystkie cofnięte. Cytowane wyjścia są dosłowne.
 *
 * M1 — rozjazd liczby po stronie tekstu dla studenta.
 *   Zmiana: `klauzula-informacyjna-art13.md` sekcja 7, `review_logs`
 *           „**12 miesięcy**" → „**6 miesięcy**".
 *   Padł: „okres zgodny we wszystkich nośnikach — rejestr retencji ↔ klauzula".
 *   Komunikat: „review_logs: klauzula mówi 6m, rejestr retencji 12m".
 *
 * M2 — pozycja wypada z tego, co pokazujemy studentowi.
 *   Zmiana: usunięty klucz `<!-- retencja:audit_log -->` z sekcji 7 klauzuli.
 *   Padł: „klauzula z art. 13 pokrywa DOKŁADNIE te same pozycje co rejestr retencji".
 *   Komunikat: „Rejestr retencji ma pozycje, których klauzula NIE POKAZUJE
 *   studentowi: audit_log. Art. 13 ust. 2 lit. a — okres podaje się osobie".
 *
 * M3 — rozjazd po stronie rejestru czynności (art. 30).
 *   Zmiana: `ropa.md` wpis #3, `review_logs` „12 miesięcy" → „24 miesiące".
 *   Padł: „okres zgodny we wszystkich nośnikach — rejestr retencji ↔ rejestr czynności".
 *   Komunikat: „review_logs: rejestr czynności nie niesie okresu 12m".
 *
 * M4 — zmiana w ŹRÓDLE bez przeniesienia jej dalej (scenariusz najbardziej realny;
 *      to jest dokładnie ta awaria, której próg z nagłówka `retention.md` zakazuje).
 *   Zmiana: `retention.md`, wiersz `hints_at` „**12 miesięcy**" → „**6 miesięcy**".
 *   Padł: „…rejestr retencji ↔ klauzula".
 *   Komunikat: „hints_at: klauzula mówi 12m, rejestr retencji 6m".
 *
 * Kontrola dwustronna: na drzewie bez mutacji „Tests 8 passed (8)" — strażnik
 * czerwieni się na błędzie ORAZ milczy na poprawnym stanie. Cztery testy
 * normalizatora niżej to druga kontrola dwustronna: dowodzą, że rozróżnia 12 od 6
 * i że na nieznanym sformułowaniu rzuca błędem, zamiast po cichu przepuścić.
 * Pełne wyjścia komend — w odpowiedzi Leo na zgłoszeniu #290.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REJESTR_RETENCJI = join(process.cwd(), "docs", "data", "retention.md");
const REJESTR_CZYNNOSCI = join(process.cwd(), "docs", "data", "ropa.md");
const KLAUZULA = join(process.cwd(), "docs", "legal", "klauzula-informacyjna-art13.md");

/**
 * Znacznik akapitu, który okresu NIE niesie, tylko odsyła do rejestru retencji
 * (np. wpis #8 — dane u dostawcy modelu). Nie jest furtką: akapit tak oznaczony
 * musi być POZBAWIONY okresu, a strażnik to sprawdza.
 */
const ODSYLACZ = "odsyla";

/** Postać kanoniczna okresu — zamknięty zbiór. Nieznane sformułowanie = błąd. */
type Okres = "12m" | "6m" | "24m" | "konto" | "zgoda" | "bezterminowo";

type Postac = {
	okres: Okres;
	/** Zegar biegnie osobno dla każdego wpisu (a nie od jednej daty). */
	perRekord: boolean;
	/** Okres niesie zastrzeżenie o przeglądzie (np. przy zamknięciu kohorty). */
	przeglad: boolean;
};

/**
 * Sprowadza ludzki opis okresu do postaci kanonicznej.
 * CELOWO wąskie: rzuca wyjątkiem na czymkolwiek nierozpoznanym. Cichy fallback
 * zrobiłby z tego testu atrapę — dokładnie to, czego zakazuje CLAUDE.md v1.17.
 */
export function naPostacKanoniczna(tekst: string, gdzie: string): Postac {
	const t = tekst.toLowerCase().replace(/\s+/g, " ");

	const miesiace = [...t.matchAll(/(\d{1,2})\s*(?:miesięcy|miesiące|miesiecy|m-cy)\b/g)].map((m) =>
		Number(m[1]),
	);
	const unikalne = [...new Set(miesiace)];

	let okres: Okres | null = null;
	if (unikalne.length > 1) {
		throw new Error(
			`[${gdzie}] Dwa różne okresy miesięczne w jednym opisie (${unikalne.join(", ")}). ` +
				`Strażnik nie zgaduje, który obowiązuje — rozbij opis albo popraw liczbę.`,
		);
	}
	if (unikalne.length === 1) {
		const n = unikalne[0];
		if (n !== 6 && n !== 12 && n !== 24) {
			throw new Error(
				`[${gdzie}] Okres ${n} miesięcy nie ma postaci kanonicznej. Dopisz go do typu ` +
					`Okres w tym teście ŚWIADOMIE — a nie przy okazji zmiany dokumentu.`,
			);
		}
		okres = `${n}m` as Okres;
	} else if (/bezterminowo|bezterminowa/.test(t)) {
		okres = "bezterminowo";
	} else if (/usunięcia konta|trwania konta|usuniecia konta/.test(t)) {
		okres = "konto";
	} else if (/cofnięcia zgody|odwołania zgody|cofniecia zgody|odwolania zgody/.test(t)) {
		okres = "zgoda";
	}

	if (okres === null) {
		throw new Error(
			`[${gdzie}] Nie rozpoznaję okresu w: „${tekst.trim().slice(0, 160)}". ` +
				`Strażnik jest celowo wąski — albo przepisz opis jednym z uznanych sformułowań, ` +
				`albo świadomie rozszerz naPostacKanoniczna(). Cisza tu nie jest opcją.`,
		);
	}

	return {
		okres,
		perRekord: /\bosobno\b/.test(t),
		przeglad: /przegląd|przeglad/.test(t),
	};
}

/** Wiersz tabeli markdown z kluczem `<!-- retencja:KLUCZ -->` w pierwszej komórce. */
function wierszeZKluczem(tresc: string): Map<string, string[]> {
	const wynik = new Map<string, string[]>();
	for (const linia of tresc.split("\n")) {
		if (!linia.startsWith("|")) continue;
		const dopasowanie = linia.match(/<!--\s*retencja:([a-z_]+)\s*-->/);
		if (!dopasowanie) continue;
		const klucz = dopasowanie[1];
		if (wynik.has(klucz)) {
			throw new Error(`Klucz retencja:${klucz} występuje w tym dokumencie dwa razy.`);
		}
		const komorki = linia
			.split("|")
			.slice(1, -1)
			.map((c) => c.trim());
		wynik.set(klucz, komorki);
	}
	return wynik;
}

/** Akapity `**Retencja…` z rejestru czynności wraz z zadeklarowanymi kluczami. */
function akapityRetencjiRoPA(tresc: string): { klucze: string[]; tekst: string }[] {
	const linie = tresc.split("\n");
	const wynik: { klucze: string[]; tekst: string }[] = [];
	const bezKlucza: number[] = [];

	for (let i = 0; i < linie.length; i++) {
		if (!linie[i].startsWith("**Retencja")) continue;

		const poprzednia = i > 0 ? linie[i - 1] : "";
		const dopasowanie = poprzednia.match(/<!--\s*retencja:\s*([a-z_,\s]+?)\s*-->/);
		if (!dopasowanie) {
			bezKlucza.push(i + 1);
			continue;
		}

		// Akapit = od nagłówka do pierwszej pustej linii kończącej blok.
		const kawalki: string[] = [];
		for (let j = i; j < linie.length; j++) {
			if (linie[j].trim() === "" && kawalki.length > 0) break;
			kawalki.push(linie[j]);
		}
		wynik.push({
			klucze: dopasowanie[1].split(",").map((k) => k.trim()),
			tekst: kawalki.join(" "),
		});
	}

	if (bezKlucza.length > 0) {
		throw new Error(
			`Akapit o retencji bez klucza <!-- retencja:… --> w ropa.md, linie: ${bezKlucza.join(", ")}. ` +
				`Rejestr czynności powtarza okres z mocy art. 30 ust. 1 lit. f — każdy taki akapit ` +
				`musi być objęty strażnikiem, inaczej rozjazd przechodzi po cichu.`,
		);
	}
	return wynik;
}

describe("okresy-retencji · strażnik trzech nośników (CLAUDE.md v1.17)", () => {
	const rejestr = wierszeZKluczem(readFileSync(REJESTR_RETENCJI, "utf8"));
	const klauzula = wierszeZKluczem(readFileSync(KLAUZULA, "utf8"));
	const ropa = akapityRetencjiRoPA(readFileSync(REJESTR_CZYNNOSCI, "utf8"));

	/** Kolumna „Okres" + „Od kiedy liczony" w rejestrze retencji. */
	const postacRejestru = (klucz: string): Postac => {
		const k = rejestr.get(klucz);
		if (!k) throw new Error(`Brak klucza ${klucz} w rejestrze retencji.`);
		return naPostacKanoniczna(`${k[2]} ${k[3]}`, `retention.md:${klucz}`);
	};

	/** Kolumna „Jak długo" + „Liczone od" w sekcji 7 klauzuli. */
	const postacKlauzuli = (klucz: string): Postac => {
		const k = klauzula.get(klucz);
		if (!k) throw new Error(`Brak klucza ${klucz} w sekcji 7 klauzuli.`);
		return naPostacKanoniczna(`${k[1]} ${k[2]}`, `klauzula§7:${klucz}`);
	};

	it("rejestr retencji w ogóle ma wiersze z kluczem (test nie jest atrapą)", () => {
		expect(rejestr.size).toBeGreaterThan(0);
		expect(klauzula.size).toBeGreaterThan(0);
		expect(ropa.length).toBeGreaterThan(0);
	});

	it("klauzula z art. 13 pokrywa DOKŁADNIE te same pozycje co rejestr retencji", () => {
		const wRejestrze = [...rejestr.keys()].sort();
		const wKlauzuli = [...klauzula.keys()].sort();

		const brakujeWKlauzuli = wRejestrze.filter((k) => !klauzula.has(k));
		const nadmiarWKlauzuli = wKlauzuli.filter((k) => !rejestr.has(k));

		expect(
			brakujeWKlauzuli,
			`Rejestr retencji ma pozycje, których klauzula NIE POKAZUJE studentowi: ` +
				`${brakujeWKlauzuli.join(", ")}. Art. 13 ust. 2 lit. a — okres podaje się osobie.`,
		).toEqual([]);
		expect(
			nadmiarWKlauzuli,
			`Klauzula obiecuje studentowi okres dla pozycji spoza rejestru retencji: ` +
				`${nadmiarWKlauzuli.join(", ")}. Okres ustala się w retention.md, nie w klauzuli.`,
		).toEqual([]);
	});

	it("okres zgodny we wszystkich nośnikach — rejestr retencji ↔ klauzula", () => {
		const rozjazdy: string[] = [];
		for (const klucz of rejestr.keys()) {
			if (!klauzula.has(klucz)) continue; // pokrycie sprawdza test wyżej
			const a = postacRejestru(klucz);
			const b = postacKlauzuli(klucz);
			if (a.okres !== b.okres) {
				rozjazdy.push(`${klucz}: klauzula mówi ${b.okres}, rejestr retencji ${a.okres}`);
			}
			if (a.perRekord !== b.perRekord) {
				rozjazdy.push(`${klucz}: zegar per wpis — rejestr ${a.perRekord}, klauzula ${b.perRekord}`);
			}
			if (a.przeglad !== b.przeglad) {
				rozjazdy.push(
					`${klucz}: zastrzeżenie o przeglądzie — rejestr ${a.przeglad}, klauzula ${b.przeglad}`,
				);
			}
		}
		expect(
			rozjazdy,
			`Rozjazd okresów między rejestrem a tym, co mówimy studentowi:\n  ${rozjazdy.join("\n  ")}\n` +
				`Próg z nagłówka retention.md: zmiana okresu jest NIEDOMKNIĘTA, dopóki nie trafi ` +
				`do wszystkich nośników.`,
		).toEqual([]);
	});

	it("okres zgodny we wszystkich nośnikach — rejestr retencji ↔ rejestr czynności", () => {
		const rozjazdy: string[] = [];
		for (const akapit of ropa) {
			// Akapit zadeklarowany jako czysty odsyłacz: nie wolno mu nieść okresu.
			// Kontrola dwustronna — gdyby ktoś dopisał tu liczbę, strażnik się czerwieni.
			if (akapit.klucze.length === 1 && akapit.klucze[0] === ODSYLACZ) {
				let niesieOkres = true;
				try {
					naPostacKanoniczna(akapit.tekst, "ropa.md:odsylacz");
				} catch {
					niesieOkres = false;
				}
				if (niesieOkres) {
					rozjazdy.push(
						`akapit oznaczony „${ODSYLACZ}" jednak niesie okres — albo zdejmij liczbę, ` +
							`albo zadeklaruj klucze pozycji, których dotyczy`,
					);
				}
				continue;
			}
			for (const klucz of akapit.klucze) {
				if (klucz === ODSYLACZ) {
					rozjazdy.push(`„${ODSYLACZ}" nie łączy się z innymi kluczami w jednym akapicie`);
					continue;
				}
				if (!rejestr.has(klucz)) {
					rozjazdy.push(`${klucz}: ropa.md deklaruje klucz, którego nie ma w retention.md`);
					continue;
				}
				const oczekiwany = postacRejestru(klucz).okres;
				const wAkapicie = naPostacKanoniczna(akapit.tekst, `ropa.md:${klucz}`);
				// Akapit bywa zbiorczy (dwie tabele), więc sprawdzam OBECNOŚĆ okresu,
				// nie równość — granica opisana w nagłówku pliku.
				const obecny = wAkapicie.okres === oczekiwany || pasujeWTekscie(akapit.tekst, oczekiwany);
				if (!obecny) {
					rozjazdy.push(
						`${klucz}: rejestr czynności nie niesie okresu ${oczekiwany} ` +
							`(art. 30 ust. 1 lit. f wymaga tam terminu usunięcia)`,
					);
				}
			}
		}
		expect(
			rozjazdy,
			`Rozjazd okresów między rejestrem retencji a rejestrem czynności:\n  ${rozjazdy.join("\n  ")}`,
		).toEqual([]);
	});
});

/** Czy w tekście akapitu w ogóle pada dany okres (dla akapitów zbiorczych). */
function pasujeWTekscie(tekst: string, okres: Okres): boolean {
	const t = tekst.toLowerCase();
	switch (okres) {
		case "6m":
			return /\b6\s*(?:miesięcy|miesiące|m-cy)/.test(t);
		case "12m":
			return /\b12\s*(?:miesięcy|miesiące|m-cy)/.test(t);
		case "24m":
			return /\b24\s*(?:miesięcy|miesiące|m-cy)/.test(t);
		case "konto":
			return /usunięcia konta|trwania konta/.test(t);
		case "zgoda":
			return /cofnięcia zgody|odwołania zgody/.test(t);
		case "bezterminowo":
			return /bezterminowo|bezterminowa/.test(t);
	}
}

describe("okresy-retencji · sam normalizator (kontrola dwustronna)", () => {
	it("rozróżnia 12 od 6 miesięcy — inaczej cały strażnik byłby atrapą", () => {
		expect(naPostacKanoniczna("**12 miesięcy**", "t").okres).toBe("12m");
		expect(naPostacKanoniczna("**6 miesięcy**", "t").okres).toBe("6m");
	});

	it("czerwieni się na sformułowaniu, którego nie zna (cisza nie jest opcją)", () => {
		expect(() => naPostacKanoniczna("dopóki nie znudzi nam się trzymać", "t")).toThrow(
			/Nie rozpoznaję okresu/,
		);
	});

	it("odmawia zgadywania, gdy w jednym opisie stoją dwa różne okresy", () => {
		expect(() => naPostacKanoniczna("12 miesięcy, a potem 24 miesiące", "t")).toThrow(
			/Dwa różne okresy/,
		);
	});

	it("widzi wymiary poza samą liczbą: zegar per wpis i zastrzeżenie o przeglądzie", () => {
		expect(naPostacKanoniczna("12 miesięcy | data każdej oceny osobno", "t").perRekord).toBe(true);
		expect(
			naPostacKanoniczna("12 miesięcy | prawomocne rozstrzygnięcie sesji", "t").perRekord,
		).toBe(false);
		expect(
			naPostacKanoniczna("do czasu usunięcia konta, z przeglądem przy zamknięciu grupy", "t")
				.przeglad,
		).toBe(true);
	});
});
