// @vitest-environment node
//
// S-U-2 — PEŁNA PĘTLA PRZEZ PRAWDZIWĄ ŚCIEŻKĘ USUNIĘCIA KONTA (E1b §5).
//
// CZEGO PILNUJE: że po usunięciu konta ŚCIEŻKĄ, KTÓREJ FAKTYCZNIE UŻYJE STUDENT,
// w bazie nie zostaje nic, co wskazuje na tę osobę.
//
// ── DLACZEGO PRAWDZIWA ŚCIEŻKA, A NIE `DELETE FROM "user"` ──────────────────
//
// Pętla kasująca surowym SQL-em byłaby ZIELONA także wtedy, gdyby ścieżka
// usunięcia konta w produkcie nie działała albo działała niekompletnie —
// dowodziłaby wyłącznie tego, że baza umie kasować kaskadą. To jest
// strażnik-atrapa. Ten test przechodzi CAŁĄ drogę: rejestracja przez bibliotekę
// uwierzytelniającą → zasiew danych w wielu tabelach → wywołanie
// `auth.api.deleteUser` z hasłem i żywą sesją, czyli dokładnie tego, co robi
// przycisk „Usuń konto na stałe”.
//
// ── DLACZEGO ASERCJA CZYTA KATALOG, A NIE LISTĘ TABEL ───────────────────────
//
// Generowanie danych NIGDY nie będzie kompletne — nie przejdziemy wszystkich
// 63 tras w jednym teście. Ale ASERCJA MOŻE BYĆ KOMPLETNA, bo czyta katalog:
// „cokolwiek ten przebieg wytworzył, po usunięciu tego nie ma”. Kompletność od
// strony STRUKTURY domyka S-U-1. Dwa strażniki, dwie osie, żaden nie jest
// kopią drugiego.
//
// ── WYMÓG TWARDY: NAJPIERW DOWÓD, ŻE JEST CO KASOWAĆ ────────────────────────
//
// Test „po usunięciu nic nie zostało” jest zielony także wtedy, gdy NIC NIE
// POWSTAŁO. To rodzina awarii „mechanizm melduje w porządku” — ta sama, która
// przepuściła trzech strażników-atrap w sesji 1E.7. Dlatego najpierw padamy,
// jeśli przebieg nie zasiał wierszy w co najmniej pięciu różnych tabelach.
//
// Wymaga DATABASE_URL na localhost po `pnpm db:migrate:test`.

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

/**
 * JEDYNY SANKCJONOWANY ŚLAD po usuniętym koncie — i to jest DECYZJA, nie luka.
 *
 * Zaczep `afterDelete` zapisuje `account.deletion.completed` z `target_id`
 * równym identyfikatorowi WŁAŚNIE USUNIĘTEGO konta. Wiersz jest SIEROTĄ OD
 * CHWILI ZAPISU — konto już nie istnieje — więc nie wskazuje na żadną osobę
 * i nie da się przez niego niczego odzyskać. Bez niego nie zostałoby ani jedno
 * zdanie o tym, że usunięcie w ogóle nastąpiło (rozliczalność, art. 5 ust. 2).
 *
 * Test asertuje jego OBECNOŚĆ osobno — brak śladu jest tu równie złą awarią
 * jak ślad nadmiarowy.
 */
const SANKCJONOWANY_SLAD = { tabela: "audit_log", akcja: "account.deletion.completed" };

const HASLO = "PetlaE1b!2026";

type Znalezisko = { tabela: string; kolumna: string; igla: string; wierszy: number };

