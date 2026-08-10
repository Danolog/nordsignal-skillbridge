/**
 * integration-db-guard — twardy warunek wstępny zestawu integracyjnego.
 *
 * PROBLEM, KTÓRY TO ZAMYKA
 * ------------------------
 * Do 2026-08-06 każdy plik `*.integration.test.ts` niósł własną bramkę
 * pomijania: `const dBack = isLocalTestDb ? describe : describe.skip;`
 * (regexp na hoście z DATABASE_URL, powielony w każdym z nich).
 *
 * Ile jest kopii — NIE wpisujemy tu liczbą. Liczy je przebieg:
 * `__tests__/bramki-powielone-spis.test.ts`. Powód w sekcji „PRÓG
 * KONSOLIDACJI" niżej: każda liczba wpisana ręcznie opisuje przeszłość.
 *
 * Bez ustawionej `DATABASE_URL` cały zestaw pomijał się PO CICHU: przebieg
 * kończył się kodem 0, a podsumowanie („388 skipped") wyglądało jak sukces.
 * Zielony przebieg nie mówił nic o tym, co miał sprawdzić — to była
 * przyczyna, dla której trzy atrapy-strażniki przeżyły w kodzie do
 * 2026-08-01 (znaleziska klasy „strażnik-atrapa", 1E.7).
 *
 * ROZWIĄZANIE
 * -----------
 * Zestaw integracyjny ma teraz warunek wstępny na poziomie PROJEKTU vitest
 * (`globalSetup` projektu `integration` w `vitest.config.mts`). Warunek
 * sprawdza się RAZ, przed zebraniem plików, i przy braku bazy PRZERYWA
 * przebieg kodem różnym od zera. Nie ostrzeżenie, nie pominięcie — porażka.
 *
 * DLACZEGO WARUNEK JEST OSTRZEJSZY NIŻ BRAMKI W PLIKACH
 * -----------------------------------------------------
 * Bramka w pliku pytała tylko o host (localhost). Przepuszczała więc bazę
 * DEWELOPERSKĄ (host lokalny, nazwa bazy `skillbridge`) — a ten zestaw
 * kasuje i przepisuje wiersze. Tutaj wymagamy `isDedicatedTestDbUrl`: host
 * lokalny ORAZ nazwa bazy `test` albo z sufiksem `_test`.
 *
 * WŁASNOŚĆ PODZBIORU — TO ONA LIKWIDUJE CICHE POMIJANIE
 * -----------------------------------------------------
 * Strażnik przepuszcza WYŁĄCZNIE adresy, które przepuszczają też bramki
 * w plikach. Skutek: jeśli strażnik przepuścił, żadna bramka w pliku już nie
 * pominie testu — ciche pominięcie przestaje być osiągalne, mimo że stare
 * `describe.skip` zostają w plikach jako martwa druga warstwa.
 *
 * Sam `isDedicatedTestDbUrl` NIE wystarcza do tej własności i to nie jest
 * detal: bramka w plikach wymaga w adresie znaku `@` przed hostem (czyli
 * poświadczeń), a `isDedicatedTestDbUrl` — nie. Adres bez poświadczeń
 * (schemat, host, nazwa bazy) przeszedłby strażnika, a mimo to każdy plik
 * pominąłby się po cichu — i przebieg znów byłby zielony bez pokrycia,
 * czyli dokładnie ten błąd, który naprawiamy. Dlatego strażnik sprawdza
 * OBIE rzeczy naraz i odrzuca adres, którego bramki w plikach nie rozpoznają.
 *
 * Własność podzbioru jest zabezpieczona testem jednostkowym
 * (`__tests__/integration-db-guard.test.ts`), więc nie da się jej zepsuć
 * niezauważenie — także wtedy, gdy ktoś poluzuje `isDedicatedTestDbUrl`.
 *
 * BEZ FURTKI. `CONFIRM_PROD_DB=1` i `E2E_ALLOW_REMOTE=1` (furtki skryptów
 * migracyjnych z `tools/assert-test-db.ts`) świadomie NIE działają tutaj:
 * zestaw integracyjny nie ma powodu dotykać czegokolwiek zdalnego.
 *
 * ═══ PRÓG KONSOLIDACJI POWIELONYCH BRAMEK (wymóg CLAUDE.md §8 v1.17) ═══
 *
 * Ten strażnik świadomie ZOSTAWIA bramki powielone w plikach zamiast je usuwać:
 * mechaniczny diff przez pół repo, wykonany razem ze zmianą bramkującą cały
 * zestaw, dałby przegląd, w którym nikt nie odróżni naprawy od przenosin.
 * v1.17 dopuszcza taki drugi nośnik wyłącznie ze strażnikiem kopii I jawnym
 * progiem. Jedno i drugie stoi w `__tests__/bramki-powielone-spis.test.ts`:
 *
 *   PRÓG A — przy PIERWSZEJ ZMIANIE WZORCA bramki (kopia rozjeżdża się
 *            z kanonem → spis czerwieni się i nazywa plik oraz linię).
 *   PRÓG B — przy POJAWIENIU SIĘ TRZECIEGO NOŚNIKA poza projektem
 *            `integration` (tam ten warunek wstępny nie sięga, więc nowy
 *            nośnik to nowa dziura na ciche pominięcie, nie kolejna kopia).
 *
 * Właściciel: Quinn (QA). Dług i plan:
 * `docs/2026-08-10-dlug-bramki-powielone-i-syllabus.md`.
 *
 * PRÓG A JEST JUŻ CZĘŚCIOWO PRZEKROCZONY i to zmierzone, nie przewidywane:
 * `tools/__tests__/ingest-curriculum.integration.test.ts` zaostrzył swoją kopię
 * do `isDedicatedTestDbUrl` już 2026-07-26 (commit `d33ba28`). Kopie NIE są
 * więc „dosłownie identyczne" — jedna poszła własną drogą, w dodatku w dobrą
 * stronę: to prototyp semantyki, którą ten plik uogólnia na cały zestaw.
 * Wniosek dla konsolidacji: jedno źródło ma nieść `isDedicatedTestDbUrl`,
 * nie sam regexp na host.
 */

