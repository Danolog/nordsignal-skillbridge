/**
 * ADR-016 D3 — przepisanie wyniku sondy Colab do deklaracji środowiska.
 *
 * PO CO NARZĘDZIE, A NIE RĘCZNA EDYCJA JSON-a: flaga `rozjazd` jest tym, co
 * zamyka bramkę publikacji (D4). Gdyby ustawiał ją człowiek „na oko" po
 * przeczytaniu wydruku, bramka byłaby tak dobra jak czyjaś uważność o 23:00.
 * Tu `rozjazd` WYLICZA SIĘ z pomiaru: Colab zszedł z pinu ALBO cytat przestał
 * się zgadzać ALBO kontrakt API BDL się zmienił ⇒ true. Człowiek dostarcza
 * pomiar, maszyna wyciąga wniosek, Ethan podejmuje decyzję.
 *
 * Dwa bezpieczniki, bez których to narzędzie byłoby teatrem:
 *  1. wynik spoza sesji Colab jest ODRZUCANY (`sprawdzPochodzenie`) — przebieg
 *     na laptopie mierzy nasze środowisko, nie środowisko studenta;
 *  2. werdykt „zgodny" z notebooka jest PRZELICZANY w repo z surowego pomiaru
 *     (`ocenSonde`) — bramka nie opiera się na arytmetyce cudzej kopii kodu.
 *
 * Użycie:
 *   pnpm srodowisko:zapisz-sonde docs/curation/sondy/sonda-srodowiska-20260722.txt
 *
 * Plik wejściowy = wklejone wyjście sondy; narzędzie wyjmuje z niego blok
 * `--- WYNIK MASZYNOWY (JSON) ---`.
 */

import { readFileSync } from "node:fs";
import { CYTATY_SILNIKOW, cytatSpelniony } from "./content/notebooks/cytaty-silnikow";
import {
	czytajSrodowisko,
	pinPasuje,
	SRODOWISKO_PATH,
	type Srodowisko,
	zakresPasuje,
	zapiszSrodowisko,
} from "./srodowisko-colab";

export type WynikSondy = {
	data: string;
	/** Gdzie sonda biegła. Brak pola = wynik ze starej wersji notebooka. */
	srodowisko?: { colab?: boolean; colab_release_tag?: string | null; platforma?: string };
	wersje: Record<string, string>;
	cytaty: { id: string; cytat: string; faktyczny: string; zgodny: boolean }[];
	rozjazd_cytatow: number;
	bdl: { osiagalne: boolean; rozjazdy?: { pole: string }[]; blad?: string };
};

/**
 * Sonda ma wartość WYŁĄCZNIE uruchomiona w Colabie. Przebieg na laptopie mierzy
 * NASZE środowisko — wpisany do deklaracji otworzyłby bramkę publikacji na 100
 * dni na podstawie liczby, której nikt nie zmierzył tam, gdzie trzeba. To jest
 * dokładnie ta klasa cichej awarii, którą ADR-016 zwalcza, więc odmawiamy.
 */
export function sprawdzPochodzenie(wynik: WynikSondy): void {
	if (wynik.srodowisko?.colab === true) return;
	const gdzie = wynik.srodowisko?.platforma ?? "nieznana platforma";
	throw new Error(
		"Ten wynik NIE pochodzi z sesji Colab " +
			`(srodowisko.colab = ${JSON.stringify(wynik.srodowisko?.colab)}, ${gdzie}).\n` +
			"Sonda uruchomiona lokalnie jest podglądem, nie pomiarem środowiska studenta —\n" +
			"deklaracji nie aktualizujemy. Uruchom notebooks/sonda/sonda-srodowiska.ipynb\n" +
			"w Colabie: docs/runbooks/sonda-srodowiska-colab.md",
	);
}

export function wyjmijWynik(tekst: string): WynikSondy {
	const znacznik = "--- WYNIK MASZYNOWY (JSON) ---";
	const idx = tekst.indexOf(znacznik);
	if (idx < 0) {
		throw new Error(
			`W pliku nie ma bloku „${znacznik}". Wklej CAŁE wyjście ostatniej komórki sondy.`,
		);
	}
	const reszta = tekst.slice(idx + znacznik.length);
	const start = reszta.indexOf("{");
	if (start < 0) throw new Error("Blok wyniku maszynowego jest pusty.");
	return JSON.parse(reszta.slice(start)) as WynikSondy;
}

