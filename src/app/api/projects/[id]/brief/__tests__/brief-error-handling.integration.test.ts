// @vitest-environment node
//
// Z3 (Quinn, Agent QA): test realnego kontraktu endpointu briefu (błąd #4).
//
// GENEZA (docs/product/skillbridge-poprawki-rynek-plan-v0.1.md §2, błąd #4):
//   POST /api/projects/[id]/brief woła generateProjectBrief (model AI). Warstwa AI
//   RZUCA opisowy błąd przy złym JSON modelu ("AI zwróciło nieprawidłowy JSON",
//   generate-brief.ts:111). PRZED naprawą route wołał generateProjectBrief BEZ
//   try/catch → błąd leciał niezłapany → puste 500, ZERO logu z kontekstem
//   ("serwer połyka błąd modelu") — mimo że istnieje PII-bezpieczny logger
//   logError(scope, err, ctx) (src/lib/log.ts).
//   STAN PO NAPRAWIE (fix/b4-brief-observability, commity 558ec50 + 6b186b6):
//   route.ts owija generowanie+persystencję w try/catch, w catch woła
//   logError("brief.generate", err, { projectId, studentId }) i zwraca OPISOWY
//   5xx (502) — surowy błąd modelu/stack NIE wychodzi do klienta. Ten plik jest
//   teraz STRAŻNIKIEM REGRESJI tej naprawy (bramy B+C odwrócone z it.fails na it).
//
// CO TESTUJEMY (warstwa route — sedno ryzyka błędu #4 + Z3: auth + izolacja):
//   Realny handler POST na realnej bazie testowej. Atrapujemy TYLKO to, co poza
//   kontrolą i na kontrakcie (reguła skills/qa/SKILL.md §3): model AI
//   (generateProjectBrief) oraz auth (getSession). Baza, withTenantContext (RLS),
//   logowanie — realne. Rate-limit NIE atrapowany (rateLimiters.aiHeavy = null bez
//   Upstash → applyRateLimit przepuszcza, rate-limit.ts:36).
//
// STRUKTURA (po naprawie #4 — bramy B+C odwrócone z it.fails na it, strażnik regresji):
//   A. Auth + lookup (ZIELONE) — 401 bez sesji; 404 nieznany user. Dowód izolacji:
//      studentId pochodzi z SESJI, nie z requestu (nie da się podać cudzego).
//   B. Strażnik regresji #4 (ZIELONE) — model rzuca → route NIE propaguje niezłapanego
//      błędu (zwraca Response) i LOGUJE z kontekstem. Pilnuje, że błąd nie wraca do
//      połknięcia. PRZED naprawą był charakteryzacją stanu-zepsutego (route propaguje +
//      nie loguje); odwrócony, bo ten stan przestał być prawdą po try/catch.
//   C. Kontrakt docelowy obserwowalności #4 (ZIELONE — była BRAMA it.fails) — route
//      łapie błąd modelu, loguje z kontekstem (projectId, studentId), zwraca OPISOWY
//      5xx (nie puste 500). it.fails → it: brama zaliczona po naprawie route.ts.
//   D. Happy path + izolacja zapisu (ZIELONE) — brief zapisany pod studentem z sesji
//      przez withTenantContext (RLS app_student).
//
// Konwencja scope logu ("brief.generate") i kształt opisowego błędu — uzgodnione w
// review Ethana (6b186b6, G1 standard ustala Ethan). Naprawa #4 zrealizowana —
// warunek "NIE merge bez naprawy" spełniony; ten plik dowodzi naprawy (anty-mask:
// B+C realnie asertują złapanie+log+opisowy 5xx, nie maskują).

import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

// ── Fixtury o stałych ID (wzorzec b3-theory.integration) ────────────────────────
const TENANT_ID = "33333333-3333-3333-3333-333333333333";
const USER_ID = "z3-user-brief-test";
const STUDENT_ID = "44444444-4444-4444-4444-444444444444";
const PROJECT_ID = "55555555-5555-5555-5555-555555555555";

// ── Atrapy kontraktowe (poza naszą kontrolą) ────────────────────────────────────
const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const generateBriefMock = vi.fn();
vi.mock("@/lib/ai/generate-brief", () => ({
	generateProjectBrief: (...a: unknown[]) => generateBriefMock(...a),
}));

