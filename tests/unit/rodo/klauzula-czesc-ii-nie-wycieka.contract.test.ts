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
 * Trzy mutacje, każda po innym nośniku wady. Wszystkie wykonane 2026-08-13 NA
 * ZACOMMITOWANYM drzewie i wszystkie cofnięte (`git checkout <plik>`). Wyjścia
 * cytowane dosłownie z `pnpm test:run <ten plik>`.
 *
 * M1 — treść aparatu przeniesiona do CZĘŚCI I (najbardziej realna wpadka: autor
 *      dopisuje notkę dla recenzenta w środku tekstu dla studenta; cięcie po
 *      znacznikach jej NIE widzi, bo formalnie leży w miejscu treści studenta).
 *   Zmiana: `docs/legal/klauzula-informacyjna-art13.md`, po akapicie wstępnym
 *           CZĘŚCI I („…przeczytać raz i zrozumieć.", linia 126) dopisana linia:
 *           „Uwaga dla recenzenta: nie jestem prawnikiem, to draft."
 *   Padło 8 testów, m.in. „dokument w repozytorium przechodzi przez bramkę bez
 *           wyjątku", „w treści dla studenta nie ma ANI JEDNEGO odcisku aparatu",
 *           „bloki do renderowania też są czyste (nie tylko surowy tekst)",
 *           „klucze maszynowe strażnika okresów nie trafiają do DOM".
 *   Komunikat: „KlauzulaError: [klauzula art. 13] W treści dla studenta znalazłem
 *           aparat wewnętrzny:  - zastrzeżenie autora, że nie jest prawnikiem
 *           (nie jestem prawnikiem) → „nie jestem prawnikiem""
 *   TA SAMA mutacja czerwieni bramkę E2E (`tests/e2e-pw/80-e4-klauzula-art13.spec.ts`,
 *           job `a11y-klauzula`): „3 failed, 2 passed", pierwszy test —
 *           „Expected: 200 / Received: 500". Czyli fail-closed zadziałał do końca:
 *           strona się NIE wyrenderowała, zamiast wyrenderować się z wyciekiem.
 *
 * M2 — zniknął znacznik końca (ktoś przemianował nagłówek CZĘŚCI II-B).
 *   Zmiana: `docs/legal/klauzula-informacyjna-art13.md` linia 358,
 *           „# CZĘŚĆ II-B — aparat wewnętrzny (nie publikujemy)" → „# Aneks B".
 *   Padło 9 testów (te co przy M1 + „nierozpoznana treść przed pierwszym
 *           nagłówkiem = wyjątek", który przy tym kształcie dokumentu przestaje
 *           dostawać spodziewany wyjątek).
 *   Komunikat: „KlauzulaError: [klauzula art. 13] Po CZĘŚCI I nie ma nagłówka
 *           CZĘŚCI II. Bez znacznika końca nie umiem odciąć aparatu wewnętrznego,
 *           a „do końca pliku” opublikowałoby go w całości."
 *
 * M3 — osłabiona bramka w KODZIE (a nie w dokumencie). Mutacja pod DRUGĄ warstwę:
 *      sprawdza, czy suita nie opiera się wyłącznie na cięciu po znacznikach.
 *   Zmiana: `src/lib/legal/klauzula-art13.ts` — na początku ciała
 *           `assertBezAparatuWewnetrznego` wstawione `return;`.
 *   Padł 1 test: „bramka odcisków palców w ogóle działa (kontrola ujemna)".
 *   Komunikat: „AssertionError: expected [Function] to throw an error".
 *   To celowo mutacja o wąskim zasięgu — pokazuje, że kontrola UJEMNA (bramka
 *   rzuca na spreparowanym tekście) jest niezależna od kontroli DODATNIEJ
 *   (dokument przechodzi). Bez niej wypatroszenie bramki przeszłoby na zielono.
 *
 * Kontrola dwustronna: na drzewie bez mutacji „Tests 13 passed (13)" (a w całym
 * katalogu `tests/unit/rodo/` — „30 passed") — strażnik czerwieni się na każdej
 * z trzech wad ORAZ milczy na poprawnym dokumencie. Testy „kontrola dodatnia"
 * niżej pilnują, żeby cisza nie brała się z pustki: wycięta treść musi zawierać
 * realne zdania klauzuli, wszystkie 13 sekcji i pięć tabel.
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
