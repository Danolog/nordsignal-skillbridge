import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
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
	// #305 partia A — właz operacyjny na gaszenie flagi vivaDefense; własny
	// nagłówek: „Prod = czerwona linia: odpala Darek po backupie gałęzią Neona".
	"tools/viva-flag-off-recompute.ts",
	// #305 partia A — rejestr pilotażu o realnych osobach; miernik §6a czyta go
	// na produkcji. Do potwierdzenia przez Sophię (właścicielka produktu).
	"tools/pilot-enroll.ts",
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
	// #305 partia A — nadaje ROLĘ i UPRAWNIENIA (CREATE ROLE / ALTER ROLE ...
	// PASSWORD / GRANT). NIE mieści się w delegacji v1.12 (to nie migracja schemy
	// ani zaciąg danych), więc ścieżka produkcyjna wymaga osobnej ceremonii
	// z sign-offem Darka. Eskalacja Olivera 2026-08-12 — do decyzji fail-closed.
	"tools/activate-app-runtime.ts",
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

/**
 * Treść pliku BEZ KOMENTARZY — czyli to, co widzi kompilator, a nie to, co widzi
 * `grep`. Strażnik pyta „które narzędzie DEKLARUJE ceremonię", a deklaracją jest
 * kod, nie proza.
 *
 * Dlaczego to jest osobny krok, a nie regex po surowym pliku: pierwsza wersja
 * czerwieniła się na WŁASNEJ DOKUMENTACJI. Sprostowany nagłówek
 * `tools/enforce-retention.ts` cytuje `{ allowProduction: true }` w instrukcji
 * „jak to kiedyś otworzyć" — i strażnik uznał cytat za deklarację. To dokładnie
 * ta wada, którą zamyka #296 (strażnik A-1 karał za precyzyjny opis reguły);
 * lekarstwem nie jest pisanie dokumentacji nieprecyzyjnie, tylko czytanie kodu
 * jako kodu. Komentarze zdejmuje kompilator TypeScriptu, nie własny parser —
 * ta sama zasada co w `parseDbHost`: nie buduj drugiej wyroczni.
 */
function kodBezKomentarzy(sciezka: string): string {
	const zrodlo = readFileSync(join(REPO, sciezka), "utf8");
	return ts.transpileModule(zrodlo, { compilerOptions: { removeComments: true } }).outputText;
}

/**
 * Pliki, które deklarują wejście do polityki ceremonii produkcyjnej.
 *
 * ── DWA SITA, w tej kolejności — i to nie jest mikrooptymalizacja ──────────
 * (1) TANIE, po surowym tekście: plik, który nie zawiera nawet napisu
 *     `allowProduction`, nie może go mieć w kodzie. Odpada ~96% drzewa.
 * (2) DROGIE, przez kompilator: dopiero dla tej garstki zdejmujemy komentarze,
 *     żeby CYTAT w dokumentacji nie liczył się jako deklaracja.
 * Sito (1) nie może przepuścić niczego, co odrzuciłoby sito (2) — działa
 * w stronę bezpieczną: zawęża zbiór kandydatów, nie zbiór trafień.
 *
 * ── Dlaczego to jest naprawa BŁĘDU, nie przyspieszenie ────────────────────
 * Pierwsza wersja transpilowała CAŁE drzewo (360 plików) przy KAŻDYM z czterech
 * wywołań — 1440 przebiegów kompilatora na jeden plik testowy. Uruchomiona sama
 * mieściła się w limicie czasu; uruchomiona w pełnej suicie, przy rywalizacji
 * o procesor, przekraczała 5 s i padała z `Test timed out`. Czyli strażnik
 * MELDOWAŁ RÓŻNE RZECZY W ZALEŻNOŚCI OD TOWARZYSTWA: sam — zielony, w suicie —
 * czerwony, a komunikat („timed out") nie wskazywał na przyczynę, więc wyglądał
 * jak rozjazd listy. Diagnoza pojedynczym plikiem dawała zieleń i zamykała
 * sprawę — pułapka, w którą wpadł też pierwszy diagnozujący.
 *
 * Wniosek szerszy: strażnik, którego wynik zależy od obciążenia maszyny, jest
 * atrapą w trzecią stronę — nie kłamie o regule, tylko o tym, czy ją sprawdził.
 * Dlatego wynik liczymy RAZ (`memo`) i mierzymy tani warunek przed drogim.
 */
let memo: string[] | null = null;

function narzedziaZCeremonia(): string[] {
	if (memo) return memo;
	memo = KATALOGI_SKANOWANE.flatMap((k) => plikiTs(join(REPO, k)))
		.filter((sciezka) => {
			// Sam guard definiuje opcję — nie jest jej konsumentem.
			if (sciezka === "tools/assert-test-db.ts") return false;
			// Sito (1): tanie odsianie po surowym tekście.
			if (!readFileSync(join(REPO, sciezka), "utf8").includes("allowProduction")) return false;
			// Sito (2): dopiero teraz kompilator — cytat w komentarzu nie liczy się.
			return /allowProduction\s*:\s*true/.test(kodBezKomentarzy(sciezka));
		})
		.sort();
	return memo;
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

	it("CYTAT w komentarzu nie jest deklaracją, a kod jest (kontrola dwustronna)", () => {
		// Wada, na której ten strażnik już raz się przewrócił: sprostowany nagłówek
		// `enforce-retention.ts` cytuje `{ allowProduction: true }` w instrukcji
		// „jak to kiedyś otworzyć", a strażnik uznał cytat za deklarację.
		const tylkoKomentarz = `// przyklad: { allowProduction: true }\n/* { allowProduction: true } */\nconst x = 1;\n`;
		const wKodzie = `const x = { allowProduction: true };\n`;
		const bezKomentarzy = (zrodlo: string) =>
			ts.transpileModule(zrodlo, { compilerOptions: { removeComments: true } }).outputText;

		expect(/allowProduction\s*:\s*true/.test(bezKomentarzy(tylkoKomentarz))).toBe(false);
		expect(/allowProduction\s*:\s*true/.test(bezKomentarzy(wKodzie))).toBe(true);

		// I dowód na żywym pliku: enforce-retention cytuje frazę w nagłówku…
		expect(readFileSync(join(REPO, "tools/enforce-retention.ts"), "utf8")).toMatch(
			/allowProduction/,
		);
		// …a mimo to NIE jest liczony jako narzędzie z ceremonią.
		expect(narzedziaZCeremonia()).not.toContain("tools/enforce-retention.ts");
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