const FAKE_BRIEF = {
	objective: "Cel testowy.",
	inputData: "Dane testowe.",
	suggestedSteps: ["Krok 1", "Krok 2"],
	learningSteps: [],
	successDefinition: "Sukces testowy.",
	acceptanceCriteria: [{ criterion: "Kryterium", weight: 100, description: "Opis" }],
};

let pool: Pool | undefined;
// biome-ignore lint/suspicious/noExplicitAny: spy console.error — inspekcja argumentów logu.
let errorSpy: any;

/** Czy któreś wywołanie console.error niosło kontekst z naszym projectId (logError z ctx). */
function loggedWithProjectCtx(): boolean {
	return errorSpy.mock.calls.some((c: unknown[]) => {
		const ctx = c[1] as { projectId?: unknown } | undefined;
		return !!ctx && typeof ctx === "object" && ctx.projectId === PROJECT_ID;
	});
}

async function callBrief(): Promise<Response> {
	const { POST } = await import("@/app/api/projects/[id]/brief/route");
	return POST(new Request("http://localhost/api/projects/x/brief", { method: "POST" }), {
		params: Promise.resolve({ id: PROJECT_ID }),
	});
}

beforeAll(async () => {
	if (!isLocalTestDb) return;
	pool = new Pool({ connectionString: DATABASE_URL });

	// Precheck roli (N2, review Leo): blok D ćwiczy SET LOCAL ROLE app_student przez
	// withTenantContext (tenant-context.ts:54). Bez tej roli (baza bez migracji 0011)
	// route rzuciłby na SET ROLE — a wtedy it.fails bloku C „przeszedłby" z niewłaściwego
	// powodu (fałszywa zieleń bramy). Zamieniamy cichy fałszywy-pozytyw na głośny fail
	// setupu (lekcja skills/qa/SKILL.md §7: fail ma powiedzieć GDZIE jest błąd).
	const role = await pool.query("SELECT 1 FROM pg_roles WHERE rolname = 'app_student'");
	if (role.rowCount === 0) {
		throw new Error(
			"Baza testowa bez roli app_student (migracja 0011 nie zastosowana). Uruchom: pnpm db:migrate:test",
		);
	}

	// Sprzątanie idempotentne (kolejność FK) + seed świeżych fixtur.
	await pool.query("DELETE FROM project_submissions WHERE project_id = $1", [PROJECT_ID]);
	await pool.query("DELETE FROM students WHERE id = $1", [STUDENT_ID]);
	await pool.query("DELETE FROM projects WHERE id = $1", [PROJECT_ID]);
	await pool.query('DELETE FROM "user" WHERE id = $1', [USER_ID]);
	await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_ID]);

	await pool.query("INSERT INTO tenants (id, slug, name) VALUES ($1,'z3-tenant','Z3 Tenant')", [
		TENANT_ID,
	]);
	await pool.query(
		'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ($1,$2,$3,true,now(),now())',
		[USER_ID, "Z3 Brief User", "z3-brief@example.com"],
	);
	await pool.query(
		`INSERT INTO students (id, user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, created_at, updated_at)
		 VALUES ($1,$2,$3,'Test Uni','Informatyka',4,'Data Analyst',true,now(),now())`,
		[STUDENT_ID, USER_ID, TENANT_ID],
	);
	await pool.query(
		`INSERT INTO projects (id, slug, title, description, level, estimated_hours, source_type, rubric_json, status)
		 VALUES ($1,'z3-brief-project','Z3 Brief Project','Opis projektu testowego.','L1',4,'open_data','[]','active')`,
		[PROJECT_ID],
	);
}, 30_000);

afterAll(async () => {
	if (pool) {
		await pool.query("DELETE FROM project_submissions WHERE project_id = $1", [PROJECT_ID]);
		await pool.query("DELETE FROM students WHERE id = $1", [STUDENT_ID]);
		await pool.query("DELETE FROM projects WHERE id = $1", [PROJECT_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [USER_ID]);
		await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_ID]);
		await pool.end();
	}
});

beforeEach(() => {
	vi.clearAllMocks();
	errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
	errorSpy.mockRestore();
	// Po happy-path: sprzątnij wstawiony submission, by test był powtarzalny.
	if (pool) await pool.query("DELETE FROM project_submissions WHERE project_id = $1", [PROJECT_ID]);
});