export type OcenaSondy = {
	/** Cytaty, które nie zgadzają się z tym, co silnik Colaba naprawdę oddał. */
	rozjazdy: { id: string; cytat: string; faktyczny: string }[];
	/**
	 * Miejsca, w których werdykt POLICZONY W REPO różni się od werdyktu wpisanego
	 * przez sondę. Oznacza rozjazd dwóch implementacji dopasowania (Python
	 * w notebooku vs TS w repo) — sam w sobie jest defektem do zgłoszenia.
	 */
	niezgodnosciWerdyktu: string[];
	/** Cytaty z sondy, których nie ma w dzisiejszej tablicy (stara sonda). */
	nieznane: string[];
	/**
	 * Colab zszedł z naszego pinu (albo z zakresu Pythona). To JEST „rozjazd"
	 * w rozumieniu ADR-016 D4 — nawet gdy wszystkie cytaty jeszcze się zgadzają:
	 * decyzja „idziemy za Colabem czy zostajemy" należy do Ethana, nie do skryptu.
	 */
	rozjazdWersji: string[];
};

/**
 * Werdykt liczymy TU, z surowego `faktyczny`, kanoniczną funkcją `cytatSpelniony`
 * — a nie ufamy polu `zgodny` wpisanemu przez sondę. Sonda ma własną, prostszą
 * implementację dopasowania (musi być samowystarczalna w Colabie); gdyby obie
 * się rozjechały, bramka publikacji opierałaby się na cudzej arytmetyce.
 */
export function ocenSonde(
	wynik: WynikSondy,
	srodowisko: Srodowisko = czytajSrodowisko(),
): OcenaSondy {
	const poId = new Map(CYTATY_SILNIKOW.map((w) => [w.id, w]));
	const ocena: OcenaSondy = {
		rozjazdy: [],
		niezgodnosciWerdyktu: [],
		nieznane: [],
		rozjazdWersji: [],
	};
	for (const [nazwa, pakiet] of Object.entries(srodowisko.pakiety)) {
		const zmierzona = wynik.wersje[nazwa];
		if (!zmierzona) continue;
		if (zmierzona.startsWith("BRAK")) {
			ocena.rozjazdWersji.push(`${nazwa}: w Colabie NIE MA tego pakietu (${zmierzona})`);
			continue;
		}
		if (typeof pakiet.pin === "string" && !pinPasuje(pakiet.pin, zmierzona)) {
			ocena.rozjazdWersji.push(`${nazwa}: pin ${pakiet.pin}, Colab ma ${zmierzona}`);
		}
		if (typeof pakiet.zakres === "string" && !zakresPasuje(pakiet.zakres, zmierzona)) {
			ocena.rozjazdWersji.push(`${nazwa}: zakres ${pakiet.zakres}, Colab ma ${zmierzona}`);
		}
	}
	for (const c of wynik.cytaty) {
		const wiersz = poId.get(c.id);
		if (!wiersz) {
			ocena.nieznane.push(`${c.id} (${c.cytat})`);
			continue;
		}
		const zgodny = cytatSpelniony(c.faktyczny, wiersz.cytat, wiersz.dopasowanie ?? "prefiks");
		if (!zgodny) ocena.rozjazdy.push({ id: c.id, cytat: wiersz.cytat, faktyczny: c.faktyczny });
		if (zgodny !== c.zgodny) {
			ocena.niezgodnosciWerdyktu.push(
				`${c.id}: sonda mówi ${c.zgodny ? "ZGODNY" : "ROZJAZD"}, repo liczy ` +
					`${zgodny ? "ZGODNY" : "ROZJAZD"}`,
			);
		}
	}
	return ocena;
}

