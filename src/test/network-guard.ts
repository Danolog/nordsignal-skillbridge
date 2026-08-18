/**
 * network-guard — strażnik żywej sieci w zestawie integracyjnym.
 *
 * PROBLEM, KTÓRY TO ZAMYKA
 * ------------------------
 * 2026-08-17, tor nocny: zadanie `integration` padło na jednym teście —
 * „tutor zablokowany w trakcie OTWARTEJ obrony (409); po zamknięciu wraca",
 * 5008 ms przy limicie 5000 ms. Pad na limicie czasu, zero asercji: komunikat
 * mówił „coś trwało za długo", nie mówił CO.
 *
 * Zmierzona przyczyna: trasa tutora (`src/app/api/projects/[id]/tutor/route.ts`)
 * woła `fetchContent` z modułu `@/lib/ai/pipeline/step1-fetch-content`, a test
 * podstawiał atrapę pod `@/lib/ai/pipeline` — czyli pod MODUŁ OBOK. Skutkiem
 * test wychodził NAPRAWDĘ do internetu:
 *
 *     [pomiar] https://api.github.com/repos/student/analiza -> 404 w 213 ms
 *
 * Ten sam commit (`72d27ea`) był zielony 08-16 i czerwony 08-17 — nic nie
 * weszło na `main` pomiędzy. Różnica siedziała wyłącznie w czasie odpowiedzi
 * GitHuba: ten sam plik trwał 1155 ms (zielony) i 6110 ms (czerwony), a delta
 * 4955 ms to dokładnie limit jednego testu. Odtworzone wstrzyknięciem
 * opóźnienia: 6000 ms → 3/3 czerwone z identyczną sygnaturą, 1000 ms → 2/2
 * zielone, bez opóźnienia → 5/5 zielone.
 *
 * Wada konstrukcyjna pod spodem: limit zależności (8000 ms w
 * `src/lib/ai/pipeline/github.ts`) jest WIĘKSZY niż budżet testu (5000 ms).
 * Łagodna degradacja trasy — nieudane pobranie repozytorium nie blokuje tury —
 * jest więc z poziomu testu nieosiągalna. Każde opóźnienie powyżej ~4,9 s
 * wywala test, zanim bezpiecznik trasy zdąży zadziałać.
 *
 * ROZWIĄZANIE
 * -----------
 * Zestaw integracyjny nie ma powodu ruszać sieci zewnętrznej: sprawdza realny
 * kontrakt na realnej BAZIE, a wszystko poza naszą kontrolą podstawia atrapą.
 * Ten strażnik zamienia „ciche wyjście do internetu" w natychmiastową porażkę,
 * która NAZYWA ADRES. Pad ma mówić „test wyszedł do api.github.com/repos/…",
 * a nie „coś padło po 5 s".
 *
 * DLACZEGO SAMO RZUCENIE WYJĄTKU NIE WYSTARCZA — I TO JEST SEDNO
 * --------------------------------------------------------------
 * Kod produkcyjny łyka błędy sieci ŚWIADOMIE, bo taka jest jego rola:
 * `githubGet` zwraca `null` przy dowolnym wyjątku, a trasa tutora dodatkowo
 * opakowuje pobranie w `try/catch` (łagodna degradacja, „awaria pobierania NIE
 * blokuje tury"). Gdyby strażnik tylko rzucał, produkcyjny `catch` zjadłby go
 * w locie i test byłby ZIELONY mimo naruszenia — czyli powstałby strażnik-atrapa,
 * dokładnie ta klasa, którą zamykała v1.17 konstytucji.
 *
 * Dlatego strażnik działa dwutorowo:
 *   1. RZUCA — żeby połączenie nie wyszło i test nie czekał na obcy serwer;
 *   2. ZAPISUJE naruszenie do rejestru, który sprawdza się PO teście
 *      (`network-guard.setup.ts`, hak `afterEach`). Tego rejestru żaden
 *      produkcyjny `catch` nie dosięga.
 *
 * GDZIE POSTAWIONA JEST GRANICA „SIEĆ ZEWNĘTRZNA KONTRA LOKALNA" I DLACZEGO TAM
 * -----------------------------------------------------------------------------
 * Blokujemy wszystko, czego host NIE jest pętlą zwrotną (`localhost`,
 * `127.0.0.1`, `::1`). Uzasadnienie granicy: pętla zwrotna to usługa, którą
 * postawiło samo CI (kontener Postgresa, lokalny Redis i most REST) — jest
 * deterministyczna i nasza. Wszystko poza nią to cudzy serwer: obce tempo,
 * obce limity zapytań, obca dostępność. Determinizm zestawu kończy się dokładnie
 * na tej granicy, więc tam stoi strażnik.
 *
 * BAZA DANYCH JEST POZA ZASIĘGIEM TEGO STRAŻNIKA — ZMIERZONE, NIE ZAŁOŻONE
 * ------------------------------------------------------------------------
 * Strażnik przechwytuje WYŁĄCZNIE `fetch`. Sterownik bazy to
 * `drizzle-orm/node-postgres` (`src/lib/db/index.ts`, linia 1) oparty na `pg`,
 * który rozmawia surowym gniazdem TCP i `fetch`-a nie dotyka. Połączenia z bazą
 * nie mogą więc trafić w tę bramkę nawet przypadkiem — a gdyby sterownik
 * kiedyś zmienił się na wariant po HTTP, host i tak byłby pętlą zwrotną, czyli
 * dozwolony. To jest powód, dla którego strażnik o tak szerokim zasięgu nie
 * wywraca zestawu i nie zostanie wyciszony w tydzień.
 *
 * CZEGO STRAŻNIK NIE ŁAPIE (świadome granice)
 * -------------------------------------------
 * Adresy bez sieci (`data:`, `blob:`, `file:`) przepuszczamy — nie ma tam
 * cudzego serwera. Adres nieparsowalny też przepuszczamy: `fetch` w Node i tak
 * odrzuci go własnym błędem, zanim cokolwiek wyjdzie na zewnątrz, a blokowanie
 * go tutaj dawałoby mylący komunikat o sieci tam, gdzie sieci nie ma.
 * Gniazda inne niż `fetch` (surowy TCP, WebSocket) są poza zasięgiem — to
 * świadome ograniczenie, nie przeoczenie: dziś w zestawie nie ma takiego ruchu
 * poza bazą, a rozszerzanie strażnika na warstwę gniazd kosztuje więcej, niż
 * jest dziś warte.
 *
 * PUŁAPKA PRZY DIAGNOZIE — CZYTAJ, ZANIM STRACISZ PÓŁ GODZINY
 * -----------------------------------------------------------
 * Domyślny reporter vitesta UKRYWA wyjście z `console.log` dla testów, które
 * PRZECHODZĄ. Żywe wyjście sieciowe siedziało w tym zestawie niewidoczne
 * właśnie dlatego: test był zielony przez wiele tygodni, a jego wywołanie do
 * `api.github.com` nie pojawiało się w dzienniku ani razu. Zobaczysz je dopiero
 * przez:
 *
 *     pnpm vitest run --project integration --reporter=verbose <plik>
 *
 * Wniosek ogólniejszy: „w dzienniku nic nie ma" NIE jest dowodem, że nic się
 * nie dzieje. To ta sama rodzina błędu co „zielona suita nie jest dowodem, że
 * strażnik strzeże" (CLAUDE.md §8, v1.17).
 *
 * KONTROLA LICZNOŚCI — ŻEBY STRAŻNIK NIE BYŁ PUSTYM ZBIOREM
 * ----------------------------------------------------------
 * W zdrowym zestawie rejestr naruszeń jest z definicji PUSTY, więc sam jego
 * widok niczego nie dowodzi (to ta sama pułapka co asercja na pustej tabeli:
 * „0 wierszy — asercja nic nie zmierzyła"). Dlatego uzbrojenia strażnika pilnuje
 * osobny test, który w KAŻDYM przebiegu integracyjnym celowo próbuje wyjść na
 * zewnątrz i sprawdza, że dostał po łapach:
 * `src/test/__tests__/network-guard.integration.test.ts`.
 * Zbiór wywołań strażnika nigdy nie jest więc pusty.
 *
 * Właściciel: Quinn (QA).
 */

