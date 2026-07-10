import { expect } from "@playwright/test";
import { Client } from "pg";
import { loginWithPassword } from "./helpers/auth";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite @llm — B7/1.16b: obrona ustna (viva) w widoku projektu, E2E na
 * żywym sędzim (Sonnet).
 *
 * Zakres dowodu: baner zaproszenia → start → 3 pytania po kolei (zero
 * feedbacku w trakcie) → żywy sędzia per odpowiedź → ekran wyniku → stan
 * w DB spójny z UI → rehydracja po reloadzie → licznik kosztu rośnie
 * (ai_usage_ledger scope 'viva.judge' +3).
 *
 * Sesję obrony (pending, zamrożone pytania) spec OSADZA w bazie sam — pełna
 * ścieżka „submit → werdykt maszyny 'verified' → krok 6-prep generuje pytania"
 * wymaga niedeterministycznego werdyktu żywego potoku na realnym repo; sama
 * generacja pytań ma osobne dowody (golden set + integracja 1.16a). Spec
 * używa WŁASNEGO projektu (slug e2e-viva-projekt) — nie dotyka zgłoszeń
 * innych speców.
 *
 * Wymagania środowiska (poza E2E_ALLOW_DB_WRITES=1 z guards):
 *  - serwer dev musi mieć FLAG_VIVA_DEFENSE=1 — sygnalizowane E2E_VIVA_FLAG=1,
 *  - serwer musi mieć ANTHROPIC_API_KEY (żywy sędzia) — jak B4/C11,
 *  - baza testowa w E2E_DATABASE_URL po `pnpm db:migrate:test` (0032)
 *    i `pnpm seed:e2e` (konto main).
 */

const DB_URL = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DB_URL);

const PROJECT_SLUG = "e2e-viva-projekt";
const MAIN_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-main@example.com";

/** Zamrożony plan pytań (kształt VivaQuestionSchema z 1.16a). */
const QUESTIONS = [
	{
		position: 0,
		question:
			"Dlaczego do wczytania i czyszczenia danych wybrałeś pandas, a nie czysty Python? " +
			"Wskaż co najmniej jeden konkretny plus tego wyboru w Twojej pracy.",
		filePath: "analiza.py",
	},
	{
		position: 1,
		question:
			"Jak sprawdziłeś jakość danych wejściowych przed analizą (braki, duplikaty, typy kolumn)? " +
			"Opisz konkretny krok, który wykonałeś.",
		filePath: "analiza.py",
	},
	{
		position: 2,
		question: "Które ustalenie z Twojej analizy uważasz za najważniejsze i jakie ma ograniczenia?",
		filePath: "raport.md",
	},
];

/** Merytoryczne odpowiedzi — u żywego sędziego powinny zdać (wzorzec golden set). */
const ANSWERS = [
	"Wybrałem pandas, bo read_csv od razu parsuje typy i daty (parse_dates, dtype), a operacje " +
		"są wektorowe — czyszczenie kolumn zrobiłem jedną linią zamiast pętli po wierszach. " +
		"W czystym Pythonie musiałbym ręcznie parsować CSV modułem csv, pilnować konwersji typów " +
		"i sam obsługiwać braki, co przy 50 tys. wierszy byłoby wolniejsze i bardziej podatne na błędy.",
	"Zacząłem od df.info() i df.isna().sum(), żeby zobaczyć typy kolumn i skalę braków. Duplikaty " +
		"usunąłem drop_duplicates po kluczu (data, region), bo eksport potrafił dublować wiersze. " +
		"Kolumnę z datą rzutowałem to_datetime z errors='coerce' i sprawdziłem, ile wierszy wypadło. " +
		"Braki w kolumnie sprzedaży uzupełniłem medianą per region, bo rozkład był skośny i średnia " +
		"zawyżałaby wartości.",
	"Najważniejsze ustalenie: wyraźna sezonowość sprzedaży z pikiem w Q4, powtarzalna w obu latach. " +
		"Ograniczenia: mam tylko dwa lata danych, więc nie odróżnię trendu od cyklu; wartości są " +
		"nominalne (bez korekty o inflację); to analiza korelacyjna — nie dowodzi przyczyn, " +
		"np. wpływu promocji, których nie mam w danych.",
];

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
	const client = new Client({ connectionString: DB_URL });
	await client.connect();
	try {
		return await fn(client);
	} finally {
		await client.end();
	}
}

async function countJudgeLedgerRows(): Promise<number> {
	return withDb(async (c) => {
		const res = await c.query(
			"SELECT count(*)::int AS c FROM ai_usage_ledger WHERE scope = 'viva.judge'",
		);
		return res.rows[0].c as number;
	});
}

