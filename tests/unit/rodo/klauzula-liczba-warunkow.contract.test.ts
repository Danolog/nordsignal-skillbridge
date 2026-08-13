import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * STRAŻNIK: liczba warunków wejścia w życie ma DOKŁADNIE JEDEN NOŚNIK — tabelę Z-2.
 *
 * ── Dlaczego ten strażnik istnieje ─────────────────────────────────────────
 * Nagłówek sekcji Z-2 mówił „Warunki wejścia w życie — **cztery**", a tabela
 * miała **pięć** wierszy (`W-1`…`W-5`). Rozjazd żył przez dwie tury i przeszedł
 * przez recenzję, która sama napisała „pięcioma warunkami", nie zauważając, że
 * dokument mówi co innego.
 *
 * Skutek jest dokładnie tym, przed czym broni cały pakiet RODO: ktoś liczy
 * warunki z nagłówka zamiast z tabeli, **zapala klauzulę bez `W-5`** i robi to
 * w przekonaniu, że spełnił komplet — bo dokument sam mu tak powiedział.
 * A to jedyny dokument pakietu **pokazywany poza firmą**.
 *
 * ── Dlaczego zakaz liczby, a nie jej pilnowanie ────────────────────────────
 * Można było porównywać liczbę z nagłówka z liczbą wierszy tabeli. Odrzucone:
 * to utrwala DWA nośniki i każe im się zgadzać. Tańsze i trwalsze jest usunięcie
 * drugiego nośnika — nagłówek **woła** tabelę zamiast ją **powtarzać**. Wtedy
 * dołożenie `W-6` nie wymaga niczego poza dopisaniem wiersza.
 *
 * To rozstrzygnięcie jest ŚWIADOMIE INNE niż przy okresach retencji w tym samym
 * dokumencie. Tam drugi nośnik ZOSTAJE (z progiem i strażnikiem), bo art. 13
 * ust. 2 lit. a **wymaga** podania okresów wprost studentowi — nie wolno odesłać
 * go do rejestru wewnętrznego. Liczby warunków wejścia w życie **nie wymaga
 * nic**: to aparat wewnętrzny (CZĘŚĆ II), którego student nigdy nie zobaczy.
 * Powtórzenie bez wymogu prawnego jest długiem, nie decyzją.
 *
 * ── Zakres ────────────────────────────────────────────────────────────────
 * Pilnujemy CZĘŚCI II (aparat wewnętrzny). Nie ruszamy liczb w CZĘŚCI I, która
 * idzie do studenta słowo w słowo i rządzi się wymogami art. 13.
 */

const REPO = resolve(__dirname, "../../..");
const KLAUZULA = join(REPO, "docs/legal/klauzula-informacyjna-art13.md");

/** Liczebniki, którymi realnie pisze się w tym repo (słownie i cyfrą). */
const LICZEBNIKI_SLOWNIE = [
	"jeden",
	"jedno",
	"dwa",
	"dwie",
	"dwóch",
	"trzy",
	"trzech",
	"cztery",
	"czterech",
	"czterema",
	"pięć",
	"pięciu",
	"pięcioma",
	"sześć",
	"sześciu",
	"siedem",
	"osiem",
].join("|");

const LICZEBNIK_SLOWNIE = new RegExp(
	`(?<![a-ząćęłńóśźż])(?:${LICZEBNIKI_SLOWNIE})(?![a-ząćęłńóśźż])`,
	"i",
);
/** Cyfra POSTAWIONA PRZY rzeczowniku („5 warunków", „warunki: 5"). */
const CYFRA_PRZY_WARUNKACH = /(?:\b\d+\s+\**warunk|warunk[a-ząćęłńóśźż]*\s*[—:-]\s*\**\d+\b)/i;

/** Czy linia niesie liczbę? (słownie gdziekolwiek, cyfrą tylko przy rzeczowniku) */
function niesieLiczbe(linia: string): boolean {
	const bezOznaczen = linia.replace(/\bW-\d+/g, "").replace(/\bZ-\d+/g, "");
	return LICZEBNIK_SLOWNIE.test(bezOznaczen) || CYFRA_PRZY_WARUNKACH.test(bezOznaczen);
}

