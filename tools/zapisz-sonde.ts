/**
 * ADR-016 D3 — przepisanie wyniku sondy Colab do deklaracji środowiska.
 *
 * PO CO NARZĘDZIE, A NIE RĘCZNA EDYCJA JSON-a: flaga `rozjazd` jest tym, co
 * zamyka bramkę publikacji (D4). Gdyby ustawiał ją człowiek „na oko" po
 * przeczytaniu wydruku, bramka byłaby tak dobra jak czyjaś uważność o 23:00.
 * Tu `rozjazd` WYLICZA SIĘ z pomiaru: rozjazd cytatu albo rozjazd kontraktu
 * API BDL ⇒ true. Człowiek dostarcza pomiar, maszyna wyciąga wniosek.
 *
 * Użycie:
 *   pnpm srodowisko:zapisz-sonde docs/curation/sondy/sonda-srodowiska-20260722.txt
 *
 * Plik wejściowy = wklejone wyjście sondy; narzędzie wyjmuje z niego blok
 * `--- WYNIK MASZYNOWY (JSON) ---`.
 */

import { readFileSync } from "node:fs";
import { czytajSrodowisko, SRODOWISKO_PATH, zapiszSrodowisko } from "./srodowisko-colab";

type WynikSondy = {
	data: string;
	wersje: Record<string, string>;
	cytaty: { id: string; cytat: string; faktyczny: string; zgodny: boolean }[];
	rozjazd_cytatow: number;
	bdl: { osiagalne: boolean; rozjazdy?: { pole: string }[]; blad?: string };
};

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

function main(): void {
	const plik = process.argv[2];
	if (!plik) {
		console.error("Użycie: pnpm srodowisko:zapisz-sonde <plik-z-wynikiem-sondy.txt>");
		process.exit(2);
	}
	const wynik = wyjmijWynik(readFileSync(plik, "utf8"));
	const srodowisko = czytajSrodowisko();
	const surowe = srodowisko.surowe;

	// 1. Obserwacje wersji — `zaobserwowano` to FAKT z Colaba, `pin` zostaje nasz.
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

	// 2. `rozjazd` WYLICZONY, nie wpisany ręcznie.
	const rozjazdCytatow = wynik.cytaty.filter((c) => !c.zgodny);
	const rozjazdBdl = wynik.bdl?.rozjazdy ?? [];
	const bdlNieosiagalne = wynik.bdl?.osiagalne === false;
	const rozjazd = rozjazdCytatow.length > 0 || rozjazdBdl.length > 0;
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
	if (rozjazdBdl.length > 0) {
		console.log(`   ❌ API GUS/BDL: rozjazd pól ${rozjazdBdl.map((r) => r.pole).join(", ")}`);
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
