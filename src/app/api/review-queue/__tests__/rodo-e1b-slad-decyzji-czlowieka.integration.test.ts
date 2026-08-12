// @vitest-environment node
//
// S-U-4 + S-U-5 — ŚLAD DECYZJI CZŁOWIEKA (E1b §5, warunki W1 i W2 Sophii).
//
// Oba strażniki pilnują JEDNEJ przesłanki, na której stoi rozstrzygnięcie
// z E1b §3.3 („`submission_reviews` ginie razem z kontem i tak ma być”):
// ŚLAD AUDYTOWY MUSI BYĆ SAMOWYSTARCZALNY DOWODOWO PO ZNIKNIĘCIU WSZYSTKIEGO
// INNEGO. Bez tego zdanie „człowiek miał ostatnie słowo” (CLAUDE.md §7) traci
// po usunięciu konta swój jedyny nośnik.
//
// Dwie różne osie, dlatego dwa strażniki, a nie jeden:
//   S-U-4 — CO ślad niesie (rola działającego, nie tożsamość sesji),
//   S-U-5 — CZY ślad jest nie mniej trwały niż kredencjał, który poświadcza.
//
// Wspólne rusztowanie leży w jednym miejscu świadomie: dwie kopie zasiewu
// rozjechałyby się przy pierwszej zmianie schematu, a to jest rusztowanie,
// nie reguła.
//
// Wymaga DATABASE_URL na localhost po `pnpm db:migrate:test`.

import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { REGULA_AKTORA } from "@/lib/audit";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const MARKER = "e1b-slad-decyzji";
const USER_ID = "u-e1b-slad-decyzji";
const EMAIL = "e1b-slad-decyzji@test.local";

let cookieJar: Record<string, string> = {};
vi.mock("next/headers", () => ({
	cookies: async () => ({
		get: (name: string) => (cookieJar[name] ? { value: cookieJar[name] } : undefined),
	}),
	headers: async () => new Headers(),
}));

type WierszAudytu = {
	action: string;
	actor_type: string;
	actor_id: string | null;
	target_type: string | null;
	target_id: string | null;
	metadata: Record<string, unknown> | null;
};