import { isDedicatedTestDbUrl, parseDbHost } from "../../tools/assert-test-db";

/** Nazwa zmiennej środowiskowej niosącej adres bazy. */
const ZMIENNA = "DATABASE_URL";

/** Hosty uznawane za lokalne — kopia allowlisty z tools/assert-test-db.ts. */
const HOSTY_LOKALNE = ["localhost", "127.0.0.1", "::1"];

/**
 * Bramka powielona w plikach `*.integration.test.ts` — kopiowana dosłownie,
 * z jednym uzgodnionym wariantem (patrz nagłówek: `ingest-curriculum`):
 *
 *     const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
 *
 * Trzymamy ją tu po to, żeby strażnik mógł sprawdzić własność podzbioru
 * (patrz nagłówek pliku). Zgodności kopii z tym zapisem pilnuje spis
 * `__tests__/bramki-powielone-spis.test.ts` (PRÓG A). Gdy bramki w plikach
 * zostaną kiedyś usunięte, ta stała i powód `niewidoczny-dla-bramek` znikają
 * razem z nimi.
 */
const BRAMKA_W_PLIKACH = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//;

/** Powód odmowy — do rozróżnienia w testach, nie do czytania przez operatora. */
export type PowodOdmowy =
	| "brak"
	| "nieparsowalny"
	| "zdalny"
	| "nie-testowa"
	| "niewidoczny-dla-bramek";

export type DiagnozaBazy =
	| { ok: true }
	| { ok: false; powod: PowodOdmowy; naglowek: string; komunikat: string };