/** Osadza projekt + zgłoszenie 'submitted' + sesję pending z zamrożonymi pytaniami. */
async function seedVivaState(): Promise<{ projectId: string; submissionId: string }> {
	return withDb(async (c) => {
		const student = await c.query(
			`SELECT s.id, s.tenant_id FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.email = $1`,
			[MAIN_EMAIL],
		);
		if (student.rowCount === 0) {
			throw new Error("Brak studenta e2e-main w bazie testowej — odpal `pnpm seed:e2e`.");
		}
		const studentId = student.rows[0].id as string;
		const tenantId = student.rows[0].tenant_id as string;

		await c.query(
			`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, source_url, rubric_json, status)
			 VALUES ($1, 'E2E — Obrona ustna (projekt testowy)', 'Projekt testowy B7: obrona ustna zgłoszenia.', 'L1', 2, 'open_data', 'https://example.org/e2e-viva', $2, 'active')
			 ON CONFLICT (slug) DO NOTHING`,
			[
				PROJECT_SLUG,
				JSON.stringify([
					{ criterion: "Wczytanie danych", weight: 100, description: "Dane wczytane" },
				]),
			],
		);
		const project = await c.query("SELECT id FROM projects WHERE slug = $1", [PROJECT_SLUG]);
		const projectId = project.rows[0].id as string;

		// Czysty start: kasacja poprzedniego zgłoszenia zdejmuje kaskadą sesje
		// vivy i ewentualne wiersze recenzji z poprzedniego przebiegu.
		await c.query("DELETE FROM project_submissions WHERE student_id = $1 AND project_id = $2", [
			studentId,
			projectId,
		]);
		const submission = await c.query(
			`INSERT INTO project_submissions (student_id, tenant_id, project_id, repo_url, submitted_at, score, status, needs_human_review, ai_review_json)
			 VALUES ($1, $2, $3, 'https://example.org/e2e-viva/repo', now(), 85, 'submitted', false, $4)
			 RETURNING id`,
			[
				studentId,
				tenantId,
				projectId,
				JSON.stringify({
					review: { feedback: "Praca oceniona pozytywnie (fixture E2E)." },
					recommendation: { verdict: "approve" },
					viva: { state: "pending", questionCount: QUESTIONS.length },
				}),
			],
		);
		const submissionId = submission.rows[0].id as string;

		await c.query(
			`INSERT INTO viva_sessions (submission_id, student_id, tenant_id, status, questions_json)
			 VALUES ($1, $2, $3, 'pending', $4)`,
			[submissionId, studentId, tenantId, JSON.stringify(QUESTIONS)],
		);
		return { projectId, submissionId };
	});
}

test.describe("@dbwrite @llm B7 Obrona ustna (panel w widoku projektu)", () => {
	test.skip(
		process.env.E2E_VIVA_FLAG !== "1",
		"Viva za flagą: ustaw E2E_VIVA_FLAG=1, gdy serwer dev ma FLAG_VIVA_DEFENSE=1.",
	);
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"Sędzia obrony woła żywy model (Sonnet) — serwer musi mieć ANTHROPIC_API_KEY.",
	);
	test.skip(
		!isLocalTestDb,
		"Spec osadza sesję obrony i czyta ai_usage_ledger — wskaż bazę testową w E2E_DATABASE_URL.",
	);

	test("student broni pracy: baner → 3 pytania → żywy sędzia → wynik; ledger +3; rehydracja", async ({
		page,
	}) => {
		// 3 wywołania sędziego po ~5–20 s + nawigacja i rehydracja.
		test.setTimeout(300_000);

		const { projectId, submissionId } = await seedVivaState();
		const ledgerBefore = await countJudgeLedgerRows();

		await loginWithPassword(page, "main");
		await page.goto(`/projects/${projectId}`);

		// Baner zaproszenia: komunikat wprost — kredencjał PO obronie (ADR-013 D4).
		await expect(page.getByRole("heading", { name: "Obrona ustna pracy" })).toBeVisible();
		await expect(page.getByText("po zdanej obronie")).toBeVisible();

		await page.getByRole("button", { name: "Rozpocznij obronę" }).click();

		// Pytania po kolei; między odpowiedziami ZERO feedbacku (brak werdyktów).
		for (let i = 0; i < QUESTIONS.length; i++) {
			await expect(page.getByText(`Pytanie ${i + 1} z ${QUESTIONS.length}`)).toBeVisible({
				timeout: 60_000,
			});
			await expect(page.getByText(QUESTIONS[i].question.slice(0, 60))).toBeVisible();
			await expect(page.getByRole("timer")).toBeVisible();
			await page.getByLabel("Odpowiedź na pytanie obrony").fill(ANSWERS[i]);
			await page.getByRole("button", { name: "Wyślij odpowiedź obrony" }).click();
		}

		// Rozstrzygnięcie (sędzia liczy W KODZIE ≥4/6; werdykt żywego modelu —
		// asertujemy ekran wyniku, nie konkretny werdykt).
		const outcome = page.locator(".viva-outcome");
		await expect(outcome).toBeVisible({ timeout: 90_000 });

		// Stan DB spójny z UI: sesja terminalna, zgłoszenie zgodne z wynikiem.
		const dbState = await withDb(async (c) => {
			const sess = await c.query(
				"SELECT status FROM viva_sessions WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1",
				[submissionId],
			);
			const sub = await c.query(
				"SELECT status, needs_human_review FROM project_submissions WHERE id = $1",
				[submissionId],
			);
			return { session: sess.rows[0].status as string, submission: sub.rows[0] };
		});
		expect(["passed", "failed"]).toContain(dbState.session);
		if (dbState.session === "passed") {
			await expect(outcome).toContainText("Obrona zdana");
			expect(dbState.submission.status).toBe("verified");
		} else {
			await expect(outcome).toContainText("Obrona niezaliczona");
			expect(dbState.submission.status).toBe("submitted");
			expect(dbState.submission.needs_human_review).toBe(true);
		}

		// DoD: licznik KOSZTU rośnie — sędzia zapisał wiersz per odpowiedź.
		const ledgerAfter = await countJudgeLedgerRows();
		expect(ledgerAfter).toBeGreaterThanOrEqual(ledgerBefore + QUESTIONS.length);

		// Rehydracja: reload odtwarza ekran wyniku z bazy (viva_sessions).
		await page.reload();
		await expect(page.locator(".viva-outcome")).toBeVisible();
	});
});