dBack("S-U-2 · pelna petla usuniecia konta przez prawdziwa sciezke", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let auth: any;

	let userId = "";
	let studentId = "";
	let email = "";
	let tenantId = "";
	let zasianeTabele: string[] = [];
	let wynikUsuniecia: unknown = null;
	let znaleziska: Znalezisko[] = [];

	/** Kolumny tekstowe / uuid / json we WSZYSTKICH tabelach — z katalogu. */
	async function kolumnyDoSkanu(): Promise<{ tabela: string; kolumna: string }[]> {
		const r = await pool!.query<{ tabela: string; kolumna: string }>(`
			SELECT c.relname::text AS tabela, a.attname::text AS kolumna
			  FROM pg_class c
			  JOIN pg_namespace n ON n.oid = c.relnamespace
			  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
			  JOIN pg_type t ON t.oid = a.atttypid
			 WHERE n.nspname = 'public' AND c.relkind = 'r'
			   AND t.typname IN ('text', 'varchar', 'bpchar', 'uuid', 'jsonb', 'json')
			 ORDER BY 1, 2
		`);
		return r.rows;
	}

	/** Skan katalogowy: gdzie w CAŁEJ bazie występuje którakolwiek z igieł. */
	async function skanCalejBazy(igly: Record<string, string>): Promise<Znalezisko[]> {
		const kolumny = await kolumnyDoSkanu();
		expect(
			kolumny.length,
			"Skan nie znalazł ANI JEDNEJ kolumny do sprawdzenia — asercja niżej byłaby " +
				"zielona i pusta.",
		).toBeGreaterThan(50);

		const out: Znalezisko[] = [];
		for (const k of kolumny) {
			for (const [nazwaIgly, wartosc] of Object.entries(igly)) {
				if (!wartosc) continue;
				const r = await pool!.query(
					`SELECT count(*)::int AS ile FROM "${k.tabela}" WHERE "${k.kolumna}"::text ILIKE $1`,
					[`%${wartosc}%`],
				);
				const ile = r.rows[0].ile as number;
				if (ile > 0)
					out.push({ tabela: k.tabela, kolumna: k.kolumna, igla: nazwaIgly, wierszy: ile });
			}
		}
		return out;
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		vi.stubEnv("BETTER_AUTH_SECRET", "test-e1b-32-bajty-minimum-dlugosci-klucza");
		vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
		vi.stubEnv("FLAG_ACCOUNT_DELETION", "1");

		pool = new Pool({ connectionString: DATABASE_URL });
		({ auth } = await import("@/lib/auth/server"));

		const t = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped' LIMIT 1");
		tenantId = t.rows[0].id;

		// ── 1. REJESTRACJA prawdziwą ścieżką (tworzy user + account + session) ──
		email = `e1b-petla-${Date.now()}@test.local`;
		const rej = await auth.api.signUpEmail({
			body: { email, password: HASLO, name: "Petla E1b" },
			returnHeaders: true,
		});
		userId = rej.response.user.id;
		const setCookie: string = rej.headers.get("set-cookie") ?? "";
		const naglowki = new Headers();
		naglowki.set("cookie", setCookie.split(";")[0]);

		// ── 2. ZASIEW danych w wielu tabelach ───────────────────────────────────
		const s = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Uczelnia', 'Informatyka', 4, 'Data Analyst') RETURNING id`,
			[userId, tenantId],
		);
		studentId = s.rows[0].id;

		await pool.query("INSERT INTO passports (student_id, tenant_id) VALUES ($1, $2)", [
			studentId,
			tenantId,
		]);
		await pool.query(
			`INSERT INTO skill_maps (student_id, tenant_id, nodes, edges)
			 VALUES ($1, $2, '[]'::jsonb, '[]'::jsonb)`,
			[studentId, tenantId],
		);
		const sesjaDoradcy = await pool.query(
			`INSERT INTO career_helper_sessions (student_id, tenant_id, answers)
			 VALUES ($1, $2, '{}'::jsonb) RETURNING id`,
			[studentId, tenantId],
		);
		await pool.query(
			`INSERT INTO career_helper_turns (session_id, student_id, tenant_id, role, content, turn_index)
			 VALUES ($1, $2, $3, 'user', 'Nazywam sie Jan i szukam pracy.', 0)`,
			[sesjaDoradcy.rows[0].id, studentId, tenantId],
		);
		const projekt = await pool.query(
			`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, rubric_json)
			 VALUES ($1, 'Projekt petli', 'Opis.', 'L2', 20, 'open_data', '[]'::jsonb) RETURNING id`,
			[`e1b-petla-${Date.now()}`],
		);
		await pool.query(
			`INSERT INTO project_submissions
			   (student_id, tenant_id, project_id, repo_url, status, needs_human_review, submitted_at)
			 VALUES ($1, $2, $3, $4, 'submitted', true, now())`,
			[studentId, tenantId, projekt.rows[0].id, `https://example.test/e1b-petla/${studentId}`],
		);

		// Które tabele faktycznie mają wiersz tej osoby — LICZONE, nie zakładane.
		const kandydaci = [
			["user", `SELECT count(*)::int AS ile FROM "user" WHERE id = $1`, userId],
			["account", `SELECT count(*)::int AS ile FROM account WHERE user_id = $1`, userId],
			["session", `SELECT count(*)::int AS ile FROM session WHERE user_id = $1`, userId],
			["students", `SELECT count(*)::int AS ile FROM students WHERE id = $1`, studentId],
			["passports", `SELECT count(*)::int AS ile FROM passports WHERE student_id = $1`, studentId],
			[
				"skill_maps",
				`SELECT count(*)::int AS ile FROM skill_maps WHERE student_id = $1`,
				studentId,
			],
			[
				"career_helper_sessions",
				`SELECT count(*)::int AS ile FROM career_helper_sessions WHERE student_id = $1`,
				studentId,
			],
			[
				"project_submissions",
				`SELECT count(*)::int AS ile FROM project_submissions WHERE student_id = $1`,
				studentId,
			],
		] as const;
		zasianeTabele = [];
		for (const [nazwa, zapytanie, param] of kandydaci) {
			const r = await pool.query(zapytanie, [param]);
			if (r.rows[0].ile > 0) zasianeTabele.push(nazwa);
		}

		// ── 3. USUNIĘCIE prawdziwą ścieżką produktu ─────────────────────────────
		wynikUsuniecia = await auth.api.deleteUser({ body: { password: HASLO }, headers: naglowki });

		// ── 4. SKAN KATALOGOWY całej bazy ───────────────────────────────────────
		znaleziska = await skanCalejBazy({
			"identyfikator konta": userId,
			"identyfikator studenta": studentId,
			"adres pocztowy": email,
		});
	}, 180_000);

	afterAll(async () => {
		await pool?.end();
		vi.unstubAllEnvs();
	});

	// ── WYMÓG TWARDY (1) ─────────────────────────────────────────────────────

	it("przebieg zasial wiersze w co najmniej pieciu roznych tabelach", () => {
		expect(
			zasianeTabele.length,
			`Zasiane tabele: ${JSON.stringify(zasianeTabele)}. Poniżej pięciu asercja ` +
				"„nic nie zostało” przestaje cokolwiek znaczyć — bo prawie nic nie było.",
		).toBeGreaterThanOrEqual(5);
	});

	it("sciezka usuniecia odpowiedziala sukcesem", () => {
		expect(
			wynikUsuniecia,
			"Prawdziwa ścieżka usunięcia konta nie zakończyła się sukcesem — dalsze asercje " +
				"mówiłyby wyłącznie o tym, że nic się nie stało.",
		).toMatchObject({ success: true });
	});

	// ── ASERCJA GŁÓWNA: skan katalogowy całej bazy ────────────────────────────

	it("po usunieciu ZADNA kolumna w ZADNEJ tabeli nie niesie juz tej osoby", () => {
		const nieautoryzowane = znaleziska.filter(
			(z) => !(z.tabela === SANKCJONOWANY_SLAD.tabela && z.kolumna === "target_id"),
		);
		expect(
			nieautoryzowane.map((z) => `${z.tabela}.${z.kolumna} [${z.igla}] × ${z.wierszy}`),
			"Po usunięciu konta identyfikator albo adres pocztowy tej osoby nadal występuje " +
				"w bazie. Sprawdź, czy tabela ma klucz obcy z ON DELETE CASCADE prowadzący do " +
				"konta (S-U-1 pilnuje tego od strony struktury) — jeśli nie ma, art. 17 RODO " +
				"nie jest wykonany, mimo że ścieżka odpowiedziała sukcesem.",
		).toEqual([]);
	});

	it("adres pocztowy nie zostal NIGDZIE — takze w tresci swobodnej", () => {
		// Osobna asercja, bo adres pocztowy jest jedyną igłą, która mogłaby wpaść
		// do pola tekstu swobodnego (rozmowa z pomocnikiem kariery, opis projektu),
		// gdzie żaden klucz obcy jej nie dosięgnie.
		const zAdresem = znaleziska.filter((z) => z.igla === "adres pocztowy");
		expect(
			zAdresem.map((z) => `${z.tabela}.${z.kolumna} × ${z.wierszy}`),
			"Adres pocztowy usuniętego konta został w bazie.",
		).toEqual([]);
	});

	it("ZOSTAL dokladnie jeden sankcjonowany slad — sierota od chwili zapisu", async () => {
		// Brak śladu jest tu awarią równie poważną jak ślad nadmiarowy: bez niego
		// nie umiemy wykazać, że usunięcie nastąpiło.
		const r = await pool!.query(
			`SELECT actor_type, actor_id, ip_address, user_agent, target_type
			   FROM audit_log WHERE action = $1 AND target_id = $2`,
			[SANKCJONOWANY_SLAD.akcja, userId],
		);
		expect(r.rowCount, "Brak śladu usunięcia konta w dzienniku rozliczalności.").toBe(1);

		// Ślad ma być BEZ tożsamości i BEZ kontekstu żądania (wzorzec A7).
		// Bez tej asercji naprawa RODO sama tworzyłaby dług, który naprawia.
		const w = r.rows[0];
		expect({ actor_id: w.actor_id, ip: w.ip_address, ua: w.user_agent }).toEqual({
			actor_id: null,
			ip: null,
			ua: null,
		});
		expect(w.actor_type).toBe("student");
		expect(w.target_type).toBe("user");

		// I dowód, że jest SIEROTĄ: cel nie rozwiązuje się do żadnego konta.
		const konto = await pool!.query('SELECT 1 FROM "user" WHERE id = $1', [userId]);
		expect(
			konto.rowCount,
			"Cel śladu nadal rozwiązuje się do istniejącego konta — wiersz NIE jest sierotą, " +
				"więc motyw 26 RODO przestaje się do niego stosować.",
		).toBe(0);
	});

	// ── D-U6: BEZPIECZNIK NA DZIEŃ NAPRAWY DŁUGU `bypassrls` ─────────────────

	it("D-U6: rola wykonujaca usuniecie ma prawo skasowac wiersz konta", async () => {
		// Ścieżka usunięcia idzie uchwytem `db` (DATABASE_URL), nie `dbRuntime`
		// (DATABASE_URL_RUNTIME) — zmierzone: adapter biblioteki dostaje `db`
		// (`src/lib/auth/server.ts` → `drizzleAdapter(db, …)`).
		//
		// KONSEKWENCJA, KTÓRĄ ZAPISUJĘ WPROST, BO ZMIENIA OBRAZ Z PROJEKTU:
		// przestawienie aplikacji na rolę `app_runtime` przez `DATABASE_URL_RUNTIME`
		// NIE dotknie tej ścieżki — ona zostanie na połączeniu właściciela. Czyli
		// usuwanie konta nie „przestanie działać”, tylko zostanie JEDYNĄ ścieżką
		// omijającą RLS. Ta asercja pilnuje wariantu, w którym ktoś przestawia
		// samo `DATABASE_URL`: wtedy rola traci prawo do kasowania konta i pada
		// TUTAJ, a nie u pierwszego studenta korzystającego z art. 17.
		const r = await pool!.query(`
			SELECT current_user::text AS rola,
			       has_table_privilege(current_user, '"user"', 'DELETE') AS moze_kasowac
		`);
		expect(
			r.rows[0].moze_kasowac,
			`Rola połączenia (${r.rows[0].rola}) nie ma prawa DELETE na tabeli kont. ` +
				"Ścieżka usunięcia konta odmówi działania — a odmówi dopiero użytkownikowi, " +
				"który akurat będzie chciał usunąć konto. Dołóż uprawnienie albo funkcję " +
				"z uprawnieniami definiującego, ZANIM zmiana trafi na produkcję.",
		).toBe(true);
	});

	it("D-U6: grant dla roli aplikacyjnej bez polityki RLS to polowiczna naprawa", async () => {
		// NIEZMIENNIK WARUNKOWY, nie przypięty stan. Dziś przesłanka jest fałszywa
		// (rola aplikacyjna nie ma na tabeli kont żadnego uprawnienia), więc test
		// przechodzi PUSTO — i tak ma być: nie blokuje słusznej naprawy, blokuje
		// wyłącznie jej POŁOWĘ.
		//
		// Tabela kont ma dziś RLS WŁĄCZONE i ZERO POLITYK, czyli dla roli bez
		// przywileju `bypassrls` jest niewidzialna. Ktoś, kto nada rolom
		// aplikacyjnym prawo DELETE i na tym poprzestanie, dostanie ścieżkę, która
		// „ma uprawnienia” i mimo to nie kasuje niczego — awaria bezgłośna.
		const r = await pool!.query(`
			SELECT rolname::text AS rola,
			       has_table_privilege(rolname, '"user"', 'DELETE') AS moze_kasowac,
			       pg_has_role(rolname, 'pg_read_all_data', 'USAGE') AS nieistotne,
			       (SELECT relrowsecurity FROM pg_class WHERE oid = '"user"'::regclass) AS rls,
			       (SELECT count(*)::int FROM pg_policy WHERE polrelid = '"user"'::regclass) AS polityk,
			       rolbypassrls
			  FROM pg_roles WHERE rolname LIKE 'app\\_%'
		`);
		expect(
			r.rowCount,
			"Brak ról aplikacyjnych w bazie — migracja 0011 nie zastosowana.",
		).toBeGreaterThan(0);

		const polowiczne = r.rows
			.filter((w) => w.moze_kasowac && w.rls && w.polityk === 0 && !w.rolbypassrls)
			.map((w) => w.rola);
		expect(
			polowiczne,
			"Rola aplikacyjna dostała prawo DELETE na tabeli kont, ale tabela ma włączone " +
				"bezpieczeństwo na poziomie wiersza i ZERO polityk — dla tej roli jest " +
				"niewidzialna. Usunięcie konta „powiedzie się” i nie skasuje ani jednego " +
				"wiersza. Dołóż politykę albo funkcję z uprawnieniami definiującego, " +
				"i URUCHOM TEN PLIK PONOWNIE połączeniem tej roli.",
		).toEqual([]);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// BRAMKA WDROŻENIOWA — „deploy ≠ release" sprawdzone zachowaniem
// ═══════════════════════════════════════════════════════════════════════════

dBack("S-U-2b · zgaszona flaga zamyka sciezke (bramka per zadanie)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: moduł ładowany dynamicznie po env.
	let auth: any;
	let userId = "";
	let naglowki: Headers;
	let bladUsuniecia: { status?: string; message?: string } | null = null;

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		vi.stubEnv("BETTER_AUTH_SECRET", "test-e1b-32-bajty-minimum-dlugosci-klucza");
		vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
		// Moduł ładowany z flagą ZAPALONĄ — inaczej ćwiczylibyśmy wyłącznie bramkę
		// w opcjach biblioteki (odczyt przy starcie), a nie tę, o którą chodzi.
		vi.stubEnv("FLAG_ACCOUNT_DELETION", "1");
		pool = new Pool({ connectionString: DATABASE_URL });
		({ auth } = await import("@/lib/auth/server"));

		const rej = await auth.api.signUpEmail({
			body: { email: `e1b-flaga-${Date.now()}@test.local`, password: HASLO, name: "Flaga" },
			returnHeaders: true,
		});
		userId = rej.response.user.id;
		naglowki = new Headers();
		naglowki.set("cookie", (rej.headers.get("set-cookie") ?? "").split(";")[0]);

		// FLAGA GAŚNIE PO ZAŁADOWANIU MODUŁU — dokładnie scenariusz „zgaszenie
		// po incydencie bez wdrożenia”, którego nie obsłużyłaby bramka czytana
		// wyłącznie przy starcie.
		vi.stubEnv("FLAG_ACCOUNT_DELETION", "0");
		try {
			await auth.api.deleteUser({ body: { password: HASLO }, headers: naglowki });
		} catch (e) {
			bladUsuniecia = { status: (e as { status?: string }).status, message: (e as Error).message };
		}
	}, 120_000);

	afterAll(async () => {
		if (pool && userId) await pool.query('DELETE FROM "user" WHERE id = $1', [userId]);
		await pool?.end();
		vi.unstubAllEnvs();
	});

	it("sciezka odmowila (trasa ma NIE ISTNIEC, nie „brak uprawnien”)", () => {
		expect(
			bladUsuniecia,
			"Konto usunięto mimo zgaszonej flagi. Bramka per żądanie nie działa — " +
				"„deploy ≠ release” jest wtedy deklaracją, nie własnością.",
		).not.toBeNull();
		expect(bladUsuniecia?.status).toBe("NOT_FOUND");
	});

	it("konto i jego dane sa NIETKNIETE (mikrocopy „konto zostalo bez zmian” nie klamie)", async () => {
		// Sophia postawiła warunek: zdania „konto zostało bez zmian” wolno użyć
		// wyłącznie wtedy, gdy nieudane usunięcie faktycznie nie zostawia stanu
		// połowicznego. To jest ten dowód.
		const konto = await pool!.query('SELECT 1 FROM "user" WHERE id = $1', [userId]);
		expect(konto.rowCount).toBe(1);
		const sesje = await pool!.query("SELECT 1 FROM session WHERE user_id = $1", [userId]);
		expect(sesje.rowCount, "Sesje zniknęły mimo odmowy — stan połowiczny.").toBeGreaterThan(0);
		const konta = await pool!.query("SELECT 1 FROM account WHERE user_id = $1", [userId]);
		expect(konta.rowCount, "Sposób logowania zniknął mimo odmowy — stan połowiczny.").toBe(1);
	});
});
