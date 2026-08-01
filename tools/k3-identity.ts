/**
 * k3-identity — TOŻSAMOŚĆ POŁĄCZENIA dla skryptu walidacyjnego `k3-validate`.
 *
 * Po co to istnieje (1E.7 A5, zlecenie Ethana/CTO):
 * zielone `k3-validate` nie dowodziło niczego o KONKRETNEJ bazie, bo z wyjścia nie
 * dało się odczytać, gdzie przebieg się odbył. Strażnik świecił identycznie (25/25)
 * wtedy, gdy podejrzewaliśmy brak izolacji RLS (row level security — izolacja
 * wierszy po właścicielu) na produkcji, i wtedy, gdy ustaliliśmy, że izolacja
 * zachodzi — bo nie mierzył jej wcale. Dowód, który nie mówi, czego dotyczy, nie
 * jest dowodem: identyfikacja bazy jest nośnikiem warunku A22-3 oceny art. 22 RODO
 * (wykładowca nie widzi placementu studenta — skutek nie opuszcza platformy).
 *
 * Sedno to ROLA POŁĄCZENIA. Testy izolacji uruchomione z roli omijającej RLS
 * (superuser albo rola z atrybutem BYPASSRLS) mierzą co innego niż te same testy
 * z roli aplikacyjnej — czytelnik wyniku musi to widzieć bez zaglądania do kodu.
 *
 * ZASADA BEZPIECZEŃSTWA: dane tożsamości pochodzą z ZAPYTANIA DO BAZY
 * (`current_database()`, `session_user`, `current_user`, `inet_server_addr()`),
 * a NIE z parsowania łańcucha połączenia, w którym siedzi hasło. Typ `DbIdentity`
 * nie ma pola na hasło ani na DSN — wyciek jest strukturalnie niemożliwy, a
 * `sanitizeField` jest drugą linią obrony na wypadek, gdyby ktoś kiedyś wstawił
 * w pole tożsamości cały łańcuch połączenia.
 */

/** Maska pola, które wygląda na łańcuch połączenia (może zawierać hasło). */
export const SEKRET_MASKA = "(ukryte — wartość wygląda na łańcuch połączenia)";

/** Etykieta pola nieustalonego (np. `inet_server_addr()` zwraca NULL na Neonie). */
export const BRAK = "n/d";

/**
 * Tożsamość bazy, na której odbył się przebieg walidacji.
 * Świadomie BEZ pola na hasło / DSN — patrz nagłówek pliku.
 */
export type DbIdentity = {
	/** Punkt końcowy, z którym połączył się klient (host bez poświadczeń). */
	endpointHost: string | null;
	/** Port punktu końcowego po stronie klienta (np. 5433 dla kontenera testowego). */
	endpointPort: number | null;
	/** Adres serwera widziany przez samą bazę — `inet_server_addr()`. NULL na Neonie/socket. */
	serverAddr: string | null;
	/** Port serwera widziany przez samą bazę — `inet_server_port()`. */
	serverPort: number | null;
	/** Nazwa bazy — `current_database()`. */
	database: string | null;
	/** Rola, z którą UWIERZYTELNIONO połączenie — `session_user`. */
	sessionUser: string | null;
	/** Rola efektywna w chwili odczytu — `current_user` (różna po `SET ROLE`). */
	currentUser: string | null;
	/** Czy rola bieżąca ma atrybut BYPASSRLS. */
	bypassRls: boolean | null;
	/** Czy rola bieżąca jest superużytkownikiem (superuser omija RLS z definicji). */
	superUser: boolean | null;
	/** Ile tabel bazowych ma schemat `public` (mianownik dla własności). */
	publicTables: number | null;
	/** Ile z nich NALEŻY do roli bieżącej — właściciel omija politykę bez FORCE RLS. */
	ownedTables: number | null;
	/** Ile własnych tabel ma FORCE RLS (tam właściciel podlega politykom). */
	ownedForceTables: number | null;
	/** Wersja serwera PostgreSQL. */
	serverVersion: string | null;
};

