/**
 * ADR-016 D1 — czytnik deklaracji środowiska `tools/content/notebooks/srodowisko-colab.json`.
 *
 * JEDNO ŹRÓDŁO PRAWDY o wersjach silników, pod które napisana jest treść.
 * Czytają stąd (i tylko stąd):
 *   - krok pip w `.github/workflows/pr.yml`   → `pnpm tsx tools/srodowisko-colab.ts --piny`
 *   - kontrakt-test `srodowisko-silnikow`     → `czytajSrodowisko`, `pinPasuje`
 *   - packer `pack-curriculum-atoms.ts`       → `sprawdzBramkeSrodowiska` (ADR-016 D4)
 *   - ingest `ingest-curriculum.ts`           → `sprawdzBramkeSrodowiska` (ADR-016 D4)
 *   - generator sondy `build-sonda-srodowiska.ts`
 *
 * Wersja NIE MA prawa pojawić się nigdzie indziej — ani w workflow, ani w komentarzu
 * testu, ani w prozie dokumentu kuracji (ADR-016 D5.3).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SRODOWISKO_PATH = join(
	process.cwd(),
	"tools",
	"content",
	"notebooks",
	"srodowisko-colab.json",
);

/** Ile dni sonda Colab może mieć, zanim przestaje bramkować pakowanie (ADR-016 D4). */
export const MAX_WIEK_SONDY_DNI = 100;

/** Moduły, których dotyczy bramka publikacji (ADR-016 D4: „moduły M-*"). */
export const MODULY_BRAMKOWANE = /^m-/;

/**
 * Operatory dopuszczone w pinie deklaracji.
 *
 * Powód, dla którego walidacja siedzi TUTAJ, a nie w teście (uwaga F4 Leo):
 * wynik `pinySpec()` trafia do `pip install ${PIP_PINY}` **bez cudzysłowów**
 * (celowo — jedna zmienna niesie wiele specyfikacji). Znak spoza tej listy
 * powłoka zinterpretuje ZANIM cokolwiek zdąży go odrzucić: pin z `>` zrobi
 * przekierowanie do pliku, a krok pip zainstaluje pakiet bez ograniczenia
 * wersji i przejdzie na zielono. Kontrakt-test biegnie dopiero PO instalacji,
 * więc jako bramka jest spóźniony. Awaria ma wypaść w kroku, który tę wartość
 * produkuje.
 */
export const OPERATORY_PINU = ["~=", "=="] as const;

/** Nazwa pakietu i wersja: wyłącznie znaki bezpieczne dla powłoki (PEP 508 i tak węższy). */
const BEZPIECZNY_CZLON = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type PakietDeklaracja = {
	pin?: string | null;
	zakres?: string | null;
	zaobserwowano?: string | null;
	zweryfikowano?: string | null;
	zrodlo?: string;
	nota?: string;
};

export type Srodowisko = {
	rozjazd: boolean;
	ostatnia_sonda: string | null;
	pakiety: Record<string, PakietDeklaracja>;
	/** Surowy obiekt — do zapisu z powrotem bez gubienia pól opisowych. */
	surowe: Record<string, unknown>;
};

export function czytajSrodowisko(sciezka: string = SRODOWISKO_PATH): Srodowisko {
	const surowe = JSON.parse(readFileSync(sciezka, "utf8")) as Record<string, unknown>;
	const pakiety: Record<string, PakietDeklaracja> = {};
	for (const [klucz, wartosc] of Object.entries(surowe)) {
		if (klucz.startsWith("_")) continue;
		if (wartosc === null || typeof wartosc !== "object" || Array.isArray(wartosc)) continue;
		pakiety[klucz] = wartosc as PakietDeklaracja;
	}
	return {
		rozjazd: surowe.rozjazd === true,
		ostatnia_sonda: typeof surowe.ostatnia_sonda === "string" ? surowe.ostatnia_sonda : null,
		pakiety,
		surowe,
	};
}

export function zapiszSrodowisko(
	surowe: Record<string, unknown>,
	sciezka: string = SRODOWISKO_PATH,
): void {
	writeFileSync(sciezka, `${JSON.stringify(surowe, null, "\t")}\n`);
}

/**
 * Specyfikacje dla pipa w kolejności deterministycznej (alfabetycznie), np.
 * `["duckdb~=1.3.2", "pandas~=2.2.0", "requests~=2.32.0"]`.
 * Pakiety bez `pin` (dziś: python — interpreter, nie pakiet) są pomijane.
 */
