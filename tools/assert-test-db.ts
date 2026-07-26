/**
 * assert-test-db — guard bezpieczeństwa bazy (allowlista hostów lokalnych).
 *
 * Wywołaj PRZED każdą operacją dotykającą bazy (migrate, seed, push, studio, e2e).
 * Przerywa z czytelnym błędem, gdy DATABASE_URL wskazuje na host spoza allowlisty
 * lokalnych hostów — CHYBA że ustawiono jawną flagę potwierdzenia.
 *
 * Wzorzec: ALLOWLISTA (dozwolone hosty lokalne), nie denylista —
 * łapie każdy zdalny host, nie tylko znane nazwy produkcyjne.
 *
 * Logika decyzyjna (trzy ścieżki):
 *   1. Host LOKALNY (localhost / 127.0.0.1 / ::1) → przechodzi cicho.
 *      CI (PostgreSQL w kontenerze na localhost) przechodzi bez żadnej flagi.
 *   2. Host ZDALNY + brak CONFIRM_PROD_DB=1 → ABORT z instrukcją.
 *      Zamyka incydent „gołe db:migrate z prod-DSN".
 *   3. Host ZDALNY + CONFIRM_PROD_DB=1 → przechodzi (świadoma ścieżka operatora).
 *      Darek na prod: $env:CONFIRM_PROD_DB=1; pnpm db:migrate
 *
 * Hard-deny (warstwa dodatkowa, pierwsza — przed parsowaniem hosta):
 *   Zawsze blokuje znane fragmenty prod-URL nawet przy CONFIRM_PROD_DB=1 i E2E_ALLOW_REMOTE=1.
 *   Cel: ostatnia linia obrony przy dosłownym prod-DSN.
 *
 * E2E_ALLOW_REMOTE=1 (legacy dla seed-e2e / b5-contract-test):
 *   Przepuszcza zdalny host jak CONFIRM_PROD_DB=1, ale tylko gdy NIE trafił w hard-deny.
 *   Obie flagi traktowane równorzędnie.
 *
 * Dozwolone hosty lokalne:
 *   localhost / 127.0.0.1 / ::1
 *
 * Nie zmieniaj drizzle.config.ts — guard żyje w wrapperach skryptów.
 * db:generate nie łączy się z bazą i nie używa tego guarda.
 */

/** Hosty bezwarunkowo dozwolone — lokalny kontener / loopback. */
const ALLOWED_LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

/**
 * Fragmenty bezwarunkowo blokowane w surowym URL (hard-deny).
 * Sprawdzane PRZED parsowaniem hosta — pierwsza warstwa ochrony.
 * Blokuje nawet przy CONFIRM_PROD_DB=1 i E2E_ALLOW_REMOTE=1.
 */
const HARD_DENY_FRAGMENTS = [
	"skill-bridge-ai", // produkcyjna baza Neon SkillBridge
];

/**
 * Zwraca znormalizowany hostname z connection stringa PostgreSQL.
 *
 * Obsługuje:
 *   postgresql://user:pass@host:port/dbname
 *   postgres://user:pass@host/dbname
 *   IPv6: postgresql://u@[::1]:5432/db → zwraca "::1" (bez nawiasów)
 *
 * Zwraca null gdy nie udało się sparsować (nieznany format DSN).
 */
export function parseDbHost(url: string): string | null {
	try {
		if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
			const parsed = new URL(url);
			const hostname = parsed.hostname || null;
			if (!hostname) return null;
			// Normalizacja IPv6: URL.hostname zwraca "[::1]" z nawiasami — stripujemy.
			return hostname.replace(/^\[|\]$/g, "");
		}
	} catch {
		// URL.parse rzucił — prawdopodobnie nieparseable DSN
	}
	return null;
}

/**
 * Czy DSN wskazuje na DEDYKOWANĄ bazę testową (host lokalny **i** nazwa bazy
 * `test` albo z sufiksem `_test`).
 *
 * Dlaczego osobno od `assertTestDb`: guard chroni przed bazą ZDALNĄ, ale
 * przepuszcza każdą lokalną — w tym bazę DEWELOPERSKĄ (`localhost:5432/skillbridge`).
 * Testy integracyjne, które kasują i przepisują wiersze, nie mogą stać na
 * „dowolnym lokalnym porcie": dotąd suita ingestu przechodziła własną bramkę
 * pomijania i pisała do bazy dewelopera, bo importowany moduł ładował
 * `.env.local` (dług C1 z przeglądu Leo, 1E.7 L2).
 *
 * Przechodzi: `@localhost:5433/skillbridge_test` (docker-compose.test.yml),
 * `@localhost:5432/skillbridge_test` (usługa Postgres w CI), `@127.0.0.1/test`.
 * Nie przechodzi: `@localhost:5432/skillbridge` (baza deweloperska), każdy host zdalny.
 */
