#!/usr/bin/env tsx
/**
 * kopie-zapasowe-przeglad — czy obietnica z klauzuli o kopiach zapasowych jest dziś prawdziwa.
 *
 * ── CO ROZSTRZYGA ────────────────────────────────────────────────────────────
 *
 * Sekcja 9 klauzuli informacyjnej obiecuje studentowi, że kopie z jego danymi
 * wygasają najpóźniej w zadeklarowanym oknie. To zdanie **nie jest dziś pilnowane
 * przez nic**: automatyczna historia Neona (mierzone 2026-08-13: 21600 s = 6 h)
 * mieści się w oknie z ogromnym zapasem, ale nasze WŁASNE gałęzie `prod-backup-*`
 * są pełnymi kopiami bazy i **nie wygasają w ogóle** — żyją do ręcznego skasowania.
 * Zdanie z klauzuli było więc prawdziwe PRZYPADKIEM, bo akurat niedawno były
 * ceremonie, a nie dlatego, że ktoś odlicza dni.
 *
 * To narzędzie zamienia to zdanie w **mierzalną własność z kodem wyjścia**.
 *
 * ── DLACZEGO NARZĘDZIE NIE POBIERA DANYCH SAMO ───────────────────────────────
 *
 * Pobranie wymaga klucza o zasięgu CAŁEJ organizacji Neona
 * (`docs/runbooks/neon-kopia-zapasowa.md` §1). Runbook §3c dowiódł pomiarem, że
 * klucz podany inaczej niż wejściem standardowym ląduje w tablicy procesów, którą
 * widzi dowolny użytkownik maszyny. Zamiast powtarzać tu tamtą ostrożność drugi raz
 * (i dać drugie miejsce, w którym można ją zepsuć), **rozdzielam role**:
 *   • POBIERA `curl -K -` z runbooka — jedyne miejsce, które dotyka klucza;
 *   • OCENIA to narzędzie — czyta gotowy wynik z wejścia standardowego.
 * Efekt uboczny jest pożądany: narzędzie da się testować bez sekretu i bez sieci.
 *
 * ── OKNO MA JEDEN NOŚNIK I NIE JEST NIM TEN PLIK ─────────────────────────────
 *
 * Liczba dni **nie jest tu zapisana**. Czytam ją z sekcji 9 klauzuli, bo to
 * jedyne miejsce, w którym ta obietnica została złożona człowiekowi (CLAUDE.md
 * v1.17 — jeden nośnik reguły o konsekwencji zewnętrznej). Wpisanie jej tutaj
 * dałoby drugi nośnik, który rozjedzie się po cichu przy pierwszej zmianie
 * klauzuli. Pilnuje tego strażnik `tests/unit/rodo/kopie-zapasowe-okno.contract.test.ts`.
 *
 * Dlaczego NIE przez tabelę okresów w `retention.md` (rozstrzygnięte 2026-08-13):
 * strażnik okresów wymaga, by każda pozycja rejestru retencji miała bliźniaczy
 * klucz w **sekcji 7** klauzuli — czyli w tabeli pokazywanej studentowi. Okno
 * kopii nie jest okresem przechowywania klasy danych i wepchnięcie go tam
 * zmieniłoby tekst widziany przez człowieka, a to cudzy dokument (Ryan) pod
 * sign-offem Darka. Wchodzimy więc od strony sekcji 9, gdzie obietnica już żyje.
 *
 * ── UŻYCIE ───────────────────────────────────────────────────────────────────
 *
 *   NEON_API_KEY=$(grep '^NEON_API_KEY=' .env.prod | cut -d= -f2- | tr -d '"')
 *   printf 'header = "Authorization: Bearer %s"\n' "$NEON_API_KEY" | curl -s -K - \
 *     "https://console.neon.tech/api/v2/projects/long-pond-11214233/branches" \
 *   | pnpm exec tsx tools/kopie-zapasowe-przeglad.ts
 *
 * Kod wyjścia — umowa wiążąca, mieszka tutaj:
 *   0  W OKNIE            — żadna kopia nie przekracza okna; nic nie robisz.
 *   1  NARUSZENIE         — istnieje kopia starsza niż okno. Obietnica z sekcji 9
 *                           jest w tej chwili NIEPRAWDZIWA. Procedura naprawy:
 *                           `docs/runbooks/neon-kopia-zapasowa.md` §8 (reguła odświeżania).
 *   2  NIEROZSTRZYGNIĘTY  — nie dało się odczytać wejścia albo okna z klauzuli.
 *                           To NIE jest „prawie zielone" — traktuj jak 1.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const KORZEN = resolve(__dirname, "..");
const KLAUZULA = resolve(KORZEN, "docs/legal/klauzula-informacyjna-art13.md");

/** Znacznik maszynowy nośnika okna w sekcji 9 klauzuli (niewidoczny dla studenta). */
const ZNACZNIK_OKNA = /<!--\s*kopie:okno_dni\s*-->/;

