/**
 * assert-test-db — guard bezpieczeństwa bazy (allowlista hostów lokalnych).
 *
 * Wywołaj PRZED każdą operacją dotykającą bazy (migrate, seed, push, studio, e2e).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REGUŁA, KTÓREJ TEN PLIK PILNUJE (spisana ZANIM powstało dopasowanie)
 * ═══════════════════════════════════════════════════════════════════════════
 * „Narzędzie z tego repo nie dotyka bazy produkcyjnej — chyba że ceremonia
 *  produkcyjna jest udokumentowaną częścią zadania TEGO narzędzia, a operator
 *  potwierdził ją jawną flagą."
 *
 * Reguła ma dwie części, a dawniej egzekwowana była tylko druga:
 *   (1) KTÓRE narzędzie w ogóle może sięgnąć na produkcję → deklaracja w KODZIE
 *       (`{ allowProduction: true }`), nie zmienna w powłoce. Zmienna jest
 *       dziedziczona przez każdy proces potomny i nie wie, które narzędzie
 *       właśnie odpalasz.
 *   (2) CZY operator jest świadomy → flaga CONFIRM_PROD_DB=1 (albo
 *       E2E_ALLOW_REMOTE=1), czytana WYŁĄCZNIE u narzędzi z punktu (1).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POLARYZACJA: ALLOWLISTA. ŻADNEJ NAZWY PRODUKCJI W TYM PLIKU
 * ═══════════════════════════════════════════════════════════════════════════
 * Przechodzą wyłącznie hosty lokalne (`ALLOWED_LOCAL_HOSTS`). Wszystko inne —
 * dowolny host zdalny, dowolny dostawca, DSN nieparseowalny — jest odmawiane.
 *
 * Nie wolno tu dodać nazwy naszej bazy produkcyjnej, adresu punktu dostępowego
 * ani nazwy projektu. Powód jest empiryczny, nie estetyczny. Poprzednia wersja
 * miała warstwę „hard-deny" opisaną jako „ostatnia linia obrony przy dosłownym
 * prod-DSN", której JEDYNYM dopasowaniem był fragment `"skill-bridge-ai"` —
 * nazwa projektu na Vercelu, wpisana z pamięci. W adresie naszej bazy
 * produkcyjnej ten fragment nie występuje ani razu, więc warstwa nie broniła
 * przed niczym, co nazywała (pomiar: Ryan/CRCO, 2026-08-12, odczyt
 * `vercel env run -e production` + sonda z prawdziwym DSN → „PRZEPUSZCZONY").
 *
 * Dopasowanie po nazwie ma dwa tryby awarii i oba już nas kosztowały:
 *   - nazwa z pamięci nigdy nie pasowała do rzeczywistości (stan zastany);
 *   - nazwa z dzisiejszego pomiaru zestarzeje się po CICHU przy pierwszej
 *     migracji punktu dostępowego albo zmianie dostawcy.
 * Allowlista hostów lokalnych nie ma żadnego z tych trybów: nie wie, jak
 * nazywa się produkcja, i nie musi wiedzieć. „Lokalny" jest własnością, nie
 * nazwą — zmiana dostawcy bazy nie może tej reguły osłabić.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DWIE POLITYKI WYWOŁANIA
 * ═══════════════════════════════════════════════════════════════════════════
 * A. DOMYŚLNA — `assertTestDb(dsn, varName)` — „to narzędzie nigdy nie tyka
 *    produkcji". Przechodzi wyłącznie host lokalny; host zdalny i DSN
 *    nieparseowalny → ABORT. **Żadna zmienna środowiskowa tego nie obchodzi**
 *    (ani CONFIRM_PROD_DB=1, ani E2E_ALLOW_REMOTE=1). To jest realna „ostatnia
 *    linia obrony": operator, który wyeksportował flagę do legalnej ceremonii
 *    i w tej samej powłoce odpalił narzędzie destrukcyjne, zostaje zatrzymany.
 *
 * B. CEREMONIA — `assertTestDb(dsn, varName, { allowProduction: true })` —
 *    dla narzędzi, których udokumentowanym zadaniem jest ceremonia produkcyjna
 *    (migracja schemy, zaciąg treści, remediacja — delegacja v1.12, CLAUDE.md
 *    §5). Host lokalny → PASS. Host zdalny + CONFIRM_PROD_DB=1 (albo
 *    E2E_ALLOW_REMOTE=1) → PASS z ostrzeżeniem. Host zdalny bez flagi → ABORT.
 *
 * Zasięg polityki B jest policzalny i pilnowany: strażnik
 * `tests/unit/tools/assert-test-db-zasieg-ceremonii.test.ts` czerwieni się,
 * gdy `allowProduction` pojawi się w narzędziu spoza spisanej listy. Poszerzenie
 * dostępu do produkcji nie da się zrobić po cichu.
 *
 * Dozwolone hosty lokalne:
 *   localhost / 127.0.0.1 / ::1
 *
 * Nie zmieniaj drizzle.config.ts — guard żyje w wrapperach skryptów.
 * db:generate nie łączy się z bazą i nie używa tego guarda.
 */

/** Hosty bezwarunkowo dozwolone — lokalny kontener / loopback. */
const ALLOWED_LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

