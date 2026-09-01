import { drizzle } from "drizzle-orm/node-postgres";
// Rozpoznanie „host lokalny kontra zdalny" ma w tym repozytorium JEDEN nośnik —
// allowlistę hostów lokalnych w `tools/assert-test-db.ts`. Wołamy ją, nie
// przepisujemy (CLAUDE.md §8, v1.17). Ten sam wzorzec importu stosuje już
// `src/test/integration-db-guard.ts`.
import { isDedicatedTestDbUrl } from "../../../tools/assert-test-db";
import * as schema from "./schema";

/**
 * Owner connection — DATABASE_URL (neondb_owner, bypassuje non-FORCE RLS).
 * Używana przez:
 *  - migracje (drizzle-kit migrate, drizzle-kit push)
 *  - seed (src/lib/db/seed.ts)
 *  - Better Auth adapter (server-side, własna ścieżka, ENABLE RLS na user/session)
 *  - panel faculty/admin do agregacji (dziś, do czasu przepięcia na dbRuntime)
 *
 * NIE używać bezpośrednio w API request paths danych studenta — RLS się nie
 * egzekwuje. Zamiast tego: `withTenantContext(...)` (który używa dbRuntime).
 */
export const db = drizzle(process.env.DATABASE_URL ?? "", { schema });

/**
 * Runtime connection — DATABASE_URL_RUNTIME (rola `app_runtime`, NOBYPASSRLS).
 *
 * §8 #1 Phase 1 (rls-matrix.md, migracja 0011): connection string dla
 * request-runtime, który NIE jest właścicielem bazy. Każde zapytanie pod tym
 * połączeniem podlega RLS — nawet gdy ktoś zapomni `SET LOCAL ROLE`, polityki
 * `app_student`/`app_faculty` wymagają `app.current_user_id`/`current_tenant_id`
 * → bez tych ustawień zwracają 0 wierszy (deny-default).
 *
 * Wykorzystanie:
 *  - `withTenantContext(...)` (`src/lib/db/tenant-context.ts`) — używa
 *    `dbRuntime` przy każdym `db.transaction(...)`. Ustawia `SET LOCAL ROLE`
 *    i `set_config` per żądanie.
 *
 * Fallback do `DATABASE_URL` (ten sam owner):
 *  - Dziś, dopóki ops nie aktywuje LOGIN dla `app_runtime` + nie ustawi
 *    `DATABASE_URL_RUNTIME` w Vercel, używamy ownera. `withTenantContext` i tak
 *    egzekwuje RLS przez `SET LOCAL ROLE app_student/app_faculty` (membership
 *    z migracji 0011), więc semantyka się nie zmienia — fallback to "samo
 *    okablowanie", bez zmiany security posture do czasu Phase 2 (ops step).
 *  - Warning na konsoli żeby było widać w logach dev/preview, że runtime
 *    siedzi na owner connection (przyciąga uwagę do dokończenia §8 #1).
 *
 * NIE używać tego klienta bezpośrednio w handlerach — zawsze przez
 * `withTenantContext`, żeby kontekst RLS był ustawiony przed pierwszym
 * zapytaniem.
 */
const runtimeUrl = process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL ?? "";