dBack("S-U-4 / S-U-5 · slad decyzji czlowieka pod kredencjalem", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: handler ładowany dynamicznie po atrapach.
	let decisionPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: funkcja ładowana dynamicznie.
	let hashToken: any;

	let tenantId = "";
	let studentId = "";
	let projectId = "";

	async function sprzatanie() {
		if (!pool) return;
		await pool.query(
			`DELETE FROM submission_reviews WHERE submission_id IN
			   (SELECT id FROM project_submissions WHERE repo_url LIKE $1)`,
			[`%${MARKER}%`],
		);
		await pool.query("DELETE FROM project_submissions WHERE repo_url LIKE $1", [`%${MARKER}%`]);
		await pool.query("DELETE FROM students WHERE user_id = $1", [USER_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [USER_ID]);
		await pool.query("DELETE FROM projects WHERE slug LIKE $1", [`${MARKER}%`]);
		await pool.query("DELETE FROM faculty_sessions WHERE user_agent = $1", [MARKER]);
	}

	/**
	 * Nowe zgłoszenie kwalifikujące się do decyzji człowieka.
	 *
	 * WŁASNY PROJEKT per zgłoszenie — `uq_project_submissions_student_project`
	 * dopuszcza jedno zgłoszenie studenta na projekt, a ten plik potrzebuje
	 * trzech niezależnych (S-U-4, S-U-5, kontrola dodatnia S-U-5). Reużycie
	 * jednego zgłoszenia byłoby gorsze niż dodatkowy wiersz: druga decyzja o tym
	 * samym zgłoszeniu kończy się 409 z UNIQUE(submission_id), więc S-U-5
	 * dostałby błąd „decyzja już zapadła” i przeszedłby z zupełnie innego powodu
	 * niż wstrzyknięta awaria — czyli byłby zielony bez pokrycia.
	 */
	async function noweZgloszenie(sufiks: string): Promise<string> {
		const p = await pool!.query(
			`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, rubric_json)
			 VALUES ($1, 'Projekt E1b', 'Opis.', 'L2', 20, 'open_data', '[]'::jsonb) RETURNING id`,
			[`${MARKER}-${sufiks}`],
		);
		const r = await pool!.query(
			`INSERT INTO project_submissions
			   (student_id, tenant_id, project_id, repo_url, status, needs_human_review, submitted_at)
			 VALUES ($1, $2, $3, $4, 'submitted', true, now()) RETURNING id`,
			[studentId, tenantId, p.rows[0].id, `https://example.test/${MARKER}/${sufiks}`],
		);
		return r.rows[0].id;
	}

	async function zalogujWykladowce() {
		const token = randomBytes(32).toString("base64url");
		await pool!.query(
			`INSERT INTO faculty_sessions (token_hash, tenant_id, role, expires_at, user_agent)
			 VALUES ($1, $2, 'faculty', now() + interval '1 hour', $3)`,
			[hashToken(token), tenantId, MARKER],
		);
		cookieJar = { faculty_session: token };
	}

	const zadanie = (body: unknown) =>
		new Request("http://test.local/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "1");
		pool = new Pool({ connectionString: DATABASE_URL });
		await sprzatanie();

		({ hashToken } = await import("@/lib/faculty-auth"));
		({ POST: decisionPOST } = await import("../[id]/decision/route"));

		const t = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped' LIMIT 1");
		tenantId = t.rows[0].id;

		const p = await pool.query(
			`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, rubric_json)
			 VALUES ($1, 'Projekt E1b', 'Opis.', 'L2', 20, 'open_data', '[]'::jsonb) RETURNING id`,
			[MARKER],
		);
		projectId = p.rows[0].id;

		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'E1b Slad', $2, true, now(), now())`,
			[USER_ID, EMAIL],
		);
		const s = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Uczelnia', 'Informatyka', 4, 'Data Analyst') RETURNING id`,
			[USER_ID, tenantId],
		);
		studentId = s.rows[0].id;

		await zalogujWykladowce();
	}, 120_000);

	afterAll(async () => {
		await sprzatanie();
		await pool?.end();
		vi.unstubAllEnvs();
	});

	// ═══════════════════════════════════════════════════════════════════════
	// S-U-4 — ślad niesie ROLĘ, nie tożsamość sesji (warunek W1 Sophii)
	// ═══════════════════════════════════════════════════════════════════════

	describe("S-U-4 · slad jest samowystarczalny dowodowo", () => {
		let submissionId = "";
		let wiersze: WierszAudytu[] = [];

		beforeAll(async () => {
			if (!isLocalTestDb) return;
			submissionId = await noweZgloszenie("su4");
			const odp = await decisionPOST(zadanie({ decision: "approved", note: "ok" }), {
				params: Promise.resolve({ id: submissionId }),
			});
			expect(odp.status, "Trasa decyzji nie zwróciła 200 — dalsze asercje nic nie znaczą.").toBe(
				200,
			);
			const r = await pool!.query<WierszAudytu>(
				`SELECT action, actor_type, actor_id, target_type, target_id, metadata
				   FROM audit_log WHERE target_id = $1 AND action LIKE 'submission.review.%'`,
				[submissionId],
			);
			wiersze = r.rows;
		}, 60_000);

		it("powstal DOKLADNIE JEDEN wiersz sladu decyzji", () => {
			// Asercja na LICZBIE, nie na obecności: test „istnieje wiersz" byłby
			// zielony także przy podwójnym zapisie, a dwa wiersze na jedną decyzję
			// to dwa różne zdania o tym samym fakcie w tabeli, której nie da się
			// poprawić (UPDATE blokuje wyzwalacz append-only).
			expect(
				wiersze.length,
				`Oczekiwano jednego wiersza submission.review.*, jest ${wiersze.length}. ` +
					"Zero = decyzja bez dowodu; więcej niż jeden = dwa zapisy tej samej decyzji.",
			).toBe(1);
		});

		it("dzialajacym jest ktos, KOMU WOLNO miec tozsamosc (asercja czyta nosnik)", () => {
			// ⚠ NIE wpisujemy tu pary {faculty, operator}. Asercja pyta NOŚNIK
			// `REGULA_AKTORA`, czy temu typowi działającego wolno nieść tożsamość.
			// Zysk jest konkretny, nie estetyczny: gdyby ktoś przeniósł `faculty`
			// do klasy bez tożsamości (próg (i) Ryana — pierwsze imienne konto
			// recenzenta), strażnik ZMIENI SENS RAZEM Z NOŚNIKIEM, zamiast zapalić
			// się przeciwko uzasadnionej naprawie prywatności. Strażnik blokujący
			// słuszną zmianę jest gorszy niż brak strażnika — brak strażnika nie
			// ma autorytetu.
			const w = wiersze[0];
			const regula = REGULA_AKTORA[w.actor_type as keyof typeof REGULA_AKTORA];
			expect(
				regula,
				`actor_type='${w.actor_type}' nie występuje w REGULA_AKTORA — zdarzenie zapisał ` +
					"działający spoza nośnika.",
			).toBeTruthy();
			expect(
				regula.actorId,
				`Decyzję o kredencjale zapisano jako actor_type='${w.actor_type}', czyli klasę, ` +
					"której NIE WOLNO nieść tożsamości. Ślad przestaje odpowiadać na pytanie " +
					"„czy decydował człowiek” — a po usunięciu konta studenta jest to JEDYNY " +
					"pozostały dowód (CLAUDE.md §7).",
			).toBe(true);
		});

		it("metadata niesie reviewerType — rola zapisana wprost, nie do wywnioskowania", () => {
			const reviewerType = wiersze[0]?.metadata?.reviewerType;
			expect(
				reviewerType,
				"Brak `metadata.reviewerType`. `actor_type` mówi, do jakiej KLASY należy " +
					"działający; `reviewerType` mówi, kim był konkretnie (wykładowca kampusu czy " +
					"operator jakości). Bez tego drugiego ślad nie jest samowystarczalny.",
			).toBeTruthy();
		});

		it("cel wskazuje na zgloszenie (wiazanie z osoba idzie WYLACZNIE przez cel)", () => {
			expect(wiersze[0].target_type).toBe("submission");
			expect(wiersze[0].target_id).toBe(submissionId);
		});

		it("actor_id niepuste — ASERCJA DRUGORZEDNA, do zdjecia przy progu (i) Ryana", () => {
			// Póki klasa 2 (faculty/operator) jest poza zakresem długu A-1,
			// `actor_id` niesie identyfikator SESJI recenzenta. NIE JEST to dowód
			// „kto” — sesja ginie przy wylogowaniu, a na produkcji 4 z 9 wierszy
			// klasy 2 już dziś nie prowadzi do żadnej sesji (pomiar Ethana W1e).
			// Przy progu (i) Ryana (pierwsze imienne konto recenzenta) TĘ ASERCJĘ
			// SIĘ ZDEJMUJE: usunięcie `actor_id` będzie wtedy uzasadnioną naprawą
			// prywatności, a nie regresją.
			expect(wiersze[0].actor_id).toBeTruthy();
		});
	});

	// ═══════════════════════════════════════════════════════════════════════
	// S-U-5 — dowód nie może zniknąć ciszej niż kredencjał (warunek W2, D-U7)
	// ═══════════════════════════════════════════════════════════════════════

	describe("S-U-5 · brak dowodu ⇒ brak kredencjalu (wstrzykniecie awarii)", () => {
		let submissionId = "";
		let odpowiedzStatus = 0;

		beforeAll(async () => {
			if (!isLocalTestDb) return;
			submissionId = await noweZgloszenie("su5");

			// WSTRZYKNIĘCIE AWARII. Awaria zapisu audytu jest z definicji cicha:
			// w szczęśliwej ścieżce oba zapisy się udają, więc zielona suita nie
			// mówi tu NIC. Wyzwalacz jest narzędziem awarii, nie ochrony.
			await pool!.query(`
				CREATE OR REPLACE FUNCTION e1b_awaria_zapisu_audytu() RETURNS trigger AS $$
				BEGIN
					RAISE EXCEPTION 'E1B_AWARIA_TESTOWA: zapis sladu decyzji odrzucony';
				END; $$ LANGUAGE plpgsql;
			`);
			await pool!.query(`
				CREATE TRIGGER e1b_awaria_audytu BEFORE INSERT ON audit_log
				FOR EACH ROW WHEN (NEW.action LIKE 'submission.review.%')
				EXECUTE FUNCTION e1b_awaria_zapisu_audytu();
			`);

			const odp = await decisionPOST(zadanie({ decision: "approved", note: "ok" }), {
				params: Promise.resolve({ id: submissionId }),
			});
			odpowiedzStatus = odp.status;

			// ZDJĘCIE WYZWALACZA — obowiązkowe i w tym samym miejscu, co założenie.
			// Test, który zostawia po sobie wyzwalacz blokujący zapis audytu,
			// zatruwa KAŻDY kolejny przebieg w tej samej bazie.
			await pool!.query("DROP TRIGGER IF EXISTS e1b_awaria_audytu ON audit_log");
			await pool!.query("DROP FUNCTION IF EXISTS e1b_awaria_zapisu_audytu()");
		}, 60_000);

		it("wyzwalacz awaryjny zostal zdjety (inaczej zatruwa kazdy kolejny przebieg)", async () => {
			const r = await pool!.query(
				`SELECT tgname FROM pg_trigger WHERE tgrelid='audit_log'::regclass AND tgname='e1b_awaria_audytu'`,
			);
			expect(r.rowCount, "Wyzwalacz awaryjny został w bazie.").toBe(0);
		});

		it("trasa zwrocila BLAD, nie sukces", () => {
			expect(
				odpowiedzStatus,
				"Trasa odpowiedziała sukcesem mimo braku dowodu. Recenzent uzna decyzję za " +
					"podjętą, a jej jedynego śladu nie ma.",
			).toBeGreaterThanOrEqual(400);
		});

		it("NIE powstal rekord recenzji", async () => {
			const r = await pool!.query("SELECT id FROM submission_reviews WHERE submission_id = $1", [
				submissionId,
			]);
			expect(
				r.rowCount,
				"Rekord recenzji powstał mimo braku śladu audytowego. Po usunięciu konta studenta " +
					"rekord ginie kaskadą, ślad miał zostać — a nie ma ani jednego, ani drugiego.",
			).toBe(0);
		});

		it("status zgloszenia NIETKNIETY (nie verified, nie rejected)", async () => {
			const r = await pool!.query("SELECT status FROM project_submissions WHERE id = $1", [
				submissionId,
			]);
			expect(
				r.rows[0].status,
				"Zgłoszenie zmieniło status mimo braku dowodu — kredencjał istnieje, dowód nie.",
			).toBe("submitted");
		});

		it("NIE powstaly kompetencje potwierdzone", async () => {
			const r = await pool!.query("SELECT id FROM verified_competencies WHERE submission_id = $1", [
				submissionId,
			]);
			expect(r.rowCount, "Kredencjał (kompetencje potwierdzone) powstał bez dowodu.").toBe(0);
		});

		it("KONTROLA DODATNIA: bez wyzwalacza ta sama sciezka konczy sie sukcesem", async () => {
			// Bez tej kontroli test byłby zielony także wtedy, gdyby trasa PSUŁA
			// SIĘ ZAWSZE — „nie powstał kredencjał” jest prawdą również przy
			// całkiem zepsutej ścieżce. Strażnik musi odróżniać awarię wstrzykniętą
			// od awarii przypadkowej.
			const kontrolne = await noweZgloszenie("su5-kontrola");
			const odp = await decisionPOST(zadanie({ decision: "approved" }), {
				params: Promise.resolve({ id: kontrolne }),
			});
			expect(odp.status).toBe(200);
			const r = await pool!.query(
				`SELECT id FROM audit_log WHERE target_id = $1 AND action LIKE 'submission.review.%'`,
				[kontrolne],
			);
			expect(r.rowCount, "Bez wstrzykniętej awarii ślad ma powstać dokładnie raz.").toBe(1);
		}, 60_000);
	});
});
