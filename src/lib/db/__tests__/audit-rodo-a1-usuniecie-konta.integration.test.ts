// @vitest-environment node
//
// S-A1-2 — STRAŻNIK REGUŁY A1+A2 NA PRAWDZIWYCH TRASACH (ADR A-1 (a+), §5).
//
// Czego pilnuje: że wiersze `audit_log` powstające na jedenastu miejscach
// wywołania w zakresie A-1 nie niosą ani identyfikatora aktora (A1), ani
// kontekstu żądania (A2), ani identyfikatora osoby przemyconego pod inną nazwą.
//
// Test jedzie PRAWDZIWYMI trasami na PRAWDZIWEJ bazie. Atrapujemy wyłącznie to,
// co poza bazą: uwierzytelnienie, limit żądań, potok modelu językowego i sędziego
// obrony. Ścieżka zapisu audytu — ta, której dotyczy cała naprawa — jest realna
// od żądania HTTP do wiersza w tabeli.
//
// ── ZAKRES ZAWĘŻONY W TRAKCIE WYKONANIA — CZYTAJ, ZANIM DOPISZESZ TU KASOWANIE ─
//
// ADR §5 opisywał ten strażnik jako „pełną pętlę usunięcia konta": przejść trasy,
// wykonać `DELETE FROM "user"` i orzec, że `target_id` osierociał. TEJ POŁOWY
// TU NIE MA i jej brak jest DECYZJĄ, nie przeoczeniem.
//
// Powód (projekt ścieżki usuwania konta, Ethan, E1b §5, decyzja D-U6 i uwaga
// procesowa do Ryana): pętla kasująca surowym SQL-em byłaby ZIELONA także wtedy,
// gdyby prawdziwa ścieżka usunięcia konta w produkcie nie działała albo działała
// niekompletnie. Strażnik zielony przy zepsutej funkcji jest strażnikiem-atrapą —
// tą samą rodziną awarii, którą opisuje CLAUDE.md v1.17. Do tego byłby DRUGIM
// NOŚNIKIEM tej samej reguły co strażnik S-U-2 Ethana.
//
// Stan faktyczny, zweryfikowany na wersji Z GAŁĘZI (nie z cudzego dysku):
// `better-auth` 1.6.26 (`node_modules/better-auth/package.json` → "1.6.26";
// `package.json` gałęzi → "^1.6.26") ma trasę `/delete-user`, ale zamkniętą
// bramką `if (!ctx.context.options.user?.deleteUser?.enabled) throw
// APIError.fromStatus("NOT_FOUND")` (`dist/api/routes/update-user.mjs:288`),
// a nasza konfiguracja (`src/lib/auth/server.ts`) NIE MA klucza `user`
// (`git grep -c "deleteUser"` → zero trafień, kod wyjścia 1). Czyli: ścieżki
// usunięcia konta NIE DA SIĘ dziś wywołać z testu, bo produkt jej nie ma.
//
// LUKA NAZWANA WPROST (CLAUDE.md v1.17 — etykieta dopuszczalna, udawanie nie):
// **osierocenie `target_id` po usunięciu konta NIE JEST tu dowiedzione.**
// Dowodzą go dziś dwie rzeczy, każda od innej strony i żadna w pełni:
//   • S-A1-3 — że więzi kaskady istnieją w katalogu bazy (struktura),
//   • S-U-2 Ethana — pełna pętla przez prawdziwą ścieżkę (zachowanie), gdy
//     ścieżka powstanie.
// PRÓG KONSOLIDACJI (jawny, wymóg v1.17): w dniu włączenia `user.deleteUser`
// (E1b, pakiet 1) lista asercji z tego pliku przenosi się do S-U-2 i ten plik
// zostaje wyłącznie przy regule A1+A2 na trasach. Nie odtwarzać tu kasowania.
//
// ── TRZY WYMOGI TWARDE, KAŻDY Z NAZWANYM POWODEM ────────────────────────────
//
// (1) NAJPIERW DOWÓD, ŻE WIERSZE POWSTAŁY. Test „nie ma wierszy z actor_id" jest
//     zielony także wtedy, gdy nie wygenerował ANI JEDNEGO wiersza — a wtedy nie
//     sprawdza niczego. To rodzina awarii „mechanizm melduje w porządku" (baza
//     wiedzy QA, sesja 1E.7). Dlatego najpierw padamy, jeśli którykolwiek
//     z CZTERECH obszarów dał zero wierszy.
//
// (2) OBIE PRZESTRZENIE IDENTYFIKATORÓW W JEDNYM PRZEBIEGU. `actor_id` niósł
//     dwie różne przestrzenie: `user.id` przy zdarzeniach paszportu i
//     `students.id` przy reszcie (pomiar produkcji E0, F1/D5). Strażnik
//     ćwiczący jedną z nich byłby zielony także wtedy, gdyby druga została
//     nieobsłużona — dokładnie kształt awarii „naprawa wygląda na zrobioną".
//
// (3) `actor_id` I `ip_address` SPRAWDZANE OSOBNO. Strażnik patrzący tylko na
//     pierwsze przepuściłby błąd, który autor ADR popełnił 2026-08-01
//     (sprostowanie 0.3): adres IP jest daną osobową (motyw 30 RODO; TSUE
//     Breyer, C-582/14), więc samo pominięcie `actor_id` nie zamyka art. 17.
//     Stąd dwie rozłączne asercje i dwie rozłączne mutacje.
//
// Wymaga DATABASE_URL na localhost po `pnpm db:migrate:test`.

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CELE_KASKADY } from "./rodo-a1-cele-kaskady";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER_ID = "u-rodo-a1-kaskada";
const EMAIL = "rodo-a1-kaskada@test.local";
const PROJECT_SLUG = "rodo-a1-projekt";

