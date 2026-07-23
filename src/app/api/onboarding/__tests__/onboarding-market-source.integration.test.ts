// @vitest-environment node
//
// ADR-021 — MUTACJA ADWERSARYJNA (Quinn / bramka QA): serwer NADPISUJE deklarację
// klienta wartością KATALOGOWĄ na powierzchni WYCHODZĄCEJ (employer-facing).
//
// DLACZEGO OSOBNY PLIK (nota Maxa — punkt zaczepienia):
// istniejący `onboarding-not-complete.integration.test.ts` (blok Partii 4, :224-299)
// wysyła `marketPercentage` ZGODNE z zasianym katalogiem (SQL=90, Python=70) i asertuje
// zapis 90/70. Po naprawie zostaje zielony, ale przez tę ZGODNOŚĆ nie dowodzi nadpisania —
// 90==90 przechodzi i gdy serwer czyta z ciała, i gdy czyta z katalogu. To fałszywy dowód.
// Ta mutacja CELOWO ROZJEŻDŻA liczbę z ciała względem katalogu (body 99 vs katalog 55),
// więc tylko jedno źródło daje zielone — i pilnuje, że to KATALOG.
//
// CO DOWODZI (ponad test jednostkowy Maxa na granicy zapisu, `onboarding-route.test.ts`):
//   1. Rozjazd body-vs-katalog na REALNEJ bazie — złośliwy/legacy klient wstrzykuje
//      `marketPercentage` do surowego ciała; serwer i tak zapisuje wartość katalogową.
//   2. Off-catalog → `market_percentage IS NULL` (nie liczba z ciała, nie 0).
//   3. POWIERZCHNIA WYCHODZĄCA (§7, kredencjał): end-to-end przez publiczny
//      GET /api/passport/[id] (flaga OFF = domyślna ścieżka wycieku) — pracodawca
//      NIGDY nie widzi liczby z ciała, tylko katalog albo `null`.
//   4. DOWÓD WSTECZNY (empiryczny): publiczny paszport WIERNIE odbija kolumnę
//      `competencies.market_percentage`. Gdy wstrzyknąć do kolumny 99 (co robił zapis
//      PRZED naprawą — `8e7cb11^`: schema `route.ts:38` przyjmowała pole z ciała,
//      `:289` pisała je 1:1), paszport oddaje 99 pracodawcy. Naprawa zamyka klasę
//      U ŹRÓDŁA (kolumna = katalog), nie maskuje jej w dół.
//
// Test REALNY (nie mock bazy — skill QA §2 #4): prawdziwy handler onboardingu i
// prawdziwy handler paszportu na prawdziwej bazie testowej :5433. Mock tylko na
// granicy poza sednem ryzyka: auth, rate-limit, skill-map (graf poza zakresem).
// `persistMarketGaps` + `loadMarketCatalog` (serwerowe źródło popytu) NIEzamockowane.
//
// Wymaga DATABASE_URL na :5433 (localhost). Bez lokalnej bazy → describe.skip.

import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const TEST_USER_ID = "u-market-mutacja-quinn-integ";
const MAPPED_UNIVERSITY = "WSB Merito Szczecin";
const CG = "QA-Market-Mutacja-Quinn"; // unikalny cel → własny katalog, brak kolizji z seedem
const SHARE_TOKEN = "tok-market-mutacja-quinn-adwersaryjny";

// Rozjazd body↔katalog: liczby z CIAŁA celowo ≠ katalog. Serwer musi wybrać katalog.
const CATALOG_PYTHON = 55;
const CATALOG_SQL = 90;
const BODY_PYTHON = 99; // zatruta deklaracja (za wysoko)
const BODY_SQL = 1; // zatruta deklaracja (za nisko — dowód: to nie clamp, to POCHODZENIE)
const BODY_OFFCATALOG = 88; // off-catalog → musi wyjść null, nie 88

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiHeavy: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));
vi.mock("@/lib/ai/generate-skill-map", () => ({ generateSkillMap: vi.fn(async () => undefined) }));

const dBack = isLocalTestDb ? describe : describe.skip;

type PassportComp = { name: string; status: string; marketPercentage: number | null };
type PassportBody = { competencies: PassportComp[]; marketCoveragePercent: number };