export function isDedicatedTestDbUrl(dbUrl: string | undefined): boolean {
	if (!dbUrl) return false;
	const host = parseDbHost(dbUrl);
	if (host === null || !ALLOWED_LOCAL_HOSTS.includes(host)) return false;
	let dbName: string;
	try {
		dbName = new URL(dbUrl).pathname.replace(/^\//, "");
	} catch {
		return false;
	}
	return dbName === "test" || dbName.endsWith("_test");
}

/**
 * Guard bezpieczeństwa bazy — sprawdza host i wymagane flagi.
 *
 * Kolejność sprawdzeń (KRYTYCZNA — nie zmieniaj):
 *   1. Hard-deny na surowym stringu → ABORT bezwarunkowo.
 *   2. Parsowanie hosta.
 *   3. Nieparseable + brak flagi → ABORT.
 *   4. Host lokalny → PASS cicho.
 *   5. Host zdalny + flaga (CONFIRM_PROD_DB=1 lub E2E_ALLOW_REMOTE=1) → PASS z ostrzeżeniem.
 *   6. Host zdalny + brak flagi → ABORT z instrukcją jak postąpić.
 *
 * @param dbUrl   Wartość zmiennej z DSN (DATABASE_URL, E2E_DATABASE_URL, itp.)
 * @param varName Nazwa zmiennej (dla czytelnego komunikatu błędu)
 */
export function assertTestDb(dbUrl: string | undefined, varName = "DATABASE_URL"): void {
	if (!dbUrl) {
		throw new Error(
			`[assert-test-db] STOP: ${varName} nie jest ustawiona. ` +
				"Podaj connection string do lokalnej / testowej bazy danych.",
		);
	}

	// ── 1. HARD-DENY — pierwsza warstwa, na surowym stringu, bezwarunkowa ─────
	// Musi być PRZED gałęzią host===null, żeby nieparseable URL + fragment prod
	// nie był przepuszczany przez E2E_ALLOW_REMOTE=1.
	const hardDenied = HARD_DENY_FRAGMENTS.find((frag) => dbUrl.toLowerCase().includes(frag));
	if (hardDenied) {
		throw new Error(
			`[assert-test-db] ODMOWA: ${varName} zawiera fragment "${hardDenied}", ` +
				`który wygląda na produkcyjną bazę SkillBridge. ` +
				`Operacja na tej bazie jest zakazana z tego skryptu. ` +
				`(Ani CONFIRM_PROD_DB=1 ani E2E_ALLOW_REMOTE=1 nie obchodzą tej blokady)`,
		);
	}

	// ── 2. Parsowanie hosta ────────────────────────────────────────────────────
	const host = parseDbHost(dbUrl);

	// Flagi świadomego przejścia (równorzędne — obie traktowane jak "znam ryzyko")
	const confirmProd = process.env.CONFIRM_PROD_DB === "1";
	const allowRemote = process.env.E2E_ALLOW_REMOTE === "1";
	const hasRemoteFlag = confirmProd || allowRemote;

	// ── 3. Nieparseable URL ───────────────────────────────────────────────────
	if (host === null) {
		if (!hasRemoteFlag) {
			throw new Error(
				`[assert-test-db] STOP: nie udało się sparsować hosta z ${varName}. ` +
					"Sprawdź format connection stringa. " +
					"Aby świadomie uruchomić na zdalnej bazie: ustaw CONFIRM_PROD_DB=1.",
			);
		}
		console.warn(
			`[assert-test-db] OSTRZEŻENIE: nie udało się sparsować hosta z ${varName}. ` +
				"Flaga potwierdzenia ustawiona — przepuszczam.",
		);
		return;
	}

	// ── 4. Host lokalny — PASS cicho ─────────────────────────────────────────
	if (ALLOWED_LOCAL_HOSTS.includes(host)) {
		return;
	}

	// ── 5. Host zdalny + flaga potwierdzenia — PASS z ostrzeżeniem ───────────
	if (hasRemoteFlag) {
		const flagName = confirmProd ? "CONFIRM_PROD_DB=1" : "E2E_ALLOW_REMOTE=1";
		console.warn(
			`[assert-test-db] OSTRZEŻENIE: ${varName} wskazuje na zdalny host "${host}". ` +
				`${flagName} ustawione — przyjmuję świadomą decyzję operatora. ` +
				`NIE używaj z bazą prod bez pełnej świadomości konsekwencji.`,
		);
		return;
	}

	// ── 6. Host zdalny + brak flagi — ABORT z instrukcją ─────────────────────
	throw new Error(
		`[assert-test-db] ABORT: ${varName} wskazuje na zdalny host "${host}" — możliwy prod lub zdalny serwer. ` +
			`Dozwolone hosty lokalne: ${ALLOWED_LOCAL_HOSTS.join(", ")}. ` +
			`Dla testów użyj lokalnej bazy / pnpm db:migrate:test. ` +
			`Aby świadomie uruchomić na zdalnej bazie: ustaw CONFIRM_PROD_DB=1 ` +
			`(PowerShell: $env:CONFIRM_PROD_DB=1; pnpm db:migrate).`,
	);
}