export function pinySpec(srodowisko: Srodowisko = czytajSrodowisko()): string[] {
	return Object.entries(srodowisko.pakiety)
		.filter(([, p]) => typeof p.pin === "string" && p.pin.length > 0)
		.map(([nazwa, p]) => sprawdzSpec(nazwa, p.pin as string))
		.sort();
}

/**
 * Waliduje pojedynczą specyfikację i zwraca ją w postaci gotowej dla pipa.
 * Rzuca na wszystkim, czego powłoka mogłaby użyć inaczej niż jako tekst
 * (operator spoza `OPERATORY_PINU`, znak spoza `BEZPIECZNY_CZLON`) — patrz
 * komentarz przy `OPERATORY_PINU`.
 */
export function sprawdzSpec(nazwa: string, pin: string): string {
	const operator = OPERATORY_PINU.find((op) => pin.startsWith(op));
	if (!operator) {
		throw new Error(
			`srodowisko-colab.json: pakiet „${nazwa}" ma pin „${pin}" z nieobsługiwanym ` +
				`operatorem. Dozwolone: ${OPERATORY_PINU.join(", ")}. Wartość idzie do ` +
				"`pip install` bez cudzysłowów — inny operator (np. znak większości) powłoka " +
				"wykona jako przekierowanie, " +
				"zamiast przekazać go pipowi.",
		);
	}
	const wersja = pin.slice(operator.length);
	if (!BEZPIECZNY_CZLON.test(nazwa) || !BEZPIECZNY_CZLON.test(wersja)) {
		throw new Error(
			`srodowisko-colab.json: specyfikacja „${nazwa}${pin}" zawiera znak spoza ` +
				"[A-Za-z0-9._-]. Ta wartość jest rozwijana przez powłokę w kroku pip — " +
				"nie przepuszczam znaków, które powłoka mogłaby zinterpretować.",
		);
	}
	return `${nazwa}${operator}${wersja}`;
}

/**
 * Czy zainstalowana wersja spełnia pin. Obsługiwane operatory: `~=` (compatible
 * release wg PEP 440 — ostatni człon może rosnąć, poprzedni musi się zgadzać)
 * i `==`. Nieznany operator = błąd, nie ciche „przechodzi".
 */
export function pinPasuje(pin: string, wersja: string): boolean {
	const czesci = (v: string) => v.split(".").map((x) => Number.parseInt(x, 10) || 0);
	if (pin.startsWith("~=")) {
		const oczek = czesci(pin.slice(2));
		const masz = czesci(wersja);
		if (oczek.length < 2) throw new Error(`pin „${pin}" wymaga co najmniej dwóch członów`);
		// Prefiks bez ostatniego członu musi być identyczny…
		for (let i = 0; i < oczek.length - 1; i++) if ((masz[i] ?? 0) !== oczek[i]) return false;
		// …a ostatni człon nie mniejszy.
		return (masz[oczek.length - 1] ?? 0) >= oczek[oczek.length - 1];
	}
	if (pin.startsWith("==")) return wersja === pin.slice(2);
	throw new Error(`nieobsługiwany operator pinu: „${pin}"`);
}

/** Czy wersja Pythona mieści się w deklarowanym zakresie „3.11 - 3.13". */
export function zakresPasuje(zakres: string, wersja: string): boolean {
	const m = zakres.match(/^\s*(\d+)\.(\d+)\s*[-–]\s*(\d+)\.(\d+)\s*$/);
	if (!m) throw new Error(`nieparsowalny zakres wersji: „${zakres}"`);
	const [odMaj, odMin, doMaj, doMin] = m.slice(1).map(Number);
	const [maj, min] = wersja.split(".").map((x) => Number.parseInt(x, 10));
	if (maj < odMaj || maj > doMaj) return false;
	if (maj === odMaj && min < odMin) return false;
	if (maj === doMaj && min > doMin) return false;
	return true;
}

export function wiekSondyDni(
	srodowisko: Srodowisko = czytajSrodowisko(),
	teraz: Date = new Date(),
): number | null {
	if (!srodowisko.ostatnia_sonda) return null;
	const data = new Date(`${srodowisko.ostatnia_sonda}T00:00:00Z`);
	if (Number.isNaN(data.getTime())) {
		throw new Error(`nieparsowalna data ostatniej sondy: „${srodowisko.ostatnia_sonda}"`);
	}
	return Math.floor((teraz.getTime() - data.getTime()) / 86_400_000);
}