/** Hosty uznawane za lokalne — pętla zwrotna postawiona przez samo CI. */
export const HOSTY_LOKALNE = ["localhost", "127.0.0.1", "::1"];

/** Schematy, które w ogóle nie wychodzą do sieci. */
const SCHEMATY_BEZ_SIECI = ["data:", "blob:", "file:"];

export type DiagnozaWyjscia =
	| { blokowane: false; powod: "lokalny" | "bez-sieci" | "nieparsowalny" }
	| { blokowane: true; host: string };

/**
 * Ocenia, czy dane wyjście sieciowe jest zewnętrzne.
 *
 * Funkcja czysta — nie rusza sieci, nie czyta środowiska, nic nie rzuca.
 * Dzięki temu da się ją przetestować bez Postgresa i bez internetu (i to jest
 * testowane w `__tests__/network-guard.test.ts`).
 */
export function zdiagnozujWyjscieSieciowe(adres: string): DiagnozaWyjscia {
	let url: URL;
	try {
		url = new URL(adres);
	} catch {
		return { blokowane: false, powod: "nieparsowalny" };
	}

	if (SCHEMATY_BEZ_SIECI.includes(url.protocol)) {
		return { blokowane: false, powod: "bez-sieci" };
	}

	// URL normalizuje `::1` do postaci w nawiasach kwadratowych — zdejmujemy je,
	// żeby porównanie z allowlistą było jednym kształtem, nie dwoma.
	const host = url.hostname.replace(/^\[(.+)\]$/, "$1");
	if (HOSTY_LOKALNE.includes(host)) {
		return { blokowane: false, powod: "lokalny" };
	}

	return { blokowane: true, host };
}