const RAMKA = "═".repeat(74);

/**
 * Instrukcja naprawcza — identyczna dla każdego powodu odmowy.
 *
 * Świadomie NIE wpisujemy tu adresu bazy z poświadczeniami (nawet jawnymi
 * z kontenera testowego): jedynym źródłem tej wartości jest `.env.test.example`,
 * a operator wczytuje ją do powłoki, zamiast przepisywać ręcznie.
 */
const JAK_URUCHOMIC = [
	"Jak uruchomić zestaw integracyjny lokalnie (4 kroki):",
	"  1) docker compose -f docker-compose.test.yml up -d",
	"  2) cp .env.test.example .env.test        # wzorzec, zero realnych sekretów",
	"  3) set -a; source .env.test; set +a      # wczytuje DATABASE_URL do powłoki",
	"  4) pnpm db:migrate:test && pnpm test:integration",
	"",
	"Nie masz bazy i chcesz tylko testy jednostkowe (bazy nie wymagają):",
	"  pnpm test:run          — jednorazowy przebieg zestawu jednostkowego",
	"  pnpm test              — ten sam zestaw w trybie obserwowania zmian",
	"",
	`Wymagania wobec ${ZMIENNA}: host ${HOSTY_LOKALNE.join(" / ")} ORAZ nazwa bazy`,
	"`test` albo z sufiksem `_test`. Baza deweloperska i każda zdalna są odrzucane",
	"świadomie — ten zestaw kasuje i przepisuje wiersze.",
].join("\n");

/** Wyjaśnienie, dlaczego to porażka, a nie pominięcie. */
const DLACZEGO_PORAZKA = [
	"Testy integracyjne (**/*.integration.test.{ts,tsx}) sprawdzają realny kontrakt",
	"na realnej bazie. Bez bazy nie sprawdzają NICZEGO — dlatego przebieg pada,",
	'zamiast pokazać zielone "skipped". Ciche pomijanie było przyczyną, dla której',
	"trzy atrapy-strażniki przeżyły w kodzie do 2026-08-01.",
].join("\n");

function zbudujKomunikat(naglowek: string, powodSzczegolowy: string): string {
	return [
		"",
		RAMKA,
		" ZESTAW INTEGRACYJNY — PRZEBIEG PRZERWANY (nie pominięty).",
		RAMKA,
		naglowek,
		"",
		powodSzczegolowy,
		"",
		DLACZEGO_PORAZKA,
		"",
		JAK_URUCHOMIC,
		RAMKA,
		"",
	].join("\n");
}

/**
 * Ocenia, czy adres bazy nadaje się pod zestaw integracyjny.
 *
 * Funkcja czysta — nie czyta środowiska, nie łączy się z bazą, nic nie rzuca.
 * Dzięki temu da się ją przetestować bez Postgresa (i to jest testowane).
 */