/**
 * D3 (fala 1) — BRAK `DATABASE_URL_RUNTIME` ZATRZYMUJE START NA PRODUKCJI.
 *
 * Do 2026-09-02 ten sam warunek wypisywał wyłącznie `console.warn` i szedł
 * dalej. Skutek był taki, że brak zmiennej na produkcji nie zatrzymywał
 * niczego: `dbRuntime` cicho spadał na `DATABASE_URL`, czyli na rolę
 * WŁAŚCICIELA bazy — tę, która omija izolację wierszy (RLS) wszędzie tam,
 * gdzie nie stoi FORCE. Ostrzeżenie w dzienniku nie jest bezpiecznikiem:
 * czyta je człowiek, który już i tak wie, że czegoś szuka. To ta sama
 * rodzina awarii co strażnik-atrapa — mechanizm dawał sygnał, nie robiąc
 * tego, co miał robić.
 *
 * REGUŁA — koniunkcja dwuczłonowa. Start pada wtedy i tylko wtedy, gdy
 * JEDNOCZEŚNIE:
 *   (1) `NODE_ENV === "production"`, oraz
 *   (2) połączenie awaryjne NIE poszłoby do dedykowanej, lokalnej bazy
 *       testowej (`isDedicatedTestDbUrl` z `tools/assert-test-db.ts` — host
 *       z allowlisty lokalnej ORAZ nazwa bazy `test`/`*_test`); DSN pusty
 *       albo nieparseowalny liczy się jako produkcyjny — fail-closed.
 *
 * DLACZEGO DRUGI CZŁON, A NIE SAMO `NODE_ENV` — POMIAR, NIE OSTROŻNOŚĆ.
 * Wersja bez tego członu przeszła bramki `build`, `test`, `integration`,
 * `lint`, `typecheck` i `secret-scan`, a POŁOŻYŁA SZEŚĆ BRAMEK
 * PRZEGLĄDARKOWYCH (a11y-exam, a11y-review, a11y-tutor, rate-limit-review
 * ×2, e2e). Odczyt z dziennika zgłoszenia #357 (2026-09-01, job a11y-exam):
 *   [WebServer] ✓ Ready in 91ms
 *   [WebServer] ⨯ Error: [db] DATABASE_URL_RUNTIME nieustawione na produkcji…
 *   ✘ 1 [chromium] › 62-1e3-exam-a11y.spec.ts › (a) wejście na bramkę egzaminu
 * Powód: te joby serwują artefakt produkcyjny (`pnpm start` = `next start`,
 * czyli NODE_ENV=production BEZ fazy budowania) przeciwko bazie testowej na
 * pętli zwrotnej i nie ustawiają `DATABASE_URL_RUNTIME`. Dodania zmiennej do
 * `.github/workflows/pr.yml` nie zrobię — plik jest poza zakresem tej zmiany.
 *
 * Drugi człon nie jest jednak obejściem CI, tylko POPRAWNIEJSZYM opisem
 * ryzyka: groźne jest ciche połączenie rolą właściciela do PRAWDZIWEJ bazy,
 * a nie sam napis „production" w zmiennej. Dedykowana baza testowa na pętli
 * zwrotnej z definicji nie jest produkcyjna — tej samej własności („lokalny"
 * jest własnością, nie nazwą) broni nagłówek `tools/assert-test-db.ts`.
 * Wszystkie bazy jobów CI to `test` albo `skillbridge_test` na localhost
 * (pr.yml), więc trafiają w ten człon; produkcyjny Neon nie trafia.
 *
 * FAZA BUDOWANIA jest tym samym członem załatwiona: `next build` w CI stoi na
 * DSN do pętli zwrotnej (pomiar 2026-09-01, sonda w tym pliku, 14 wywołań:
 * NODE_ENV=production, NEXT_PHASE=phase-production-build, brak DSN runtime),
 * więc nie rzuca. Budowanie produkcyjne na Vercelu ma zmienną ustawioną
 * (pomiar `vercel env ls production`, 2026-09-01: Production + Preview,
 * 96 dni), więc też nie rzuca — a gdyby ktoś ją skasował, budowanie padnie
 * ZANIM wdrożenie wejdzie na produkcję. To jest pożądane, nie uboczne.
 */
export const KOMUNIKAT_BRAK_DSN_RUNTIME =
	"[db] DATABASE_URL_RUNTIME nieustawione na produkcji — start przerwany. " +
	"Bez tej zmiennej `withTenantContext` połączyłby się rolą WŁAŚCICIELA bazy " +
	"(omija RLS poza tabelami z FORCE). Napraw: §8 #1 Phase 2 — aktywuj rolę " +
	"`app_runtime` (LOGIN + hasło) i ustaw `DATABASE_URL_RUNTIME` w środowisku " +
	"(runbook: docs/runbooks/k3-prod-migration-phase2.md).";

/**
 * Czy połączenie awaryjne NIE poszłoby do dedykowanej, lokalnej bazy testowej.
 *
 * Cała wiedza o tym, co jest bazą testową (allowlista hostów lokalnych +
 * wymóg nazwy `test`/`*_test`), mieszka w `tools/assert-test-db.ts` i jest tu
 * WOŁANA. Żadnej kopii allowlisty w tym pliku — inaczej pierwsza zmiana
 * allowlisty rozjechałaby dwa miejsca po cichu.
 *
 * DSN pusty albo nieparseowalny NIE jest bazą testową → start pada.
 * Fail-closed: brak wiedzy nie otwiera furtki (ta sama polaryzacja co
 * w nagłówku `tools/assert-test-db.ts`).
 */
function nieJestLokalnaBazaTestowa(dsn: string): boolean {
	return !isDedicatedTestDbUrl(dsn);
}

if (!process.env.DATABASE_URL_RUNTIME) {
	const produkcja = process.env.NODE_ENV === "production";
	if (produkcja && nieJestLokalnaBazaTestowa(runtimeUrl)) {
		throw new Error(KOMUNIKAT_BRAK_DSN_RUNTIME);
	}
	if (process.env.NODE_ENV !== "test") {
		// Poza produkcją oraz na bazie lokalnej zostaje ostrzeżenie — tam
		// fallback na ownera jest świadomym stanem Fazy 1. W teście env jest
		// placeholderem; ostrzeżenie spamowałoby output.
		console.warn(
			"[db] DATABASE_URL_RUNTIME nieustawione — withTenantContext fallbackuje na DATABASE_URL (owner). " +
				"§8 #1 Phase 2 (ops): ALTER ROLE app_runtime LOGIN PASSWORD '<gen>' + ustaw DATABASE_URL_RUNTIME.",
		);
	}
}
export const dbRuntime = drizzle(runtimeUrl, { schema });