dBack("ADR-021 mutacja — serwer nadpisuje ciało katalogiem; paszport publiczny czysty", () => {
	let pool: Pool | undefined;
	let studentId = "";

	/** Pula bez opcjonalności — testy nie dochodzą tu bez bazy (dBack = describe.skip). */
	function requirePool(): Pool {
		if (!pool) throw new Error("Brak puli połączeń bazy testowej — test nie powinien tu dotrzeć.");
		return pool;
	}

	async function cleanup() {
		if (!pool) return;
		const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [TEST_USER_ID]);
		for (const r of rows.rows) {
			await pool.query("DELETE FROM competencies WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM gaps WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM skill_maps WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM passports WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [r.id]);
		}
		await pool.query("DELETE FROM students WHERE user_id = $1", [TEST_USER_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [TEST_USER_ID]);
		await pool.query("DELETE FROM job_market_data WHERE career_goal = $1", [CG]);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		pool = new Pool({ connectionString: DATABASE_URL });
		await cleanup();
		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'Test MarketMutacja', 'market-mutacja-quinn@test.local', true, now(), now())`,
			[TEST_USER_ID],
		);
		// Katalog rynku celu CG — popyt POCHODZI stąd; ciało żądania go NIE ustawia.
		const market: [string, number, string][] = [
			["Python", CATALOG_PYTHON, "Język"],
			["SQL", CATALOG_SQL, "Dane"],
			["Docker", 20, "DevOps"], // niezaznaczony → luka (nieistotny dla asercji popytu)
		];
		for (const [name, demand, cat] of market) {
			await pool.query(
				"INSERT INTO job_market_data (career_goal, competency_name, demand_percentage, category) VALUES ($1, $2, $3, $4)",
				[CG, name, demand, cat],
			);
		}

		// ── ONBOARDING z ZATRUTYM ciałem ─────────────────────────────────────────
		// Złośliwy/legacy klient wstrzykuje `marketPercentage` do surowego JSON body.
		// (Max usunął pole z UI; ta mutacja dowodzi, że NAWET gdy przyjdzie, serwer
		// je ignoruje — „jakie JESZCZE wejście przechodzi" = ręczny POST.)
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
		const { POST } = await import("../route");
		const body = {
			university: MAPPED_UNIVERSITY,
			fieldOfStudy: "Informatyka",
			semester: 4,
			careerGoal: CG,
			syllabusText: "",
			competencies: [
				{ name: "Python", level: 3, marketPercentage: BODY_PYTHON, inSyllabus: false },
				{ name: "SQL", level: 2, marketPercentage: BODY_SQL, inSyllabus: false },
				// off-catalog: nazwa spoza katalogu ścieżki → popyt niewiadomy → null
				{ name: "Zupełnie Nieznana Umiejętność", level: 4, marketPercentage: BODY_OFFCATALOG },
			],
		};
		const res = await POST(
			new Request("http://localhost/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		);
		if (res.status !== 200) {
			throw new Error(`Onboarding zwrócił ${res.status} — mutacja nie może dojść do asercji.`);
		}
		const { rows } = await pool.query("SELECT id FROM students WHERE user_id = $1", [TEST_USER_ID]);
		studentId = rows[0].id;

		// Włącz publiczne udostępnianie paszportu (share_token + public_enabled) —
		// symuluje studenta, który wysłał link pracodawcy. To powierzchnia wychodząca.
		await pool.query(
			"UPDATE passports SET share_token = $1, public_enabled = true WHERE student_id = $2",
			[SHARE_TOKEN, studentId],
		);
	});

	afterAll(async () => {
		await cleanup();
		await pool?.end();
	});

	beforeEach(() => {
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
	});

	// ── 1. GRANICA ZAPISU: body ≠ katalog → kolumna == katalog; off-catalog → null ──
	it("zapis competencies: popyt z KATALOGU (55/90), NIE z ciała (99/1); off-catalog → NULL", async () => {
		const { rows } = await requirePool().query(
			"SELECT name, status, self_assessment, market_percentage FROM competencies WHERE student_id = $1",
			[studentId],
		);
		const byName = Object.fromEntries(rows.map((r) => [r.name, r]));

		// Rdzeń mutacji: 99 z ciała NADPISANE katalogiem 55.
		expect(byName.Python.market_percentage).toBe(CATALOG_PYTHON);
		expect(byName.Python.market_percentage).not.toBe(BODY_PYTHON);
		// Poison LOW (1) też nadpisany katalogiem 90 — dowód, że to POCHODZENIE, nie clamp.
		expect(byName.SQL.market_percentage).toBe(CATALOG_SQL);
		expect(byName.SQL.market_percentage).not.toBe(BODY_SQL);
		// Status nadal z samooceny (poziom klienta jest legalnym wejściem — HITL); rozdzielenie:
		// serwer ufa POZIOMOWI (deklaracja nauki), nie POPYTOWI (kredencjał).
		expect(byName.Python.status).toBe("acquired");
		expect(byName.SQL.status).toBe("in_progress");

		// Off-catalog: NULL (uczciwa niewiadoma), nie 88 z ciała, nie 0.
		const off = byName["Zupełnie Nieznana Umiejętność"];
		expect(off.market_percentage).toBeNull();
		expect(off.market_percentage).not.toBe(BODY_OFFCATALOG);
		expect(off.market_percentage).not.toBe(0);
	});

	// ── 2. POWIERZCHNIA WYCHODZĄCA: publiczny paszport nigdy nie odbija liczby z ciała ──
	it("GET /api/passport/[token] (publiczny, flaga OFF): popyt katalogowy albo null, NIGDY z ciała", async () => {
		const { GET } = await import("@/app/api/passport/[id]/route");
		const res = await GET(new Request(`http://localhost/api/passport/${SHARE_TOKEN}`), {
			params: Promise.resolve({ id: SHARE_TOKEN }),
		});
		expect(res.status).toBe(200);
		const json = (await res.json()) as PassportBody;
		const byName = Object.fromEntries(json.competencies.map((c) => [c.name, c.marketPercentage]));

		// Pracodawca widzi katalog, nie deklarację studenta.
		expect(byName.Python).toBe(CATALOG_PYTHON);
		expect(byName.Python).not.toBe(BODY_PYTHON);
		expect(byName.SQL).toBe(CATALOG_SQL);
		expect(byName.SQL).not.toBe(BODY_SQL);
		// Off-catalog: null przechodzi na wyjście jako null (UI guarduje != null → ukryte).
		expect(byName["Zupełnie Nieznana Umiejętność"]).toBeNull();
		expect(byName["Zupełnie Nieznana Umiejętność"]).not.toBe(BODY_OFFCATALOG);

		// Żadna kompetencja w paszporcie NIE niesie liczby wstrzykniętej w ciele.
		const leaked = json.competencies.filter(
			(c) => c.marketPercentage === BODY_PYTHON || c.marketPercentage === BODY_OFFCATALOG,
		);
		expect(leaked).toEqual([]);
	});

	// ── 3. DOWÓD WSTECZNY (empiryczny): paszport WIERNIE odbija kolumnę ──
	// Gdyby onboarding wpisał do kolumny liczbę z ciała (co robił PRZED naprawą —
	// `8e7cb11^` route.ts:38 przyjmował pole, :289 pisał 1:1), pracodawca zobaczyłby 99.
	// Ten test dowodzi, że powierzchnia wychodząca jest wierna kolumnie — więc jedyną
	// tarczą jest czystość kolumny u źródła (co dają testy 1–2). Klasa zamknięta u ZAPISU.
	it("dowód wsteczny: kolumna=99 (stan sprzed naprawy) → paszport odbija 99 pracodawcy", async () => {
		// Wstrzykujemy do kolumny 99 — dokładnie to, co zapis sprzed naprawy dawał z ciała.
		await requirePool().query(
			"UPDATE competencies SET market_percentage = $1 WHERE student_id = $2 AND name = 'Python'",
			[BODY_PYTHON, studentId],
		);
		const { GET } = await import("@/app/api/passport/[id]/route");
		const res = await GET(new Request(`http://localhost/api/passport/${SHARE_TOKEN}`), {
			params: Promise.resolve({ id: SHARE_TOKEN }),
		});
		expect(res.status).toBe(200);
		const json = (await res.json()) as PassportBody;
		const python = json.competencies.find((c) => c.name === "Python");
		// Paszport publiczny odbija DOKŁADNIE to, co w kolumnie — 99 wyciekłoby do pracodawcy.
		expect(python?.marketPercentage).toBe(BODY_PYTHON);

		// Przywróć stan katalogowy (higiena — nie zostawiamy zatrutej kolumny po teście).
		await requirePool().query(
			"UPDATE competencies SET market_percentage = $1 WHERE student_id = $2 AND name = 'Python'",
			[CATALOG_PYTHON, studentId],
		);
	});
});