export type WynikBramki = { ok: true } | { ok: false; powod: string; komunikat: string };

/**
 * ADR-016 D4 — twarda bramka PUBLIKACJI treści (nie PR-a).
 *
 * Blokuje pakowanie i ingest modułów M-* w dwóch przypadkach:
 *  1. `rozjazd: true`  — sonda pokazała, że Colab rozjechał się z pinem;
 *     odblokowanie = decyzja Ethana (idziemy za Colabem albo zostajemy).
 *  2. sonda starsza niż 100 dni albo nigdy nie uruchomiona — bez tego flaga
 *     `rozjazd` zostałaby `false` na zawsze i cała bramka byłaby martwa.
 *
 * ŚWIADOMIE NIE blokuje modułów L0/F1–F3 — i to jest kompromis, nie własność
 * ryzyka. Moduły F **też** cytują silniki (`IndentationError`, `SyntaxError`),
 * a dług z ADR-016 §2 mieszka właśnie tam; zakres `M-*` wybraliśmy dlatego, że
 * kurator musi móc naprawić ten dług nawet wtedy, gdy sonda jest przeterminowana
 * albo jej nie ma. Nie czytaj tego jako „moduły F nie cytują silników" — to
 * przekonanie wpuściło ten dług na produkcję (uwaga F2 Leo).
 */
export function sprawdzBramkeSrodowiska(
	srodowisko: Srodowisko = czytajSrodowisko(),
	teraz: Date = new Date(),
): WynikBramki {
	if (srodowisko.rozjazd) {
		return {
			ok: false,
			powod: "rozjazd",
			komunikat:
				'srodowisko-colab.json ma "rozjazd": true — Colab rozjechał się z pinem, którym ' +
				"zweryfikowana jest treść modułów M-*. Pakowanie i ingest tych modułów są " +
				"zablokowane do rozstrzygnięcia (ADR-016 D4: idziemy za Colabem albo zostajemy " +
				"z uzasadnieniem i datą przeglądu). Rozstrzyga Ethan (CTO).",
		};
	}
	const wiek = wiekSondyDni(srodowisko, teraz);
	if (wiek === null) {
		return {
			ok: false,
			powod: "brak-sondy",
			komunikat:
				'srodowisko-colab.json ma "ostatnia_sonda": null — środowiska Colab nikt nigdy ' +
				"nie zmierzył, więc flaga „rozjazd” nic nie znaczy. Uruchom sondę: " +
				"docs/runbooks/sonda-srodowiska-colab.md (≈15 min, wymaga sesji przeglądarki).",
		};
	}
	if (wiek > MAX_WIEK_SONDY_DNI) {
		return {
			ok: false,
			powod: "sonda-przeterminowana",
			komunikat:
				`sonda środowiska przeterminowana — uruchom notebooks/sonda/ (ostatni pomiar: ` +
				`${srodowisko.ostatnia_sonda}, ${wiek} dni temu, limit ${MAX_WIEK_SONDY_DNI}). ` +
				"Instrukcja: docs/runbooks/sonda-srodowiska-colab.md.",
		};
	}
	return { ok: true };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// `pnpm tsx tools/srodowisko-colab.ts --piny`   → specyfikacje pipa (jedna linia)
// `pnpm tsx tools/srodowisko-colab.ts --bramka` → status bramki publikacji (exit 1 = blokada)
const isDirectRun =
	typeof process.argv[1] === "string" && process.argv[1].includes("srodowisko-colab");
if (isDirectRun) {
	const tryb = process.argv[2] ?? "--piny";
	if (tryb === "--piny") {
		console.log(pinySpec().join(" "));
	} else if (tryb === "--bramka") {
		const wynik = sprawdzBramkeSrodowiska();
		if (wynik.ok) {
			console.log("✅ Bramka środowiska (ADR-016 D4): otwarta.");
		} else {
			console.error(`❌ Bramka środowiska (ADR-016 D4) ZAMKNIĘTA [${wynik.powod}]`);
			console.error(`   ${wynik.komunikat}`);
			process.exit(1);
		}
	} else {
		console.error(`Nieznany tryb: ${tryb} (dozwolone: --piny, --bramka)`);
		process.exit(2);
	}
}