// Kontekst żądania podstawiany NAPRAWDĘ — trasy dostają prawdziwe nagłówki.
// Gdyby któraś z nich wróciła do zapisywania kontekstu, w wierszu pojawi się
// dokładnie ta wartość i asercja A2 ją pokaże.
const IP_TESTOWE = "203.0.113.77";
const UA_TESTOWE = "Mozilla/5.0 (Straznik-A1)";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({
	headers: async () => new Headers({ "x-forwarded-for": IP_TESTOWE, "user-agent": UA_TESTOWE }),
}));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null, aiHeavy: null, tutorDaily: null, vivaDaily: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

const runReviewPipelineMock = vi.fn();
vi.mock("@/lib/ai/pipeline", async (importOriginal) => {
	const orig = await importOriginal<typeof import("@/lib/ai/pipeline")>();
	return { ...orig, runReviewPipeline: (...a: unknown[]) => runReviewPipelineMock(...a) };
});

const judgeMock = vi.fn();
vi.mock("@/lib/viva/judge-answer", async (importOriginal) => {
	const orig = await importOriginal<typeof import("@/lib/viva/judge-answer")>();
	return { ...orig, judgeVivaAnswer: (...a: unknown[]) => judgeMock(...a) };
});

const PYTANIA = [
	{ position: 0, question: "Dlaczego merge zamiast join?", filePath: "a.py", excerpt: "df.merge" },
	{ position: 1, question: "Co przy brakach danych?", filePath: "a.py", excerpt: "read_csv" },
	{ position: 2, question: "Skąd agregacja?", filePath: "r.md", excerpt: "resample" },
];

type WierszAudytu = {
	id: string;
	action: string;
	actor_type: string;
	actor_id: string | null;
	target_type: string | null;
	target_id: string | null;
	ip_address: string | null;
	user_agent: string | null;
	metadata: unknown;
};