export function zdiagnozujBazeIntegracyjna(dbUrl: string | undefined): DiagnozaBazy {
	if (!dbUrl || dbUrl.trim() === "") {
		const naglowek = `Powód: zmienna ${ZMIENNA} nie jest ustawiona.`;
		return {
			ok: false,
			powod: "brak",
			naglowek,
			komunikat: zbudujKomunikat(
				naglowek,
				"Proces nie dostał żadnego adresu bazy — zestaw integracyjny nie ma się\ndo czego podłączyć.",
			),
		};
	}

	const host = parseDbHost(dbUrl);

	if (host === null) {
		const naglowek = `Powód: nie udało się odczytać hosta z ${ZMIENNA}.`;
		return {
			ok: false,
			powod: "nieparsowalny",
			naglowek,
			komunikat: zbudujKomunikat(
				naglowek,
				"Oczekiwany kształt adresu: schemat postgresql, poświadczenia, host, port,\n" +
					"nazwa bazy. Samej wartości NIE wypisuję — może zawierać hasło.",
			),
		};
	}

	if (isDedicatedTestDbUrl(dbUrl)) {
		// Warunek podzbioru: adres musi trafić także w bramkę powieloną
		// w plikach testowych. Inaczej strażnik przepuści przebieg, a każdy
		// plik i tak pominie się po cichu — czyli wróci naprawiany błąd.
		if (!BRAMKA_W_PLIKACH.test(dbUrl)) {
			const naglowek = `Powód: ${ZMIENNA} wskazuje na bazę testową, ale bez poświadczeń w adresie.`;
			return {
				ok: false,
				powod: "niewidoczny-dla-bramek",
				naglowek,
				komunikat: zbudujKomunikat(
					naglowek,
					"Bramki w plikach testowych rozpoznają bazę po fragmencie\n" +
						"`uzytkownik@host` — adres bez poświadczeń ich nie uruchamia. Gdybym to\n" +
						"przepuścił, przebieg byłby ZIELONY i pominąłby wszystko po cichu.\n" +
						"Podaj adres z poświadczeniami (tak wygląda ten z `.env.test.example`\n" +
						"i ten z kontenera CI).",
				),
			};
		}
		return { ok: true };
	}

	if (!HOSTY_LOKALNE.includes(host)) {
		const naglowek = `Powód: ${ZMIENNA} wskazuje na zdalny host "${host}".`;
		return {
			ok: false,
			powod: "zdalny",
			naglowek,
			komunikat: zbudujKomunikat(
				naglowek,
				"Zestaw integracyjny kasuje i przepisuje wiersze. Na zdalnym hoście nie\n" +
					"uruchamiam go NIGDY — ani z CONFIRM_PROD_DB=1, ani z E2E_ALLOW_REMOTE=1\n" +
					"(te furtki działają wyłącznie w skryptach migracyjnych, nie tutaj).",
			),
		};
	}

	const naglowek = `Powód: ${ZMIENNA} wskazuje na lokalną bazę, która nie wygląda na testową.`;
	return {
		ok: false,
		powod: "nie-testowa",
		naglowek,
		komunikat: zbudujKomunikat(
			naglowek,
			"Host jest lokalny, ale nazwa bazy to nie `test` ani `*_test` — to wygląda\n" +
				"na bazę DEWELOPERSKĄ. Zestaw integracyjny kasuje i przepisuje wiersze,\n" +
				"więc odmawiam: nadpisanie własnej bazy dev to zbyt drogi wypadek.",
		),
	};
}

/**
 * Warunek wstępny zestawu integracyjnego. Rzuca, gdy baza nie nadaje się
 * pod testy — czyli przerywa przebieg kodem różnym od zera.
 *
 * @param env Środowisko procesu (wstrzykiwane w testach). Celowo szerszy typ
 *            niż `NodeJS.ProcessEnv` — ten wymaga tu `NODE_ENV`, a strażnik
 *            czyta jeden klucz i nie ma powodu żądać reszty.
 */
export function wymagajBazyIntegracyjnej(
	env: Readonly<Record<string, string | undefined>> = process.env,
): void {
	const diagnoza = zdiagnozujBazeIntegracyjna(env[ZMIENNA]);
	if (diagnoza.ok) return;

	// Pełna instrukcja na stderr — pojawia się PRZED podsumowaniem vitesta,
	// nie ginie w stosie wywołań, który vitest dokleja do wyjątku.
	console.error(diagnoza.komunikat);

	// Krótki wyjątek: to on ustawia kod wyjścia i nagłówek "Unhandled Error".
	throw new Error(
		`Zestaw integracyjny wymaga bazy testowej. ${diagnoza.naglowek} ` +
			"Instrukcja uruchomienia wypisana powyżej.",
	);
}

/** Punkt wejścia dla `globalSetup` projektu `integration` (vitest.config.mts). */
export default function setup(): void {
	wymagajBazyIntegracyjnej();
}