/**
 * Wyciąga okno z klauzuli. CELOWO wąskie, wzorem `naPostacKanoniczna` ze strażnika
 * okresów: nierozpoznane sformułowanie = wyjątek, nigdy ciche założenie. Fałszywy
 * alarm przy przeredagowaniu zdania jest tańszy niż milczenie przy zmianie liczby.
 */
export function oknoDniZKlauzuli(tresc: string): number {
	const linie = tresc.split("\n").filter((l) => ZNACZNIK_OKNA.test(l));
	if (linie.length === 0) {
		throw new Error(
			"Nie znalazłem znacznika <!-- kopie:okno_dni --> w klauzuli. Okno kopii ma jeden " +
				"nośnik i jest nim sekcja 9 klauzuli — bez znacznika nie wiadomo, którą liczbę " +
				"egzekwować, a zgadywanie z prozy jest dokładnie tą wadą, której ten strażnik broni.",
		);
	}
	if (linie.length > 1) {
		throw new Error(
			`Znacznik <!-- kopie:okno_dni --> występuje ${linie.length} razy. Nośnik ma być JEDEN ` +
				"(CLAUDE.md v1.17) — dwa znaczniki to dwie liczby, które rozjadą się po cichu.",
		);
	}
	const m = linie[0].match(/najpóźniej po (\d{1,3}) dniach/i);
	if (!m) {
		throw new Error(
			`Znacznik jest, ale nie rozpoznaję w tej linii deklaracji okna. Oczekiwane ` +
				`sformułowanie: „najpóźniej po N dniach". Linia: „${linie[0].trim().slice(0, 160)}". ` +
				"Przepisz zdanie uznanym sformułowaniem albo świadomie rozszerz ten parser — " +
				"cisza tu nie jest opcją.",
		);
	}
	return Number(m[1]);
}

export type Galaz = { id: string; name: string; created_at: string; default?: boolean };

export type Werdykt = {
	kod: 0 | 1;
	oknoDni: number;
	kopie: { nazwa: string; id: string; wiekDni: number; poOknie: boolean }[];
	przeterminowane: string[];
	/**
	 * Czy skasowanie przeterminowanych zeszłoby poniżej dwóch kopii stanu produkcji
	 * (bramka (g) `CLAUDE.md` v1.15). Wtedy kolejność jest odwrotna: NAJPIERW świeża
	 * kopia, POTEM kasowanie — patrz runbook §8.
	 */
	wymagaSwiezejKopiiPrzedKasowaniem: boolean;
};

/** Nazwy gałęzi będących kopiami stanu produkcji. Gałąź domyślna NIE jest kopią. */
export function czyKopiaProdukcji(g: Galaz): boolean {
	return g.default !== true && g.name.startsWith("prod-backup-");
}