dBack("S-A1-2 · regula A1+A2 na prawdziwych trasach (audit_log bez sladu osoby)", () => {
	let pool: Pool | undefined;
	let tenantId = "";
	let studentId = "";
	let projectId = "";
	let submissionId = "";
	let passportId = "";
	let poczatekPrzebiegu = "";
	let wiersze: WierszAudytu[] = [];

	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie po atrapach.
	let trasaPaszport: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let trasaZgoda: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let trasaSubmit: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let trasaStart: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let trasaOdpowiedz: any;

	const zadanie = (body: unknown) =>
		new Request("http://test.local/", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-forwarded-for": IP_TESTOWE,
				"user-agent": UA_TESTOWE,
			},
			body: JSON.stringify(body),
		});

	async function sprzatanie() {
		if (!pool) return;
		const s = await pool.query("SELECT id FROM students WHERE user_id = $1", [USER_ID]);
		for (const r of s.rows) {
			await pool.query(
				"DELETE FROM viva_answers WHERE session_id IN (SELECT id FROM viva_sessions WHERE student_id = $1)",
				[r.id],
			);
			await pool.query("DELETE FROM viva_sessions WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM passports WHERE student_id = $1", [r.id]);
		}
		await pool.query("DELETE FROM students WHERE user_id = $1", [USER_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [USER_ID]);
		await pool.query("DELETE FROM projects WHERE slug = $1", [PROJECT_SLUG]);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		process.env.FLAG_VIVA_DEFENSE = "1";
		process.env.FLAG_PLACEMENT_TRACKING = "1";
		pool = new Pool({ connectionString: DATABASE_URL });
		await sprzatanie();

		const t = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped' LIMIT 1");
		tenantId = t.rows[0].id;

		const p = await pool.query(
			`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, rubric_json)
			 VALUES ($1, 'Projekt RODO A-1', 'Opis.', 'L2', 20, 'open_data', '[]'::jsonb) RETURNING id`,
			[PROJECT_SLUG],
		);
		projectId = p.rows[0].id;

		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'RODO A1', $2, true, now(), now())`,
			[USER_ID, EMAIL],
		);
		const s = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Uczelnia', 'Informatyka', 4, 'Data Analyst') RETURNING id`,
			[USER_ID, tenantId],
		);
		studentId = s.rows[0].id;
		const pass = await pool.query(
			`INSERT INTO passports (student_id, tenant_id) VALUES ($1, $2) RETURNING id`,
			[studentId, tenantId],
		);
		passportId = pass.rows[0].id;

		getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
		runReviewPipelineMock.mockResolvedValue({
			score: 85,
			status: "verified",
			needsHumanReview: false,
			aiReviewJson: {
				review: { score: 85, feedback: "ok", cheatRiskScore: 0.1, criteriaScores: [] },
				recommendation: { verdict: "approve", rationale: "ok", evidenceRefs: [] },
			},
			flags: [],
			vivaPrep: { questions: PYTANIA },
		});
		judgeMock.mockResolvedValue({ points: 2, rationale: "ok", evidenceRefs: [] });

		trasaPaszport = await import("@/app/api/passport/share/route");
		trasaZgoda = await import("@/app/api/placement/consent/route");
		trasaSubmit = await import("@/app/api/projects/[id]/submit/route");
		trasaStart = await import("@/app/api/submissions/[id]/viva/start/route");
		trasaOdpowiedz = await import("@/app/api/submissions/[id]/viva/[sessionId]/answer/route");

		// ── Przebieg: cztery obszary, obie przestrzenie identyfikatorów ──────
		const t0 = await pool.query("SELECT now() AS teraz");
		poczatekPrzebiegu = t0.rows[0].teraz;

		// obszar 1 — PASZPORT (`actor_id` niósł tu `user.id`)
		const rPass = await trasaPaszport.POST(zadanie({ consentVersion: "v2" }));
		expect(rPass.status).toBe(200);
		const rPassOff = await trasaPaszport.DELETE(zadanie({}));
		expect(rPassOff.status).toBe(200);

		// obszar 2 — ZGODA (`actor_id` był DOSŁOWNIE równy `target_id`)
		const rZgoda = await trasaZgoda.POST(zadanie({ consent: true }));
		expect(rZgoda.status).toBe(200);

		// obszar 3 — ZGŁOSZENIE (`actor_id` niósł `students.id`)
		const rSubmit = await trasaSubmit.POST(zadanie({ repoUrl: "https://github.com/s/analiza" }), {
			params: Promise.resolve({ id: projectId }),
		});
		expect(rSubmit.status).toBe(200);
		submissionId = (await rSubmit.json()).submission.id;

		// obszar 4 — OBRONA (3 odpowiedzi po 2 pkt = 6/6 → passed + verified)
		const rStart = await trasaStart.POST(zadanie({}), {
			params: Promise.resolve({ id: submissionId }),
		});
		expect(rStart.status).toBe(200);
		const sesja = await pool.query(
			"SELECT id FROM viva_sessions WHERE submission_id = $1 AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1",
			[submissionId],
		);
		const sessionId = sesja.rows[0].id;
		for (let i = 0; i < 3; i++) {
			await trasaOdpowiedz.POST(zadanie({ answer: `Odpowiedź merytoryczna numer ${i + 1}.` }), {
				params: Promise.resolve({ id: submissionId, sessionId }),
			});
		}

		const zebrane = await pool.query<WierszAudytu>(
			`SELECT id, action, actor_type, actor_id, target_type, target_id,
			        ip_address, user_agent, metadata
			   FROM audit_log
			  WHERE created_at >= $1
			  ORDER BY created_at`,
			[poczatekPrzebiegu],
		);
		wiersze = zebrane.rows;
	}, 120_000);

	afterAll(async () => {
		delete process.env.FLAG_VIVA_DEFENSE;
		delete process.env.FLAG_PLACEMENT_TRACKING;
		await sprzatanie();
		await pool?.end();
	});

	// ── WYMÓG TWARDY (1): najpierw dowód, że jest co sprawdzać ────────────────

	it("przebieg wygenerowal co najmniej jeden wiersz z KAZDEGO z czterech obszarow", () => {
		const zdarzenia = wiersze.map((w) => w.action);
		const obszary: Record<string, (a: string) => boolean> = {
			paszport: (a) => a.startsWith("passport.share."),
			zgoda: (a) => a.startsWith("placement.consent."),
			zgloszenie: (a) => a === "submission.verified",
			obrona: (a) => a.startsWith("submission.viva."),
		};
		const puste = Object.entries(obszary)
			.filter(([, pasuje]) => !zdarzenia.some(pasuje))
			.map(([nazwa]) => nazwa);
		expect(
			puste,
			`Obszary bez ani jednego wiersza: ${puste.join(", ")}. Zdarzenia w przebiegu: ` +
				`${JSON.stringify(zdarzenia)}. Bez wierszy asercje niżej byłyby zielone i puste — ` +
				"strażnik przestałby cokolwiek strzec.",
		).toEqual([]);
	});

	it("przebieg objal OBIE przestrzenie identyfikatorow (paszport i zgloszenie)", () => {
		// Wiersze paszportu i zgłoszenia mają różne tabele docelowe, bo `actor_id`
		// niósł w nich różne przestrzenie: `user.id` przy paszporcie, `students.id`
		// przy reszcie. Sprawdzamy oba cele naraz — i że wskaźnik prowadzi do
		// WŁAŚCIWEGO obiektu, nie do byle czego, co się przypadkiem zgadza.
		const cele = new Set(wiersze.map((w) => w.target_type));
		expect([...cele].sort()).toEqual(
			expect.arrayContaining(["passports", "student", "submission"]),
		);
		const paszportowe = wiersze.filter((w) => w.target_type === "passports");
		expect(paszportowe.every((w) => w.target_id === passportId)).toBe(true);
		const zgloszeniowe = wiersze.filter((w) => w.target_type === "submission");
		expect(zgloszeniowe.every((w) => w.target_id === submissionId)).toBe(true);
	});

	// ── A1 i A2 — dwie ROZŁĄCZNE asercje, dwie rozłączne mutacje ──────────────

	it("A1: zaden wiersz przebiegu nie niesie actor_id", () => {
		const lamiace = wiersze
			.filter((w) => w.actor_id !== null)
			.map((w) => `${w.action} (actor_type=${w.actor_type}) → actor_id=${w.actor_id}`);
		expect(
			lamiace,
			"Wiersz audytu z identyfikatorem aktora. Po usunięciu konta ta kolumna " +
				"nadal grupuje komplet zachowań jednej osoby (art. 5 ust. 1 lit. c — " +
				"minimalizacja; art. 25 ust. 1 — ochrona w fazie projektowania).",
		).toEqual([]);
	});

	it("A2: zaden wiersz przebiegu nie niesie ip_address ani user_agent", () => {
		// ELEMENT NOŚNY PRAWNIE. Osobna asercja, bo strażnik sprawdzający tylko
		// A1 przepuściłby wiersz, który nadal jest daną osobową.
		const lamiace = wiersze
			.filter((w) => w.ip_address !== null || w.user_agent !== null)
			.map((w) => `${w.action} → ip=${w.ip_address} ua=${w.user_agent}`);
		expect(
			lamiace,
			`Wiersz audytu z kontekstem żądania. Trasy dostały nagłówki ${IP_TESTOWE} / ` +
				`${UA_TESTOWE} — jeśli któraś je zapisała, wiersz pozostaje daną osobową ` +
				"NA ZAWSZE (UPDATE na audit_log blokuje wyzwalacz append-only).",
		).toEqual([]);
	});

	it("zaden wiersz nie przemyca identyfikatora osoby POZA sankcjonowanym target_id", () => {
		// Ważniejsze od asercji nazwanych kolumn: identyfikator wciśnięty pod inną
		// nazwą — w `metadata`, w `actor_type`, gdziekolwiek — też ma przewrócić
		// ten test. Wzorzec przejęty ze strażnika A7.
		//
		// GRANICA, KTÓRĄ ZAPISUJĘ JAWNIE: `target_id` jest z tej asercji WYŁĄCZONY,
		// bo dla `placement.consent.*` trzyma `students.id` z DECYZJI (ADR D-1:
		// „target_id ZOSTAJE — to jedyny nośnik «czyja zgoda», potrzebny dopóki
		// konto żyje, art. 7 ust. 1"). Wyłączenie nie tworzy dziury: że ten
		// wskaźnik osierocia się po kaskadzie, dowodzi ODDZIELNIE test niżej,
		// wykonaniem `DELETE FROM "user"`. Gdyby ktoś wyłączył `target_id` również
		// tam, zniknąłby jedyny dowód — i to jest właściwe miejsce na czujność.
		const zTozsamoscia = wiersze
			.filter((w) => {
				const { target_id: _pomijamy, ...reszta } = w;
				const json = JSON.stringify(reszta);
				return json.includes(USER_ID) || json.includes(studentId);
			})
			.map((w) => `${w.action}: ${JSON.stringify(w)}`);
		expect(zTozsamoscia).toEqual([]);
	});

	// ── Jedyne wiązanie z osobą: cel MUSI leżeć na łańcuchu kaskady ───────────

	it("kazdy target_type z przebiegu lezy na lancuchu kaskady pilnowanym przez S-A1-3", async () => {
		// Po A1+A2 `target_id` jest JEDYNYM wiązaniem z osobą. Argument z motywu
		// 26 RODO działa wyłącznie wtedy, gdy wskazana tabela znika razem z kontem.
		// Trasa emitująca cel spoza łańcucha (np. `tenants`) utworzyłaby wiersz,
		// który NIGDY nie osieroci — i nikt by tego nie zauważył, bo `audit_log`
		// wyglądałby identycznie.
		//
		// Sprawdzamy dwie rzeczy naraz: (a) cel jest na liście, (b) wskaźnik
		// faktycznie rozwiązuje się DZIŚ do istniejącego wiersza tej tabeli —
		// bez (b) zgodna nazwa celu przy `target_id` z zupełnie innej tabeli
		// przeszłaby bez mrugnięcia.
		const spozaLancucha = [
			...new Set(wiersze.map((w) => w.target_type).filter((c): c is string => c !== null)),
		].filter((c) => !CELE_KASKADY[c]);
		expect(
			spozaLancucha,
			"target_type spoza łańcucha kaskady. Wiersz z takim celem nie osieroci się " +
				"po usunięciu konta, więc motyw 26 RODO przestaje się do niego stosować. " +
				"Dopisz tabelę do CELE_KASKADY i do WIEZI_KASKADY (S-A1-3) — albo zmień trasę.",
		).toEqual([]);

		const nierozwiazane: string[] = [];
		for (const w of wiersze) {
			if (!w.target_type || !w.target_id) continue;
			const tabela = CELE_KASKADY[w.target_type];
			const r = await pool?.query(`SELECT 1 FROM ${tabela} WHERE id::text = $1 LIMIT 1`, [
				w.target_id,
			]);
			if ((r?.rowCount ?? 0) === 0) nierozwiazane.push(`${w.action} → ${w.target_type}`);
		}
		expect(
			nierozwiazane,
			"Wskaźnik celu nie rozwiązuje się do wiersza deklarowanej tabeli — para " +
				"(target_type, target_id) jest niespójna, a wtedy zdanie 'wiązanie idzie " +
				"przez tabelę kaskadującą' nie opisuje tych wierszy.",
		).toEqual([]);
	});

	// ŚWIADOMIE NIE MA TU testu „po usunięciu konta target_id jest sierotą".
	// Powód, próg konsolidacji i nazwana luka — w nagłówku pliku. Zanim ktoś to
	// dopisze: pętla kasująca surowym SQL-em daje ZIELEŃ przy zepsutej ścieżce
	// produktu, a ścieżki produktu nie ma (bramka `user.deleteUser`, E1b).
	// AKTUALIZACJA 2026-08-12 (E1b): S-U-2 ISTNIEJE —
	// `rodo-e1b-usuniecie-konta-petla.integration.test.ts`. Luka nazwana w nagłówku
	// tego pliku („osierocenie target_id nie jest tu dowiedzione”) jest tam
	// domknięta ZACHOWANIEM: przebieg rejestruje konto prawdziwą ścieżką, zasiewa
	// dane, wywołuje `auth.api.deleteUser` i orzeka, że cel śladu nie rozwiązuje
	// się do żadnego konta.
	//
	// CZEGO TO NIE ZNACZY — i nikomu nie wolno raportować inaczej: tamten dowód
	// biegnie na BAZIE TESTOWEJ z flagą zapaloną w teście. Na produkcji flaga jest
	// zgaszona, więc zachowanie ścieżki na produkcji pozostaje NIEZWERYFIKOWANE
	// do dnia zapłonu.
	//
	// PRÓG KONSOLIDACJI Z NAGŁÓWKA — NADAL OTWARTY: lista asercji A1/A2 miała się
	// przenieść do S-U-2 w dniu włączenia `user.deleteUser`. Włączenie nastąpiło
	// (za flagą), przeniesienie NIE. Zostawiam świadomie i nazywam, zamiast
	// odhaczyć: dopóki obie listy żyją osobno, pilnują RÓŻNYCH rzeczy (tu: reguła
	// A1+A2 na trasach; tam: kompletność usunięcia), więc nie ma jeszcze dwóch
	// nośników jednej reguły — ale będzie, jeśli ktoś skopiuje asercje A1/A2 do
	// S-U-2 zamiast je przenieść.
	it.todo(
		"E1b (dlug): przeniesc liste asercji A1/A2 do S-U-2 albo zapisac decyzje, ze zostaja tu " +
			"na stale — patrz komentarz wyzej",
	);
});