/** Minimalny kontrakt klienta bazy — pozwala testować bez połączenia. */
export type Queryable = {
	query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

/**
 * Zamienia wartość na tekst do wypisania i maskuje wszystko, co wygląda na
 * łańcuch połączenia (`://` albo `@`) — hasło nigdy nie trafia do wyjścia.
 */
export function sanitizeField(value: unknown): string {
	if (value === null || value === undefined || value === "") return BRAK;
	const s = String(value);
	if (s.includes("://") || s.includes("@")) return SEKRET_MASKA;
	return s;
}

/**
 * Czy rola bieżąca omija RLS (superuser LUB atrybut BYPASSRLS).
 * `null` = nie udało się ustalić — traktuj jak brak dowodu, nie jak „NIE".
 */
export function omijaRls(id: DbIdentity): boolean | null {
	if (id.superUser === null && id.bypassRls === null) return null;
	return id.superUser === true || id.bypassRls === true;
}

/** Etykieta pola „omija RLS" — jawnie mówi CZYM omija (to zmienia wagę wyniku). */
export function etykietaOmijaRls(id: DbIdentity): string {
	const wynik = omijaRls(id);
	if (wynik === null) return "NIEUSTALONE";
	if (!wynik) return "NIE";
	const powody = [
		id.superUser === true ? "SUPERUSER" : null,
		id.bypassRls === true ? "BYPASSRLS" : null,
	].filter(Boolean);
	return `TAK (${powody.join(" + ")})`;
}

/**
 * Etykieta WŁASNOŚCI TABEL — druga (i na produkcji WAŻNIEJSZA) droga omijania RLS.
 *
 * Pytanie Olivera przed ceremonią A6: czy zielone k3 na Neonie z rolą `neondb_owner`
 * pokaże „omija RLS: NIE"? Odpowiedź: atrybuty roli owszem będą puste (bez SUPERUSER,
 * bez BYPASSRLS), ale `neondb_owner` jest WŁAŚCICIELEM tabel — a właściciel omija
 * politykę RLS niezależnie od atrybutów, dopóki tabela nie ma FORCE RLS. Sama linia
 * „omija RLS: NIE" byłaby więc myląca. Dlatego drukujemy oba fakty obok siebie.
 */
export function etykietaWlasnosci(id: DbIdentity): string {
	if (id.ownedTables === null || id.publicTables === null) return "NIEUSTALONE";
	const force = id.ownedForceTables === null ? BRAK : String(id.ownedForceTables);
	return `${id.ownedTables}/${id.publicTables} tabel public (z FORCE RLS: ${force})`;
}

/** `host:port` punktu końcowego, oba pola sanityzowane. */
function endpoint(id: DbIdentity): string {
	const host = sanitizeField(id.endpointHost);
	const port = sanitizeField(id.endpointPort);
	return port === BRAK ? host : `${host}:${port}`;
}

/**
 * Blok tożsamości na GÓRĘ wyjścia — czytelnik widzi, czego dotyczy wszystko poniżej.
 */
export function formatIdentityHeader(id: DbIdentity): string {
	const serwer =
		sanitizeField(id.serverAddr) === BRAK
			? BRAK
			: `${sanitizeField(id.serverAddr)}:${sanitizeField(id.serverPort)}`;
	return [
		"══ TOŻSAMOŚĆ BAZY — czego dotyczy ten przebieg ══════════════════════════",
		`  punkt końcowy   : ${endpoint(id)}`,
		`  baza            : ${sanitizeField(id.database)}`,
		`  adres serwera   : ${serwer}   (inet_server_addr — NULL na Neonie/socket)`,
		`  rola sesji      : ${sanitizeField(id.sessionUser)}   (session_user — czym uwierzytelniono połączenie)`,
		`  rola bieżąca    : ${sanitizeField(id.currentUser)}   (current_user — rola efektywna)`,
		`  omija RLS (rola): ${etykietaOmijaRls(id)}   (atrybuty roli: SUPERUSER / BYPASSRLS)`,
		`  własność tabel  : ${etykietaWlasnosci(id)}`,
		`  PostgreSQL      : ${sanitizeField(id.serverVersion)}`,
		'  jak to czytać   : „omija RLS: NIE" dotyczy WYŁĄCZNIE atrybutów roli i NIE znaczy, że ta',
		"                    sesja widzi tylko swoje dane. Właściciel tabeli omija politykę niezależnie",
		"                    od atrybutów — chroni przed tym dopiero FORCE RLS (test 10a), a i wtedy",
		"                    polityka owner_passthrough celowo daje właścicielowi pełny wgląd.",
		"                    Izolację mierzą wyłącznie testy 5/5b/6/10c (po SET LOCAL ROLE app_*).",
		"════════════════════════════════════════════════════════════════════════",
	].join("\n");
}

/**
 * Jedna linia do werdyktu końcowego — czytelnik, który zobaczy tylko ostatnią
 * linię wyjścia (np. w podsumowaniu CI), ma wiedzieć, czego ona dotyczy.
 */
export function formatIdentityOneLine(id: DbIdentity): string {
	return (
		`baza ${sanitizeField(id.database)} @ ${endpoint(id)} · ` +
		`rola sesji: ${sanitizeField(id.sessionUser)} · omija RLS (atrybuty): ${etykietaOmijaRls(id)} · ` +
		`właściciel ${etykietaWlasnosci(id)}`
	);
}

/** Zapytanie tożsamości — WYŁĄCZNIE metadane, zero poświadczeń. */
export const IDENTITY_SQL = `
	SELECT current_database()                AS database_name,
	       session_user                      AS session_user_name,
	       current_user                      AS current_user_name,
	       host(inet_server_addr())          AS server_addr,
	       inet_server_port()::int           AS server_port,
	       current_setting('server_version') AS server_version,
	       (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypass_rls,
	       (SELECT rolsuper     FROM pg_roles WHERE rolname = current_user) AS is_super,
	       (SELECT count(*)::int FROM pg_class c
	          JOIN pg_namespace n ON n.oid = c.relnamespace
	         WHERE n.nspname = 'public' AND c.relkind = 'r') AS public_tables,
	       (SELECT count(*)::int FROM pg_class c
	          JOIN pg_namespace n ON n.oid = c.relnamespace
	         WHERE n.nspname = 'public' AND c.relkind = 'r'
	           AND pg_get_userbyid(c.relowner) = current_user) AS owned_tables,
	       (SELECT count(*)::int FROM pg_class c
	          JOIN pg_namespace n ON n.oid = c.relnamespace
	         WHERE n.nspname = 'public' AND c.relkind = 'r'
	           AND pg_get_userbyid(c.relowner) = current_user
	           AND c.relforcerowsecurity) AS owned_force_tables`;

/**
 * Odczytuje tożsamość bazy ZAPYTANIEM (nie z DSN).
 *
 * @param client        połączenie (pooled client `pg` albo atrapa w teście)
 * @param endpointHost  host punktu końcowego z konfiguracji klienta `pg` (pole
 *                      strukturalne, nie parsowany przez nas łańcuch z hasłem);
 *                      na Neonie to jedyny czytelny dla człowieka identyfikator,
 *                      bo `inet_server_addr()` zwraca tam NULL
 * @param endpointPort  port punktu końcowego z konfiguracji klienta `pg`
 */
export async function readDbIdentity(
	client: Queryable,
	endpointHost: string | null = null,
	endpointPort: number | null = null,
): Promise<DbIdentity> {
	const { rows } = await client.query(IDENTITY_SQL);
	const r = rows[0] ?? {};
	const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
	const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
	const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
	return {
		endpointHost,
		endpointPort,
		serverAddr: str(r.server_addr),
		serverPort: num(r.server_port),
		database: str(r.database_name),
		sessionUser: str(r.session_user_name),
		currentUser: str(r.current_user_name),
		bypassRls: bool(r.bypass_rls),
		superUser: bool(r.is_super),
		publicTables: num(r.public_tables),
		ownedTables: num(r.owned_tables),
		ownedForceTables: num(r.owned_force_tables),
		serverVersion: str(r.server_version),
	};
}