export function ocen(galezie: Galaz[], oknoDni: number, teraz: Date): Werdykt {
	const kopie = galezie
		.filter(czyKopiaProdukcji)
		.map((g) => {
			const wiekDni = Math.floor((teraz.getTime() - new Date(g.created_at).getTime()) / 86_400_000);
			return { nazwa: g.name, id: g.id, wiekDni, poOknie: wiekDni > oknoDni };
		})
		.sort((a, b) => b.wiekDni - a.wiekDni);

	const przeterminowane = kopie.filter((k) => k.poOknie).map((k) => k.nazwa);
	const zostaloby = kopie.length - przeterminowane.length;

	return {
		kod: przeterminowane.length > 0 ? 1 : 0,
		oknoDni,
		kopie,
		przeterminowane,
		wymagaSwiezejKopiiPrzedKasowaniem: przeterminowane.length > 0 && zostaloby < 2,
	};
}

async function czytajWejscie(): Promise<string> {
	const kawalki: Buffer[] = [];
	for await (const k of process.stdin) kawalki.push(k as Buffer);
	return Buffer.concat(kawalki).toString("utf8");
}

async function main(): Promise<void> {
	let oknoDni: number;
	try {
		oknoDni = oknoDniZKlauzuli(readFileSync(KLAUZULA, "utf8"));
	} catch (e) {
		console.error(`[kopie-zapasowe] NIEROZSTRZYGNIĘTY: ${(e as Error).message}`);
		process.exit(2);
	}

	const surowe = await czytajWejscie();
	let galezie: Galaz[];
	try {
		const d = JSON.parse(surowe) as { branches?: Galaz[] };
		if (!Array.isArray(d.branches)) throw new Error("brak pola `branches`");
		galezie = d.branches;
	} catch (e) {
		console.error(
			`[kopie-zapasowe] NIEROZSTRZYGNIĘTY: nie odczytałem listy gałęzi z wejścia ` +
				`(${(e as Error).message}). Podaj wyjście ` +
				`GET /api/v2/projects/<projekt>/branches — runbook §3a.`,
		);
		process.exit(2);
	}

	const w = ocen(galezie, oknoDni, new Date());
	console.log(`=== przegląd kopii zapasowych (okno z klauzuli §9: ${w.oknoDni} dni) ===`);
	for (const k of w.kopie) {
		console.log(
			`  ${String(k.wiekDni).padStart(4)} dni  ${k.poOknie ? "PO OKNIE" : "w oknie "}  ${k.nazwa}  [${k.id}]`,
		);
	}
	if (w.kopie.length === 0) console.log("  (żadnej kopii stanu produkcji)");

	if (w.kod === 0) {
		console.log(
			"\n[kopie-zapasowe] WYNIK: W OKNIE — obietnica z sekcji 9 klauzuli jest prawdziwa.",
		);
		process.exit(0);
	}

	console.error(
		`\n[kopie-zapasowe] NARUSZENIE: ${w.przeterminowane.length} kopi(i) starsze niż okno ` +
			`${w.oknoDni} dni: ${w.przeterminowane.join(", ")}.\n` +
			"Obietnica z sekcji 9 („najpóźniej po N dniach kopie z Twoimi danymi wygasają”) " +
			"jest w tej chwili NIEPRAWDZIWA. Procedura naprawy: docs/runbooks/neon-kopia-zapasowa.md §8.",
	);
	if (w.wymagaSwiezejKopiiPrzedKasowaniem) {
		console.error(
			"⚠ KOLEJNOŚĆ ODWROTNA: skasowanie przeterminowanych zeszłoby poniżej dwóch kopii " +
				"stanu produkcji (bramka (g), CLAUDE.md v1.15). NAJPIERW zrób świeżą kopię " +
				"(runbook §3b), POTEM kasuj — inaczej łamiesz bramkę, która chroni odtworzenie.",
		);
	}
	process.exit(1);
}

if (process.argv[1] && /kopie-zapasowe-przeglad\.ts$/.test(process.argv[1])) {
	void main();
}
