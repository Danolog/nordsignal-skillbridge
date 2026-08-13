/**
 * STRAŻNIK: APARAT WEWNĘTRZNY KLAUZULI NIGDY NIE TRAFIA DO UŻYTKOWNIKA.
 *
 * ── Co jest chronione ────────────────────────────────────────────────────────
 * `docs/legal/klauzula-informacyjna-art13.md` ma trzy części i tylko CZĘŚĆ I
 * wolno pokazać człowiekowi. CZĘŚĆ II-A stoi PRZED nią (m.in. „Nie jestem
 * prawnikiem", tabela warunków zapłonu W-1…W-5, sprostowanie autora o własnym
 * strażniku), CZĘŚĆ II-B PO niej (Z-5: osiem rzeczy, które musi sprawdzić
 * prawnik). Student, który zobaczy którekolwiek z tych zdań, dostaje dowód, że
 * klauzuli nie napisał prawnik — i traci ją jako źródło informacji o swoich
 * prawach. To bramka przed pierwszym uczestnikiem spoza zespołu, nie ozdoba.
 *
 * ── Dwie warstwy, bo jedna łapie tylko połowę wpadek ─────────────────────────
 *   (1) CIĘCIE PO ZNACZNIKACH (`wytnijCzescI`) — łapie zmianę KSZTAŁTU dokumentu
 *       (zniknął znacznik końca, doszedł drugi znacznik początku).
 *   (2) ODCISKI PALCÓW (`assertBezAparatuWewnetrznego`) — łapią zmianę TREŚCI
 *       przy niezmienionym kształcie: notka dla recenzenta dopisana w środku
 *       CZĘŚCI I. Cięcie po znacznikach jej nie widzi, bo formalnie leży
 *       w miejscu treści dla studenta.
 * Obie warstwy są FAIL-CLOSED: rzucają wyjątkiem, więc strona się nie renderuje.
 * „Pokaż, co się da" jest tu gorsze niż brak strony.
 *
 * ── DOWÓD, ŻE STRAŻNIK STRZEŻE (CLAUDE.md v1.17 — mutacja, nie zielona suita) ─
 * Trzy mutacje, każda po innym nośniku wady, wszystkie 2026-08-13, wszystkie
 * cofnięte. Wyjścia cytowane dosłownie z `pnpm test:run`.
 *
 * M1 — treść aparatu przeniesiona do CZĘŚCI I (najbardziej realna wpadka: autor
 *      dopisuje notkę dla recenzenta w środku tekstu dla studenta).
 *   Zmiana: `klauzula-informacyjna-art13.md`, po linii 126 (koniec akapitu
 *           wstępnego CZĘŚCI I) dopisane: „Uwaga dla recenzenta: nie jestem
 *           prawnikiem, to draft."
 *   Padły: 4 testy — „dokument w repozytorium przechodzi przez bramkę bez
 *          wyjątku", „w treści dla studenta nie ma ANI JEDNEGO odcisku aparatu",
 *          „bloki do renderowania też są czyste", „render nie zna żadnej treści
 *          spoza tego, co dostał".
 *   Komunikat: „[klauzula art. 13] W treści dla studenta znalazłem aparat
 *          wewnętrzny: - zastrzeżenie autora, że nie jest prawnikiem
 *          (nie jestem prawnikiem) → „nie jestem prawnikiem"".
 *
 * M2 — zniknął znacznik końca (ktoś przemianował nagłówek CZĘŚCI II-B).
 *   Zmiana: `klauzula-informacyjna-art13.md` linia 358,
 *           „# CZĘŚĆ II-B — aparat wewnętrzny (nie publikujemy)" → „# Aneks B".
 *   Padły: te same 4 testy.
 *   Komunikat: „[klauzula art. 13] Po CZĘŚCI I nie ma nagłówka CZĘŚCI II.
 *          Bez znacznika końca nie umiem odciąć aparatu wewnętrznego, a „do końca
 *          pliku" opublikowałoby go w całości."
 *
 * M3 — osłabiona bramka w KODZIE (a nie w dokumencie): odciski palców przestają
 *      obowiązywać. To mutacja pod drugą warstwę — sprawdza, czy testy nie
 *      opierają się wyłącznie na cięciu po znacznikach.
 *   Zmiana: `src/lib/legal/klauzula-art13.ts`, ciało
 *           `assertBezAparatuWewnetrznego` zastąpione przez `return;`.
 *   Padł: „bramka odcisków palców w ogóle działa (kontrola ujemna)".
 *   Komunikat: „expected [Function] to throw an error".
 *
 * Kontrola dwustronna: na drzewie bez mutacji „Tests 11 passed (11)" — strażnik
 * czerwieni się na każdej z trzech wad ORAZ milczy na poprawnym dokumencie.
 * Testy „kontrola dodatnia" niżej pilnują, żeby cisza nie brała się z pustki:
 * wycięta treść musi zawierać realne zdania klauzuli i wszystkie 13 sekcji.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	assertBezAparatuWewnetrznego,
	podzielNaBloki,
	SCIEZKA_KLAUZULI,
	wczytajKlauzuleDlaStudenta,
	wytnijCzescI,
} from "@/lib/legal/klauzula-art13";

const DOKUMENT = readFileSync(SCIEZKA_KLAUZULI, "utf8");

describe("klauzula art. 13 · CZĘŚĆ II nie trafia do użytkownika", () => {
	it("dokument w repozytorium przechodzi przez bramkę bez wyjątku", () => {
		expect(() => wczytajKlauzuleDlaStudenta()).not.toThrow();
	});

	it("w treści dla studenta nie ma ANI JEDNEGO odcisku aparatu", () => {
		expect(() => assertBezAparatuWewnetrznego(wczytajKlauzuleDlaStudenta())).not.toThrow();
	});

	it("bloki do renderowania też są czyste (nie tylko surowy tekst)", () => {
		// Renderer dostaje bloki, nie tekst — sprawdzam to, co realnie idzie do DOM.
		const zBlokow = podzielNaBloki(wczytajKlauzuleDlaStudenta())
			.map((b) => (b.rodzaj === "markdown" ? b.tekst : [b.naglowek, ...b.wiersze].flat().join(" ")))
			.join("\n");
		expect(() => assertBezAparatuWewnetrznego(zBlokow)).not.toThrow();
	});

	it("render nie zna żadnej treści spoza tego, co dostał", () => {
		// Kontrola konstrukcyjna: komponent renderujący nie ma dostępu do nośnika
		// ani do CZĘŚCI II — dostaje wyłącznie gotowe bloki propsem. Gdyby ktoś
		// wczytał dokument w komponencie, ta asercja pada i wraca druga furtka.
		// Sprawdzam IMPORTY (początek linii), nie wystąpienia nazw — nagłówek pliku
		// opisuje, skąd treść przychodzi, i wolno mu te nazwy wymieniać.
		const renderer = readFileSync("src/components/legal/klauzula-markdown.tsx", "utf8");
		expect(renderer, "renderer sięga do systemu plików").not.toMatch(/^import[^;]*node:fs/m);
		expect(renderer, "renderer wczytuje nośnik sam, zamiast dostać bloki").not.toMatch(
			/^import\s+\{[^}]*(wczytajKlauzule|SCIEZKA_KLAUZULI)/m,
		);
	});

	it("zdania z CZĘŚCI II-A i II-B są w dokumencie, ale NIE w wyciętej treści", () => {
		// Kontrola dodatnia: bez niej test przechodziłby także wtedy, gdyby zdań
		// w ogóle nie było w dokumencie (np. po jego przepisaniu).
		const zdania = [
			"Nie jestem prawnikiem", // Z-1
			"Warunki wejścia w życie", // Z-2
			"NIE POKAZUJEMY GO NIKOMU", // banner statusu
			"Co musi sprawdzić prawnik", // Z-5
			"Self-critique", // Z-6
		];
		const dlaStudenta = wczytajKlauzuleDlaStudenta();
		for (const zdanie of zdania) {
			expect(
				DOKUMENT,
				`zdanie „${zdanie}" zniknęło z dokumentu — test przestał cokolwiek mierzyć`,
			).toContain(zdanie);
			expect(dlaStudenta, `zdanie „${zdanie}" WYCIEKŁO do treści dla studenta`).not.toContain(
				zdanie,
			);
		}
	});
});

describe("klauzula art. 13 · bramka działa też na tekście spreparowanym", () => {
	it("bramka odcisków palców w ogóle działa (kontrola ujemna)", () => {
		expect(() => assertBezAparatuWewnetrznego("Cześć. Nie jestem prawnikiem, ale...")).toThrow(
			/aparat wewnętrzny/,
		);
		expect(() => assertBezAparatuWewnetrznego("Warunek W-1 jest twardy.")).toThrow(
			/aparat wewnętrzny/,
		);
	});

	it("brak znacznika końca = wyjątek, nie „weź do końca pliku”", () => {
		const okaleczony = DOKUMENT.replace(/^# CZĘŚĆ II-B.*$/m, "# Aneks B");
		expect(() => wytnijCzescI(okaleczony)).toThrow(/nie ma nagłówka CZĘŚCI II/);
	});

	it("podwojony znacznik początku = wyjątek, nie wybór pierwszego lepszego", () => {
		const zdublowany = DOKUMENT.replace(
			"# CZĘŚĆ I — treść dla studenta",
			"# CZĘŚĆ I — treść dla studenta\n\n# CZĘŚĆ I — treść dla studenta",
		);
		expect(() => wytnijCzescI(zdublowany)).toThrow(/występuje 2 razy/);
	});

	it("nierozpoznana treść przed pierwszym nagłówkiem = wyjątek", () => {
		const zNotka = DOKUMENT.replace(
			"# CZĘŚĆ I — treść dla studenta",
			"# CZĘŚĆ I — treść dla studenta\n\nNotatka robocza autora, nie dla studenta.",
		);
		expect(() => wytnijCzescI(zNotka)).toThrow(/nie umiem zakwalifikować/);
	});
});

describe("klauzula art. 13 · treść dla studenta jest kompletna (kontrola dodatnia)", () => {
	// Wołane W TEŚCIE, nie na poziomie describe: bramka rzuca wyjątkiem, a wyjątek
	// rzucony przy zbieraniu plików wywala CAŁY plik jako „0 test" — pada wtedy
	// suita, ale nie widać KTÓRY strażnik i na czym. Nazwa padającego testu jest
	// tu połową wartości diagnostycznej.
	const dla = () => wczytajKlauzuleDlaStudenta();

	it("ma wszystkie 13 sekcji CZĘŚCI I", () => {
		const numery = [...dla().matchAll(/^###\s+(\d+)\./gm)].map((m) => Number(m[1]));
		expect(numery).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
	});

	it("niesie zdania, których art. 13 wymaga wprost", () => {
		// Gdyby cięcie zjadło za dużo, te asercje padają — strażnik tnie CZĘŚĆ II,
		// nie klauzulę.
		const dlaStudenta = dla();
		expect(dlaStudenta).toContain("Administratorem danych");
		expect(dlaStudenta).toContain("kontakt@nordsignal.cc");
		expect(dlaStudenta).toContain("Prezesa Urzędu Ochrony Danych Osobowych");
		expect(dlaStudenta).toContain("Jak długo trzymamy Twoje dane");
	});

	it("tabele przetrwały cięcie i mają komplet kolumn", () => {
		const tabele = podzielNaBloki(dla()).filter((b) => b.rodzaj === "tabela");
		// Sekcje 3, 4, 5, 7, 8 — pięć tabel; trzy z nich niosą treść wymaganą
		// wprost (podstawy prawne, odbiorcy, okresy przechowywania).
		expect(tabele.length).toBe(5);
		for (const t of tabele) {
			expect(t.rodzaj === "tabela" && t.wiersze.length).toBeGreaterThan(0);
		}
	});

	it("klucze maszynowe strażnika okresów nie trafiają do DOM", () => {
		// `<!-- retencja:review_logs -->` jest nośnikiem powiązania trzech
		// dokumentów, nie treścią — student nie ma powodu go widzieć.
		const dlaStudenta = dla();
		expect(DOKUMENT).toContain("<!-- retencja:review_logs -->");
		expect(dlaStudenta).not.toContain("retencja:");
		expect(dlaStudenta).not.toContain("<!--");
	});
});