// ── A. Auth + lookup — izolacja przez sesję ─────────────────────────────────────
d("Brief — auth i lookup (izolacja: studentId z sesji)", () => {
	it("bez sesji → 401, model nie wołany", async () => {
		getSessionMock.mockResolvedValue(null);
		const res = await callBrief();
		expect(res.status).toBe(401);
		expect(generateBriefMock).not.toHaveBeenCalled();
	});

	it("sesja nieznanego usera → 404 (student nie istnieje), model nie wołany", async () => {
		getSessionMock.mockResolvedValue({ user: { id: "ktos-bez-studenta" } });
		const res = await callBrief();
		expect(res.status).toBe(404);
		expect(generateBriefMock).not.toHaveBeenCalled();
	});
});

// ── B. Strażnik regresji #4 — błąd modelu ZŁAPANY, nie połknięty ─────────────────
// Przepisane z charakteryzacji stanu-zepsutego (Leo, fix #4 cz.1, strumień B). Stan
// przed naprawą (model rzuca → route propaguje niezłapany, NIE loguje) przestał być
// prawdą po dodaniu try/catch w route.ts. Zamiast usuwać test, odwracamy go w strażnika
// regresji: pilnuje, że błąd modelu NIE wraca do połknięcia (route NIE rzuca + LOGUJE).
// To NIE jest "żeby przeszło" — to drugi kąt na ten sam kontrakt co blok C (B: handler
// nie rzuca i loguje; C: kształt opisowego 5xx + status). FINALNY werdykt o tym
// przepisaniu należy do Quinna (właściciel bram Z3).
d("Brief — strażnik regresji #4 (błąd modelu ZŁAPANY + zalogowany, nie połknięty)", () => {
	it("model rzuca → route NIE propaguje niezłapanego błędu i LOGUJE z kontekstem", async () => {
		getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
		generateBriefMock.mockRejectedValue(new Error("AI zwróciło nieprawidłowy JSON"));

		// Po naprawie: handler zwraca Response (nie rzuca) — błąd jest obsłużony, nie połknięty.
		const res = await callBrief();
		expect(res).toBeInstanceOf(Response);
		// I jest zalogowany z kontekstem (endpoint=brief, projectId, studentId) przez logError.
		expect(loggedWithProjectCtx()).toBe(true);
	});
});

// ── C. Kontrakt docelowy — obserwowalność + opisowy błąd (BRAMA #4 cz.1) ─────────
// it.fails → it: brama zaliczona po naprawie route.ts (try/catch + logError + opisowy
// 5xx, Leo, fix #4 cz.1, strumień B). Werdykt o zdjęciu it.fails należy do Quinna.
d("Brief — kontrakt docelowy (brama obserwowalności #4)", () => {
	it("model rzuca → route łapie, loguje z kontekstem, zwraca OPISOWY 5xx (nie puste 500)", async () => {
		getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
		generateBriefMock.mockRejectedValue(new Error("AI zwróciło nieprawidłowy JSON"));

		// CEL: błąd modelu jest OBSŁUŻONY — route zwraca Response, nie rzuca.
		const res = await callBrief();
		expect(res.status).toBeGreaterThanOrEqual(500);
		const body = (await res.json()) as { error?: string };
		expect(typeof body.error).toBe("string");
		expect((body.error ?? "").length).toBeGreaterThan(0);
		// CEL: zalogowane z kontekstem (logError("brief", err, { projectId, studentId })).
		expect(loggedWithProjectCtx()).toBe(true);
	});
});

// ── D. Happy path + izolacja zapisu ─────────────────────────────────────────────
d("Brief — happy path i izolacja zapisu (RLS app_student)", () => {
	it("model zwraca brief → 200 + brief; submission zapisany pod studentem z sesji", async () => {
		getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
		generateBriefMock.mockResolvedValue(FAKE_BRIEF);

		const res = await callBrief();
		expect(res.status).toBe(200);
		const body = (await res.json()) as { brief: typeof FAKE_BRIEF };
		expect(body.brief).toEqual(FAKE_BRIEF);
		expect(generateBriefMock).toHaveBeenCalledWith(PROJECT_ID, STUDENT_ID);

		// Izolacja: wiersz zapisany pod STUDENT_ID z sesji (nie pod innym).
		const rows = await pool?.query(
			"SELECT student_id, ai_review_json FROM project_submissions WHERE project_id = $1",
			[PROJECT_ID],
		);
		expect(rows?.rows.length).toBe(1);
		expect(rows?.rows[0].student_id).toBe(STUDENT_ID);
		expect(rows?.rows[0].ai_review_json.brief).toEqual(FAKE_BRIEF);
	});
});
