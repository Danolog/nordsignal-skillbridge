// @vitest-environment node
//
// S-A1-4 — STRAŻNIK OBEJŚCIA: zapis do `audit_log` surowym SQL-em
// (ADR A-1 (a+), Ryan v0.4 §5 i §3.3).
//
// Czego pilnuje: nośnik reguły z A3 (typ `AuditEntry`) jest jedynym ZAMIERZONYM
// wejściem do tabeli, ale nie jedynym MOŻLIWYM — kilka narzędzi i migracji pisze
// do `audit_log` bezpośrednim `INSERT`-em, którego kompilator nie widzi. Reguła
// ma jeden nośnik i jedno obejście; CLAUDE.md v1.17 nie pozwala tego przemilczeć,
// więc obejście dostaje własnego strażnika.
//
// Strażnik jest DWUCZĘŚCIOWY, bo dwie różne rzeczy mogą pójść źle:
//   (1) istniejące miejsce zaczyna pisać `actor_id`  → czerwone natychmiast,
//   (2) powstaje NOWE miejsce spoza listy            → czerwone, nawet jeśli
//       akurat jest zgodne. Reguła „nikt nie pisze tu bokiem bez przeglądu"
//       jest tu ważniejsza niż jednorazowa poprawność wstawki.
//
// ZNALEZISKO PRZY WDROŻENIU (zgłoszone Ryanowi): inwentaryzacja w ADR §3.3
// wymienia DWIE ścieżki surowego SQL-a (`tools/pilot-enroll.ts`,
// `drizzle/0006_far_shaman.sql`). W drzewie na `origin/main` = `06d0040` są
// CZTERY, a czwarta — `tools/viva-flag-off-recompute.ts` — zapisywała
// `actor_id` = `students.id` przy zdarzeniu `submission.verified`. Naprawione
// w tym samym zgłoszeniu zmiany; ten strażnik istnieje po to, żeby piąte
// takie miejsce nie przeszło po cichu.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Katalog główny repozytorium (ten plik leży w `src/lib/__tests__/`). */
const KORZEN = resolve(__dirname, "../../..");

/**
 * Miejsca, w których zapis surowym SQL-em jest ŚWIADOMIE dopuszczony —
 * każde przejrzane pole po polu i każde zgodne z A1 (bez `actor_id`).
 *
 * Dopisanie pozycji do tej listy jest decyzją przeglądu, nie formalnością:
 * oznacza „ten zapis omija kontrakt TypeScriptu i sprawdziliśmy go ręcznie".
 */
const DOPUSZCZONE = [
	// Zaciąg uczestników pilotażu — `actor_type='operator'`, bez `actor_id`,
	// `target_id` = `students.id` (kaskada z konta). ADR §3.3 poz. 1.
	"tools/pilot-enroll.ts",
	// Włącz operacyjny gaszenia flagi obrony — po naprawie A1 bez `actor_id`.
	"tools/viva-flag-off-recompute.ts",
	// Sonda migracji K3 — wstawka kontrolna `('system','k3-validate-probe')`.
	"tools/k3-validate.ts",
	// Historyczna migracja `tenant.backfill.unmapped`, bez `actor_id`.
	// ADR §3.3 poz. 2. Historii migracji się nie przepisuje.
	"drizzle/0006_far_shaman.sql",
	// Oprzyrządowanie testu miernika placementu — wiersz-atrapa bez `actor_id`.
	"src/lib/curriculum/__tests__/placement-metric.integration.test.ts",
	// Ten plik — cytuje wzorzec w komentarzu i w danych testu.
	"src/lib/__tests__/audit-obejscie-surowym-sql.test.ts",
];

type Trafienie = { plik: string; linia: number; tresc: string };

/**
 * Szuka po ŚLEDZONYCH plikach repozytorium (`git grep`), nie po dysku — dzięki
 * temu wynik nie zależy od tego, co ktoś ma w `node_modules`, w `.next`
 * ani w niezacommitowanym śmieciu obok.
 */
function znajdzSuroweWstawki(): Trafienie[] {
	let wyjscie = "";
	try {
		wyjscie = execFileSync(
			"git",
			["grep", "-n", "-I", "-i", "-E", 'insert +into +"?audit_log', "--", "."],
			{ cwd: KORZEN, encoding: "utf8" },
		);
	} catch (err) {
		// `git grep` kończy kodem 1 przy zerowej liczbie trafień — to nie awaria.
		const e = err as { status?: number; stdout?: string };
		if (e.status === 1) return [];
		throw err;
	}
	return wyjscie
		.split("\n")
		.filter(Boolean)
		.map((linia) => {
			const m = linia.match(/^([^:]+):(\d+):(.*)$/);
			if (!m) throw new Error(`Nieoczekiwany format wyjścia git grep: ${linia}`);
			return { plik: m[1], linia: Number(m[2]), tresc: m[3] };
		});
}

describe("S-A1-4 · obejscie kontraktu TypeScriptu — surowy INSERT do audit_log", () => {
	const trafienia = znajdzSuroweWstawki();

	it("wzorzec faktycznie cos znajduje (straznik nie przechodzi na pustym zbiorze)", () => {
		// Bez tej asercji cały plik byłby zielony także wtedy, gdyby wyszukiwanie
		// przestało działać — rodzina awarii „mechanizm melduje w porządku".
		expect(trafienia.length).toBeGreaterThanOrEqual(4);
	});

	it("A1: zadna surowa wstawka nie zapisuje kolumny actor_id", () => {
		const lamiace = trafienia.filter((t) => /\bactor_id\b/.test(t.tresc));
		expect(
			lamiace.map((t) => `${t.plik}:${t.linia} → ${t.tresc.trim()}`),
			"Surowy INSERT do audit_log z kolumną actor_id omija typ AuditEntry " +
				"i przywraca dług A-1. Usuń kolumnę albo — jeśli to zdarzenie klasy 2 " +
				"(faculty/operator) — przeprowadź przez recordAudit.",
		).toEqual([]);
	});

	it("kazde miejsce zapisu surowym SQL-em jest na liscie przejrzanych", () => {
		const nieznane = [...new Set(trafienia.map((t) => t.plik))].filter(
			(p) => !DOPUSZCZONE.includes(p),
		);
		expect(
			nieznane,
			"Nowe miejsce zapisu do audit_log z pominięciem recordAudit. " +
				"Jeśli jest świadome i zgodne z A1 — dopisz je do DOPUSZCZONE w tym pliku " +
				"razem z jednozdaniowym uzasadnieniem (to pozycja przeglądu, nie formalność).",
		).toEqual([]);
	});
});