/** Opcje polityki wywołania. Brak opcji = polityka A („nigdy produkcja"). */
export type AssertTestDbOptions = {
	/**
	 * `true` = to narzędzie MA udokumentowaną ceremonię produkcyjną i wolno mu
	 * sięgnąć na host zdalny, gdy operator ustawi CONFIRM_PROD_DB=1.
	 * Ustawiaj WYŁĄCZNIE w narzędziach wymienionych w strażniku zasięgu
	 * (`tests/unit/tools/assert-test-db-zasieg-ceremonii.test.ts`) — inaczej
	 * bramka zapala się na czerwono i zmiana nie przechodzi.
	 */
	allowProduction?: boolean;
};

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
 * Guard bezpieczeństwa bazy — sprawdza host, a flagi tylko w polityce ceremonii.
 *
 * Kolejność sprawdzeń (KRYTYCZNA — nie zmieniaj):
 *   1. Brak DSN → STOP.
 *   2. Parsowanie hosta.
 *   3. Host lokalny → PASS cicho (obie polityki; CI stoi na loopbacku).
 *   4. Polityka DOMYŚLNA (bez `allowProduction`) → ODMOWA bezwarunkowa.
 *      Zmienne środowiskowe NIE są tu w ogóle czytane.
 *   5. Polityka CEREMONII + flaga (CONFIRM_PROD_DB=1 / E2E_ALLOW_REMOTE=1) → PASS z ostrzeżeniem.
 *   6. Polityka CEREMONII bez flagi → ABORT z instrukcją jak postąpić.
 *
 * DSN nieparseowalny jest traktowany jak host zdalny (nie jak host lokalny) —
 * guard, który nie rozumie adresu, nie ma podstaw twierdzić, że jest bezpieczny.
 *
 * @param dbUrl   Wartość zmiennej z DSN (DATABASE_URL, E2E_DATABASE_URL, itp.)
 * @param varName Nazwa zmiennej (dla czytelnego komunikatu błędu)
 * @param options `{ allowProduction: true }` wyłącznie dla narzędzi z udokumentowaną
 *                ceremonią produkcyjną — patrz strażnik zasięgu.
 */
export function assertTestDb(
	dbUrl: string | undefined,
	varName = "DATABASE_URL",
	options: AssertTestDbOptions = {},
): void {
	if (!dbUrl) {
		throw new Error(
			`[assert-test-db] STOP: ${varName} nie jest ustawiona. ` +
				"Podaj connection string do lokalnej / testowej bazy danych.",
		);
	}

	const allowProduction = options.allowProduction === true;

	// ── 2. Parsowanie hosta ────────────────────────────────────────────────────
	const host = parseDbHost(dbUrl);

	// ── 3. Host lokalny — PASS cicho (obie polityki) ──────────────────────────
	if (host !== null && ALLOWED_LOCAL_HOSTS.includes(host)) {
		return;
	}

	// Dalej: host jest ZDALNY albo DSN nieparseowalny.
	const opisHosta = host === null ? "host nieparseowalny z DSN" : `zdalny host "${host}"`;

	// ── 4. Polityka DOMYŚLNA — ODMOWA BEZWARUNKOWA ────────────────────────────
	// Świadomie NIE czytamy tu process.env. Flaga wyeksportowana do innej,
	// legalnej ceremonii nie może otwierać drogi narzędziu, które produkcji
	// nigdy nie powinno tknąć. To jest ta „ostatnia linia obrony", która
	// wcześniej istniała wyłącznie w komentarzu.
	if (!allowProduction) {
		throw new Error(
			`[assert-test-db] ODMOWA: ${varName} wskazuje na ${opisHosta}, ` +
				`a to narzędzie nie ma ceremonii produkcyjnej — wolno mu wyłącznie na host lokalny ` +
				`(${ALLOWED_LOCAL_HOSTS.join(", ")}). ` +
				`Tej odmowy NIE obchodzi żadna zmienna środowiskowa ` +
				`(ani CONFIRM_PROD_DB=1, ani E2E_ALLOW_REMOTE=1). ` +
				`Jeśli to narzędzie naprawdę ma mieć ceremonię produkcyjną — to zmiana w kodzie ` +
				`(opcja { allowProduction: true }) plus dopisanie go do strażnika zasięgu, ` +
				`a nie flaga w powłoce.`,
		);
	}

	// ── 5/6. Polityka CEREMONII — decyduje jawna flaga operatora ──────────────
	const confirmProd = process.env.CONFIRM_PROD_DB === "1";
	const allowRemote = process.env.E2E_ALLOW_REMOTE === "1";

	if (confirmProd || allowRemote) {
		const flagName = confirmProd ? "CONFIRM_PROD_DB=1" : "E2E_ALLOW_REMOTE=1";
		console.warn(
			`[assert-test-db] OSTRZEŻENIE: ${varName} wskazuje na ${opisHosta}. ` +
				`${flagName} ustawione — przyjmuję świadomą decyzję operatora. ` +
				`NIE używaj z bazą prod bez pełnej świadomości konsekwencji.`,
		);
		return;
	}

	throw new Error(
		`[assert-test-db] ABORT: ${varName} wskazuje na ${opisHosta} — możliwy prod lub zdalny serwer. ` +
			`Dozwolone hosty lokalne: ${ALLOWED_LOCAL_HOSTS.join(", ")}. ` +
			`Dla testów użyj lokalnej bazy / pnpm db:migrate:test. ` +
			`Aby świadomie uruchomić na zdalnej bazie: ustaw CONFIRM_PROD_DB=1 ` +
			`(PowerShell: $env:CONFIRM_PROD_DB=1; pnpm db:migrate).`,
	);
}
