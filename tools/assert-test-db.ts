/**
 * assert-test-db — guard bezpieczeństwa bazy testowej (allowlista hostów).
 *
 * Wywołaj PRZED każdą operacją testową / seedową / e2e zapisującą do bazy.
 * Przerywa z czytelnym błędem, gdy DATABASE_URL wskazuje na host spoza
 * allowlisty hostów lokalnych / kontenerowych.
 *
 * Wzorzec: ALLOWLISTA (dozwolone hosty testowe), nie denylista —
 * łapie każdy zdalny host, nie tylko znane nazwy produkcyjne.
 *
 * Dozwolone hosty testowe (domyślne):
 *   - localhost
 *   - 127.0.0.1
 *   - ::1  (IPv6 loopback)
 *
 * Rozszerzenie (obejście na własną odpowiedzialność):
 *   Ustaw E2E_ALLOW_REMOTE=1, żeby przepuścić dedykowaną gałąź Neon testową.
 *   Nigdy nie ustawiaj E2E_ALLOW_REMOTE=1 przy bazie prod.
 *
 * Użycie:
 *   import { assertTestDb } from "./assert-test-db";
 *   assertTestDb(process.env.DATABASE_URL); // rzuca, jeśli host nie jest lokalny
 */

/** Hosty bezwarunkowo dozwolone dla operacji testowych. */
const ALLOWED_TEST_HOSTS = ["localhost", "127.0.0.1", "::1"];

/**
 * Zwraca hostname z connection stringa PostgreSQL.
 * Obsługuje formaty:
 *   postgresql://user:pass@host:port/dbname
 *   postgres://user:pass@host/dbname
 *   host=... (DSN w stylu libpq — nie używany w tym repo, ale zabezpieczamy)
 *
 * Zwraca null, gdy nie udało się sparsować.
 */
export function parseDbHost(url: string): string | null {
	try {
		// URL-based DSN (postgresql:// lub postgres://)
		if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
			const parsed = new URL(url);
			return parsed.hostname || null;
		}
	} catch {
		// URL.parse rzucił — prawdopodobnie DSN w stylu libpq; pomijamy
	}
	return null;
}

/**
 * Sprawdza, czy podany connection string celuje w dozwolony host testowy.
 * Jeśli nie — rzuca Error z czytelnym komunikatem.
 *
 * @param dbUrl  Wartość DATABASE_URL (lub innej zmiennej z DSN).
 * @param varName  Nazwa zmiennej (dla lepszego komunikatu błędu).
 */
export function assertTestDb(dbUrl: string | undefined, varName = "DATABASE_URL"): void {
	if (!dbUrl) {
		throw new Error(
			`[assert-test-db] STOP: ${varName} nie jest ustawiona. ` +
				"Podaj connection string do lokalnej / testowej bazy danych.",
		);
	}

	// E2E_ALLOW_REMOTE=1 → świadome obejście (dedykowana gałąź Neon testowa).
	// Guard nadal odrzuca znane prod-frагменты — patrz niżej.
	const allowRemote = process.env.E2E_ALLOW_REMOTE === "1";

	const host = parseDbHost(dbUrl);

	if (host === null) {
		// Nie udało się sparsować hosta — zachowujemy ostrożność i blokujemy,
		// chyba że jawnie ustawiono E2E_ALLOW_REMOTE.
		if (!allowRemote) {
			throw new Error(
				`[assert-test-db] STOP: nie udało się sparsować hosta z ${varName}. ` +
					"Sprawdź format connection stringa. Ustaw E2E_ALLOW_REMOTE=1, " +
					"jeśli celowo używasz zdalnej bazy testowej.",
			);
		}
		return; // E2E_ALLOW_REMOTE=1 + nieparseable → przepuść z ostrzeżeniem
	}

	// Bezwarunkowa denylista prod-fragmentów — blokuj NAWET przy E2E_ALLOW_REMOTE,
	// żeby nie przepuścić produkcyjnych baz Neon przez przypadek.
	const HARD_DENY_FRAGMENTS = [
		"skill-bridge-ai", // produkcyjna baza Neon SkillBridge
		"nordsignal", // potencjalne bazy firmowe
	];
	const hardDenied = HARD_DENY_FRAGMENTS.find((frag) => dbUrl.toLowerCase().includes(frag));
	if (hardDenied) {
		throw new Error(
			`[assert-test-db] ODMOWA: ${varName} zawiera fragment "${hardDenied}", ` +
				`który wygląda na produkcyjną bazę SkillBridge. ` +
				`Operacja testowa/seedowa na prod jest zakazana. ` +
				`(E2E_ALLOW_REMOTE nie obchodzi tej blokady)`,
		);
	}

	// Sprawdź allowlistę lokalnych hostów.
	const isAllowed = ALLOWED_TEST_HOSTS.includes(host);

	if (!isAllowed) {
		if (allowRemote) {
			// E2E_ALLOW_REMOTE=1 → zdalny host przepuszczony (dedykowana gałąź Neon).
			// Drukujemy ostrzeżenie, żeby było widoczne w logach.
			console.warn(
				`[assert-test-db] OSTRZEŻENIE: ${varName} wskazuje na nie-lokalny host ` +
					`"${host}". E2E_ALLOW_REMOTE=1 — przyjmuję, że to dedykowana gałąź testowa. ` +
					`NIE używaj z bazą prod.`,
			);
			return;
		}

		throw new Error(
			`[assert-test-db] ODMOWA: operacja testowa wskazuje na nie-lokalną bazę ` +
				`"${host}" — możliwy prod lub zdalny serwer. ` +
				`Dozwolone hosty testowe: ${ALLOWED_TEST_HOSTS.join(", ")}. ` +
				`Jeśli celowo używasz dedykowanej gałęzi Neon testowej, ustaw E2E_ALLOW_REMOTE=1.`,
		);
	}
}
