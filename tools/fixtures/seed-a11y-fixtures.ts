// tools/fixtures/seed-a11y-fixtures.ts
// Seeder fixtures bramek dostępności (a11y) w CI — wstawia DOKŁADNIE te wiersze,
// na które wchodzą skany axe: moduł egzaminu 1E.3 (spec 62) i projekt tutora C11
// (spec 63). Zastępuje inline `psql` INSERT/SELECT z pr.yml (job a11y-exam) i daje
// deterministyczne, stałe UUID wejście specowi tutora (koniec z openFirstProject).
//
// DLACZEGO tsx zamiast psql:
//   - USUWA niejawną zależność od klienta `psql` na runnerze (był tylko implicite).
//   - JEDNO ŹRÓDŁO UUID: importuje stałe z tests/e2e-pw/fixtures/a11y-fixture-ids.ts
//     (te same, których używa spec) i GENERUJE z nich SQL — literał nie jest
//     przepisywany drugi raz, więc spec i baza nie mogą się rozjechać.
//   - REUŻYWA guarda bezpieczeństwa `assertTestDb` (hard-deny prod-DSN, allowlista
//     hostów lokalnych) — ten sam, co run-sql-file.ts / seed-e2e.ts. Zapis fixture
//     na prod jest technicznie niemożliwy z tego skryptu.
//   - Weryfikacja „dokładnie 1 wiersz" liczona w Node (nie surowy psql) — bramka
//     pada GŁOŚNO, gdy fixture nie wszedł, zamiast mylącego timeoutu w skanie.
//
// Użycie:  DATABASE_URL="postgres://…localhost…" pnpm exec tsx tools/fixtures/seed-a11y-fixtures.ts
// DSN nie jest nigdzie drukowany.

import pg from "pg";
import { EXAM_MODULE_ID, TUTOR_PROJECT_ID } from "../../tests/e2e-pw/fixtures/a11y-fixture-ids";
import { assertTestDb } from "../assert-test-db";

const dbUrl = process.env.DATABASE_URL;

// Guard PRZED połączeniem: zdalny host bez CONFIRM_PROD_DB=1 → rzuca; prod-DSN → hard-deny.
// CI (postgres w kontenerze na localhost) przechodzi cicho.
assertTestDb(dbUrl, "DATABASE_URL");

async function main(): Promise<void> {
	const client = new pg.Client({ connectionString: dbUrl });
	try {
		await client.connect();

		// Transakcyjnie i idempotentnie (ON CONFLICT (id) DO NOTHING) — ponowny bieg
		// nie dubluje ani nie modyfikuje istniejących wierszy fixture.
		await client.query("BEGIN");

		// Fixture modułu egzaminu (spec 62): strona egzaminu robi notFound() bez tego
		// wiersza. slug 'a11y-exam-fixture' — brak kolizji z drabiną curriculum.
		await client.query(
			`INSERT INTO curriculum_modules (id, slug, title)
			 VALUES ($1, 'a11y-exam-fixture', 'Moduł A (fixture a11y egzaminu)')
			 ON CONFLICT (id) DO NOTHING`,
			[EXAM_MODULE_ID],
		);

		// Fixture projektu tutora (spec 63): renderowalny detal projektu, żeby nagłówek
		// „Tutor projektu" się pokazał. tutor-API jest mockowane w teście, więc realne
		// dane tutora nie są potrzebne — potrzebny sam renderowalny wiersz projektu.
		// Kolumny bez wartości (rubric_json [], status 'active', deliverable_type 'mixed')
		// biorą DEFAULT ze schematu. slug 'a11y-tutor-fixture' — brak kolizji z seed-e2e.
		await client.query(
			`INSERT INTO projects (id, slug, title, description, level, estimated_hours, source_type, source_url)
			 VALUES ($1, 'a11y-tutor-fixture', 'Projekt A (fixture a11y tutora)',
			         'Projekt-fixture do skanu a11y panelu tutora (C11). Deterministyczne wejście.',
			         'L1', 3, 'open_data', 'https://example.org/a11y-tutor-fixture')
			 ON CONFLICT (id) DO NOTHING`,
			[TUTOR_PROJECT_ID],
		);

		await client.query("COMMIT");

		// Weryfikacja: DOKŁADNIE 1 wiersz każdego fixture. Brak = bramka pada GŁOŚNO tu,
		// nie mylącym timeoutem przycisku w skanie („zzielenieć na pusto" = zakazane).
		const check = await client.query<{ modules: string; projects: string }>(
			`SELECT
			   (SELECT count(*) FROM curriculum_modules WHERE id = $1) AS modules,
			   (SELECT count(*) FROM projects          WHERE id = $2) AS projects`,
			[EXAM_MODULE_ID, TUTOR_PROJECT_ID],
		);
		const modules = Number(check.rows[0].modules);
		const projects = Number(check.rows[0].projects);

		if (modules !== 1) {
			console.error(
				`::error::Fixture modułu egzaminu (${EXAM_MODULE_ID}) nieobecny (count=${modules}) — skan a11y renderowałby 404. Zatrzymuję.`,
			);
			process.exitCode = 1;
			return;
		}
		if (projects !== 1) {
			console.error(
				`::error::Fixture projektu tutora (${TUTOR_PROJECT_ID}) nieobecny (count=${projects}) — detal projektu renderowałby 404. Zatrzymuję.`,
			);
			process.exitCode = 1;
			return;
		}

		console.log(
			`Fixtures a11y OK — moduł egzaminu (1 wiersz) + projekt tutora (1 wiersz). Ścieżki skanu wyrenderują się.`,
		);
	} catch (e) {
		// Błąd w transakcji → Postgres wycofuje (COMMIT nie doszedł); nic częściowego.
		console.error("::error::Seeder fixtures a11y — błąd SQL:", (e as Error).message);
		process.exitCode = 1;
	} finally {
		await client.end();
	}
}

main();