function main(): void {
	const plik = process.argv[2];
	if (!plik) {
		console.error("Użycie: pnpm srodowisko:zapisz-sonde <plik-z-wynikiem-sondy.txt>");
		process.exit(2);
	}
	const wynik = wyjmijWynik(readFileSync(plik, "utf8"));
	sprawdzPochodzenie(wynik); // pomiar spoza Colaba nie ma prawa ruszyć deklaracji
	const srodowisko = czytajSrodowisko();
	const surowe = srodowisko.surowe;

	// 1. Ocena PRZED nadpisaniem czegokolwiek: porównujemy pomiar z PINEM
	// i z tablicą cytatów, a nie z samym sobą po aktualizacji.
	const ocena = ocenSonde(wynik, srodowisko);

	// 2. Obserwacje wersji — `zaobserwowano` to FAKT z Colaba, `pin` zostaje nasz.
	const raport: string[] = [];
	for (const [nazwa, wersja] of Object.entries(wynik.wersje)) {
		const pakiet = surowe[nazwa] as Record<string, unknown> | undefined;
		if (!pakiet || typeof pakiet !== "object") {
			raport.push(`⚠ ${nazwa}: sonda zmierzyła wersję, ale deklaracja nie zna tego pakietu`);
			continue;
		}
		const poprzednia = pakiet.zaobserwowano;
		pakiet.zaobserwowano = wersja;
		pakiet.zweryfikowano = wynik.data;
		raport.push(
			`• ${nazwa}: zaobserwowano ${poprzednia ?? "—"} → ${wersja}` +
				(pakiet.pin ? ` (pin ${pakiet.pin})` : ""),
		);
	}

	// 3. `rozjazd` WYLICZONY w repo z surowych pomiarów, nie przepisany z sondy.
	const rozjazdCytatow = ocena.rozjazdy;
	const rozjazdBdl = wynik.bdl?.rozjazdy ?? [];
	const bdlNieosiagalne = wynik.bdl?.osiagalne === false;
	const rozjazd =
		rozjazdCytatow.length > 0 || rozjazdBdl.length > 0 || ocena.rozjazdWersji.length > 0;
	surowe.rozjazd = rozjazd;
	surowe.ostatnia_sonda = wynik.data;

	zapiszSrodowisko(surowe, SRODOWISKO_PATH);

	console.log(`✅ Zapisano wynik sondy z ${wynik.data} do ${SRODOWISKO_PATH}\n`);
	for (const linia of raport) console.log(`   ${linia}`);
	console.log(
		`\n   cytaty zgodne: ${wynik.cytaty.length - rozjazdCytatow.length}/${wynik.cytaty.length}`,
	);
	if (rozjazdCytatow.length > 0) {
		for (const c of rozjazdCytatow) {
			console.log(`   ❌ ${c.id}: treść obiecuje „${c.cytat}", silnik oddał „${c.faktyczny}"`);
		}
	}
	if (ocena.rozjazdWersji.length > 0) {
		console.log("\n   ❌ Colab zszedł z naszego pinu:");
		for (const r of ocena.rozjazdWersji) console.log(`      ${r}`);
	}
	if (rozjazdBdl.length > 0) {
		console.log(`   ❌ API GUS/BDL: rozjazd pól ${rozjazdBdl.map((r) => r.pole).join(", ")}`);
	}
	if (ocena.niezgodnosciWerdyktu.length > 0) {
		console.log(
			`\n   ⚠ DEFEKT NARZĘDZIA (nie treści): werdykt sondy różni się od przeliczenia w repo:`,
		);
		for (const n of ocena.niezgodnosciWerdyktu) console.log(`      ${n}`);
		console.log("      Zgłoś Ethanowi — dopasowanie cytatu w sondzie rozjechało się z repo.");
	}
	if (ocena.nieznane.length > 0) {
		console.log(
			`\n   ⚠ Sonda zmierzyła cytaty spoza dzisiejszej tablicy (stary notebook?): ` +
				`${ocena.nieznane.join(", ")}`,
		);
	}
	if (bdlNieosiagalne) {
		console.log(
			`   ⚠ API GUS/BDL nieosiągalne z sesji sondy (${wynik.bdl.blad ?? "bez szczegółów"}) — ` +
				"to NIE ustawia rozjazdu; powtórz sondę, a jeśli powtarzalne, zgłoś Ethanowi.",
		);
	}
	console.log(
		rozjazd
			? "\n❌ rozjazd: TRUE — bramka publikacji ZAMKNIĘTA (ADR-016 D4).\n" +
					"   Załóż ticket Linear „[Ethan] rozjazd wersji Colab" +
					"” i poczekaj na rozstrzygnięcie:\n" +
					"   idziemy za Colabem (podbicie pinu + poprawka treści) albo zostajemy z uzasadnieniem."
			: "\n✅ rozjazd: FALSE — bramka publikacji otwarta na kolejne 100 dni od daty sondy.",
	);
}

const isDirectRun = typeof process.argv[1] === "string" && process.argv[1].includes("zapisz-sonde");
if (isDirectRun) main();