/** Rejestr naruszeń — czytany po teście, poza zasięgiem produkcyjnych `catch`. */
const naruszenia: string[] = [];

/** Znacznik uzbrojenia — pozwala sprawdzić, że podmiana `fetch` faktycznie stoi. */
const ZNACZNIK = Symbol.for("nordsignal.straznik-sieci");

export function pobierzNaruszenia(): readonly string[] {
	return [...naruszenia];
}

export function wyczyscNaruszenia(): void {
	naruszenia.length = 0;
}

export function czyStraznikUzbrojony(): boolean {
	return Boolean((globalThis.fetch as { [ZNACZNIK]?: true })[ZNACZNIK]);
}

/** Buduje komunikat porażki — jednym miejscem, żeby rzut i hak mówiły tak samo. */
export function zbudujKomunikat(adresy: readonly string[]): string {
	const lista = adresy.map((a) => `  → ${a}`).join("\n");
	return [
		"Test integracyjny wyszedł do SIECI ZEWNĘTRZNEJ:",
		lista,
		"",
		"Zestaw integracyjny sprawdza realny kontrakt na realnej BAZIE — wszystko",
		"poza naszą kontrolą ma być podstawione atrapą. Żywe wyjście do cudzego",
		"serwera wprowadza obce tempo i obce limity zapytań, więc test przestaje",
		"mierzyć kod, a zaczyna mierzyć czyjąś dostępność.",
		"",
		"Najczęstsza przyczyna: atrapa podstawiona pod MODUŁ OBOK. Podstaw ją pod",
		"ten moduł, z którego kod produkcyjny NAPRAWDĘ importuje funkcję — wzorzec",
		"w `src/app/api/projects/[id]/tutor/__tests__/tutor.integration.test.ts`.",
		"",
		'Pełne uzasadnienie i granica „sieć zewnętrzna kontra lokalna": src/test/network-guard.ts',
	].join("\n");
}

/**
 * Uzbraja strażnika: podmienia `fetch` na wariant, który zewnętrzne wyjście
 * ZAPISUJE do rejestru i RZUCA. Wywołanie jest idempotentne — druga próba nie
 * owija strażnika w strażnika.
 */
export function zainstalujStraznikaSieci(): void {
	if (czyStraznikUzbrojony()) return;

	const oryginalny = globalThis.fetch;
	const straznik = (async (wejscie: unknown, opcje?: unknown) => {
		const adres =
			typeof wejscie === "string"
				? wejscie
				: wejscie instanceof URL
					? wejscie.href
					: ((wejscie as { url?: string })?.url ?? String(wejscie));

		const diagnoza = zdiagnozujWyjscieSieciowe(adres);
		if (diagnoza.blokowane) {
			naruszenia.push(adres);
			throw new Error(zbudujKomunikat([adres]));
		}
		return (oryginalny as (a: unknown, b?: unknown) => Promise<Response>)(wejscie, opcje);
	}) as typeof globalThis.fetch;

	Object.defineProperty(straznik, ZNACZNIK, { value: true });
	globalThis.fetch = straznik;
}
