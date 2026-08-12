import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * STRAŻNIK ZASIĘGU — kto w ogóle może sięgnąć na bazę produkcyjną.
 *
 * `assertTestDb(dsn, varName, { allowProduction: true })` to jedyne wejście do
 * polityki ceremonii (host zdalny przechodzi po ustawieniu CONFIRM_PROD_DB=1).
 * Bez tej deklaracji narzędzie ma odmowę bezwarunkową — żadna zmienna
 * środowiskowa jej nie obchodzi.
 *
 * Ten test pilnuje, żeby lista uprawnionych narzędzi była DECYZJĄ, a nie skutkiem
 * ubocznym. Dopisanie `allowProduction` do dowolnego narzędzia spoza listy niżej
 * zapala bramkę na czerwono — poszerzenie dostępu do produkcji nie przejdzie po cichu.
 *
 * Geneza (2026-08-12, Ryan/CRCO): poprzednia warstwa „ostatniej linii obrony"
 * dopasowywała fragment `"skill-bridge-ai"` — nazwę projektu na Vercelu, wpisaną
 * z pamięci — który w adresie bazy produkcyjnej nie występuje ani razu. Warstwa
 * nie broniła przed niczym, co nazywała, a jej test świecił się na zielono, bo
 * testował na zmyślonym adresie. Reguła ma dziś JEDEN nośnik (polaryzacja
 * allowlisty w `tools/assert-test-db.ts`) i tego strażnika (kto ma wyjątek).
 */

const REPO = resolve(__dirname, "../../..");

/**
 * Katalogi skanowane. NIE tylko `tools/` — konsumenci guarda są też w `src/`
 * (`src/test/integration-db-guard.ts`) i w `tests/` (pomocnicy Playwrighta).
 * Pomocnik w `src/`, który dopisałby sobie ceremonię, byłby dla strażnika
 * skanującego wyłącznie `tools/` NIEWIDZIALNY (znalezisko Leo N2, #298).
 */
const KATALOGI_SKANOWANE = ["tools", "src", "tests"];

/**
 * Narzędzia z UDOKUMENTOWANĄ ceremonią produkcyjną (delegacja v1.12, CLAUDE.md §5).
 * Każda pozycja ma źródło decyzji — jeśli dopisujesz nową, dopisz też źródło.
 */
const CEREMONIE_PRODUKCYJNE = [
	// Migracja schemy prod — delegacja v1.12 (CLAUDE.md §5 pkt 1–3).
	"tools/db-guard-migrate.ts",
	// db:push (przestarzałe, ale udokumentowana ścieżka prod w nagłówku narzędzia).
	"tools/db-guard-push.ts",
	// Drizzle Studio — podgląd prod (odczyt) przy ceremonii.
	"tools/db-guard-studio.ts",
	// Zaciągi treści na prod — runbook aktywacji 1E.2, ADR 009/010.
	"tools/ingest-curriculum.ts",
	"tools/ingest-career-model.ts",
	"tools/ingest-exam-bank.ts",
	"tools/ingest-question-bank.ts",
	"tools/content-b3-theory.ts",
	"tools/content-cyber-projects.ts",
	// Remediacja duplikatów — nagłówek narzędzia: uruchamiana na prod po backupie.
	"tools/remediate-duplicate-submissions.ts",
].sort();

/**
 * Narzędzia, którym produkcji odmawiamy Z ZASADY — nazwane wprost, żeby cofnięcie
 * tej decyzji wymagało skasowania asercji, a nie samego dopisania flagi.
 */
const NIGDY_PRODUKCJA = [
	// CLAUDE.md §5 bramka (c): „NIGDY niszczący db:seed na prod".
	"tools/db-guard-seed.ts",
	// Egzekucja retencji = nieodwracalna modyfikacja danych osobowych.
	// Ceremonia prod dla tego narzędzia wymaga osobnej decyzji właściciela.
	"tools/enforce-retention.ts",
	// Narzędzie wykonujące DOWOLNY plik .sql — najszerszy możliwy kształt ryzyka,
	// bez udokumentowanej ceremonii prod (wgranie rynku 2026-06-25 szło konsolą Neona).
	"tools/run-sql-file.ts",
	// Narzędzia testowe / fixture'owe.
	"tools/b5-contract-test.ts",
	"tools/seed-e2e.ts",
	"tools/migrate-test.ts",
	"tools/fixtures/seed-a11y-fixtures.ts",
];

/**
 * Pliki .ts w skanowanych katalogach (rekurencyjnie), ścieżki względne do repo.
 *
 * Pomijamy SAME TESTY (`*.test.ts`, katalogi `__tests__`): test opisujący tę
 * regułę musi cytować `allowProduction`, więc liczony jako konsument dawałby
 * fałszywy alarm — dokładnie ta wada, przez którą strażnik A-1 czerwienił się
 * na własnej dokumentacji. Pomocnicy testowi NIE-będący testami zostają w zasięgu.
 */
function plikiTs(dir: string): string[] {
	const out: string[] = [];
	for (const wpis of readdirSync(dir)) {
		const pelna = join(dir, wpis);
		if (statSync(pelna).isDirectory()) {
			if (wpis === "node_modules" || wpis === "__tests__" || wpis === ".next") continue;
			out.push(...plikiTs(pelna));
			continue;
		}
		if (!wpis.endsWith(".ts") && !wpis.endsWith(".tsx")) continue;
		if (/\.(test|spec)\.tsx?$/.test(wpis)) continue;
		out.push(relative(REPO, pelna).split("\\").join("/"));
	}
	return out;
}

/** Pliki, które deklarują wejście do polityki ceremonii produkcyjnej. */
function narzedziaZCeremonia(): string[] {
	return KATALOGI_SKANOWANE.flatMap((k) => plikiTs(join(REPO, k)))
		.filter((sciezka) => {
			// Sam guard definiuje opcję — nie jest jej konsumentem.
			if (sciezka === "tools/assert-test-db.ts") return false;
			return /allowProduction\s*:\s*true/.test(readFileSync(join(REPO, sciezka), "utf8"));
		})
		.sort();
}

describe("zasięg ceremonii produkcyjnej (allowProduction)", () => {
	it("lista narzędzi z dostępem do produkcji jest DOKŁADNIE taka, jak spisana", () => {
		expect(narzedziaZCeremonia()).toEqual(CEREMONIE_PRODUKCYJNE);
	});

	it("narzędzia z zakazem zasadniczym NIE mają deklaracji ceremonii", () => {
		const zCeremonia = new Set(narzedziaZCeremonia());
		for (const sciezka of NIGDY_PRODUKCJA) {
			expect(zCeremonia.has(sciezka), `${sciezka} nie może mieć allowProduction`).toBe(false);
		}
	});

	it("każde narzędzie z zakazem zasadniczym nadal istnieje i woła guard", () => {
		// Kontrola dodatnia dla samego strażnika: gdyby plik zniknął albo przestał
		// wołać guard, powyższa asercja przechodziłaby pusto (fałszywa zieleń).
		for (const sciezka of NIGDY_PRODUKCJA) {
			const tresc = readFileSync(join(REPO, sciezka), "utf8");
			expect(tresc, `${sciezka} musi wołać assertTestDb`).toMatch(/assertTestDb\s*\(/);
		}
	});
});