/**
 * ZAKRES — dwie reguły, obie wąskie, żeby strażnik nie stał się szumem.
 *
 * (A) CAŁY dokument: zdanie mówiące o „warunkach WEJŚCIA W ŻYCIE" nie może
 *     nieść liczby. To łapie oba realne wystąpienia rozjazdu: nagłówek Z-2
 *     („Warunki wejścia w życie — cztery") i zdanie w self-critique Z-6
 *     („ustawia cztery warunki wejścia w życie").
 * (B) WEWNĄTRZ sekcji Z-2: liczba przy „warunku" w ogóle, bo tu każdy licznik
 *     czyta się jako licznik tabeli.
 *
 * Świadomie NIE pilnujemy liczebników przy innych rzeczownikach (przesłanki,
 * nośniki, mutacje). Pierwsza wersja tego strażnika była szersza i dała dwa
 * fałszywe alarmy na zdaniach, które liczyły co innego — a strażnik, który
 * krzyczy na poprawny tekst, zostaje wyciszony i przestaje bronić czegokolwiek.
 */
const O_WEJSCIU_W_ZYCIE =
	/warunk[a-ząćęłńóśźż]*[^.]{0,40}wejścia w życie|wejścia w życie[^.]{0,40}warunk/i;

function sekcjaZ2(linie: string[]): number[] {
	const start = linie.findIndex((l) => /^###\s+Z-2\./.test(l));
	if (start === -1) return [];
	let koniec = linie.findIndex((l, i) => i > start && /^###\s/.test(l));
	if (koniec === -1) koniec = linie.length;
	return Array.from({ length: koniec - start }, (_, i) => start + i);
}

function tresc(): string {
	return readFileSync(KLAUZULA, "utf8");
}

describe("klauzula art. 13 — liczba warunków ma jeden nośnik", () => {
	it("tabela Z-2 jest niepusta (kontrola dodatnia — jest co liczyć)", () => {
		const wiersze = tresc()
			.split("\n")
			.filter((l) => /^\|\s*\*\*W-\d+\*\*/.test(l));
		expect(wiersze.length).toBeGreaterThan(0);
	});

	it("żadne zdanie o warunkach WEJŚCIA W ŻYCIE nie niesie liczby (reguła A)", () => {
		const winne = tresc()
			.split("\n")
			.map((linia, i) => ({ nr: i + 1, linia }))
			.filter(({ linia }) => !/^\|\s*\*\*W-\d+\*\*/.test(linia))
			.filter(({ linia }) => O_WEJSCIU_W_ZYCIE.test(linia) && niesieLiczbe(linia))
			.map(({ nr, linia }) => `${nr}: ${linia.trim().slice(0, 110)}`);

		expect(
			winne,
			"Liczba warunków wejścia w życie postawiona w prozie jest DRUGIM NOŚNIKIEM i rozjedzie " +
				"się z tabelą Z-2 — już to zrobiła (nagłówek mówił 'cztery', tabela miała pięć wierszy). " +
				"Nośnikiem jest tabela. W prozie pisz 'wszystkie warunki z Z-2', nie liczbę.",
		).toEqual([]);
	});

	it("wewnątrz sekcji Z-2 nie ma liczby przy warunkach (reguła B)", () => {
		const linie = tresc().split("\n");
		const winne = sekcjaZ2(linie)
			.filter((i) => !/^\|\s*\*\*W-\d+\*\*/.test(linie[i]))
			.filter((i) => /warunk/i.test(linie[i]) && niesieLiczbe(linie[i]))
			.map((i) => `${i + 1}: ${linie[i].trim().slice(0, 110)}`);

		expect(winne, "W sekcji Z-2 każdy licznik czyta się jako licznik tabeli.").toEqual([]);
	});

	it("sekcja Z-2 w ogóle została znaleziona (kontrola dodatnia strażnika)", () => {
		// Bez tego reguła B przechodzi pusto, gdyby ktoś przemianował sekcję.
		expect(sekcjaZ2(tresc().split("\n")).length).toBeGreaterThan(0);
	});
});
