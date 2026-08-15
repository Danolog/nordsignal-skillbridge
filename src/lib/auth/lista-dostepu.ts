/**
 * LISTA DOZWOLONYCH ADRESÓW — jedyny nośnik reguły „kto może wejść do aplikacji".
 *
 * PO CO
 * -----
 * Decyzja Darka 2026-08-15: aplikacja przestaje być publicznie dostępna. To
 * warstwa ochronna, NIE zamiast pilotażu — 3–5 zaproszonych uczestników nadal
 * wchodzi. Powód pilności: dane uczestników dojdą za ~2 miesiące, więc bez tego
 * aplikacja stałaby otwarta dwa miesiące bez nadzoru i bez powodu.
 *
 * ZAKRES ZAMKNIĘCIA — wyłącznie aplikacja. Publiczny paszport kompetencji
 * (`/passport/[id]`, `/passport/demo`, `/api/passport/[id]`) zostaje otwarty
 * ŚWIADOMIE: na nim stoi zasada odpowiedzi dla pracodawcy. Te trasy nie są
 * w matcherze pośrednika (`src/middleware.ts`) i ten plik ich nie dotyka —
 * pilnuje tego osobny strażnik.
 *
 * PUSTA LISTA ZNACZY ODMOWA WSZYSTKIM, NIGDY „WPUSZCZAMY WSZYSTKICH"
 * -----------------------------------------------------------------
 * To jest cała istota tego pliku i jedyny powód, dla którego nie jest to
 * jednolinijkowiec. Reguła bezpieczeństwa, której brak konfiguracji zamienia
 * w przepustkę, jest gorsza niż jej brak: wygląda na włączoną. Dlatego brak
 * zmiennej, pusta zmienna i zmienna z samych przecinków dają ten sam wynik —
 * NIKT nie wchodzi. Awaria w stronę zamkniętą, spójnie z reszta bramek.
 *
 * DLACZEGO ZMIENNA ŚRODOWISKOWA, A NIE TABELA — i próg, po którym to się zmienia
 * -----------------------------------------------------------------------------
 * Dziś zaproszenie jest CZYNNOŚCIĄ TECHNICZNĄ: ktoś dopisuje adres do zmiennej.
 * Przy 3–5 osobach ekran zaproszeń byłby kosztem bez odbiorcy.
 *
 * PRÓG: gdy dojdą dane uczestników (~2026-10, zadanie „dane uczestników"),
 * zaproszenie staje się CZYNNOŚCIĄ PRODUKTOWĄ — tabela, znacznik `invited_at`,
 * ekran. Próg jest tutaj, a nie w czyjejś pamięci, bo dziś ta lista NIE MA
 * śladu: nie wiadomo kto, kiedy i na jakiej podstawie kogo zaprosił.
 *
 * DANE OSOBOWE — warunek zapłonu
 * ------------------------------
 * Adresy e-mail w zmiennej środowiskowej to przetwarzanie danych osobowych,
 * nawet jeśli same adresy nie są sekretem. Przed zapłonem wymagany jest przegląd
 * Ryana (CRCO): podstawa przetwarzania, wpis do rejestru czynności oraz —
 * najważniejsze — co dzieje się z listą, gdy uczestnik zażąda usunięcia konta.
 * LISTA PRZEŻYJE USUNIĘCIE Z BAZY, bo leży poza nią. To ta sama klasa wady, którą
 * Ryan opisał przy Pakiecie B, i nie domyka jej żaden kod w tym pliku.
 *
 * ZAKRES OCHRONY — CZEGO TA LISTA NIE WIDZI
 * -----------------------------------------
 * Zielony strażnik tego modułu NIE dowodzi, że lista widzi cały ruch. Zna trzy
 * nazwane dziury i żadna nie jest domykana tutaj:
 *
 *  1. ISTNIEJĄCE KONTO SPOZA LISTY, logujące się dostawcą (Google).
 *     `databaseHooks.user.create.before` rusza WYŁĄCZNIE przy tworzeniu konta,
 *     więc kto ma konto od wczoraj, wchodzi dalej. Na produkcji takich kont
 *     jest 33. To warunek zapłonu, nie dług — rozstrzygnięcie: Sophia
 *     z sign-offem Ryana (rekomendacja Leo: wyłączyć logowanie dostawcą na czas
 *     pilotażu, zamiast domykać dwie bramki po kolei).
 *
 *  2. ŻĄDANIE, KTÓRE W OGÓLE NIE WYCHODZI. Przy zapalonej fladze regulaminu pole
 *     zgody ma `required`, a formularz nie ma `noValidate` — przeglądarka blokuje
 *     wysłanie PRZED zdarzeniem `submit`. Bramka serwera nie dochodzi wtedy do
 *     głosu. To nie jest wada tej listy, ale zawęża jej zasięg.
 *
 *  3. WSZYSTKO POZA WARSTWĄ LOGOWANIA. Ta lista bramkuje wejście, nie żądania.
 *     Sesja wydana wcześniej działa do wygaśnięcia albo do rotacji klucza
 *     podpisu — cięcie sesji jest osobną czynnością przy zapłonie.
 *
 * Ten akapit stoi w pliku, a nie w raporcie, świadomie: raport przeczyta się raz,
 * a plik czyta każdy, kto kiedyś uzna „przecież mamy listę dostępu" za dowód.
 */

/** Nazwa zmiennej niosącej listę. Jedno miejsce, żeby strażnik i kod nie rozjechały się co do napisu. */
export const ZMIENNA_LISTY_DOSTEPU = "PILOT_ALLOWLIST";

/**
 * Normalizacja adresu: przycięcie i małe litery.
 *
 * Adresy e-mail są w części lokalnej teoretycznie wrażliwe na wielkość liter,
 * ale żaden używany dostawca tego nie egzekwuje, a Google zwraca adres tak, jak
 * ma go w profilu. Porównywanie bez normalizacji dałoby odmowę osobie, która
 * wpisała `Jan@…` zamiast `jan@…` — czyli fałszywy negatyw na bramce, która ma
 * wpuszczać zaproszonych.
 */
function znormalizuj(adres: string): string {
	return adres.trim().toLowerCase();
}

/**
 * Odczyt listy ZE ŚRODOWISKA, przy każdym wywołaniu.
 *
 * Świadomie nie zapamiętujemy wyniku: zmienna środowiskowa przestawia się bez
 * wdrożenia, a odczyt przy starcie oznaczałby, że dopisanie uczestnika wymaga
 * ponownego wdrożenia. Ten sam wzór, co przy odczycie flag per żądanie.
 */
export function adresyDozwolone(): readonly string[] {
	const surowa = process.env[ZMIENNA_LISTY_DOSTEPU] ?? "";
	return surowa
		.split(",")
		.map(znormalizuj)
		.filter((a) => a.length > 0);
}

/**
 * Czy wpis jest DOMENOWY (`@example.com`), czy dosłownym adresem.
 *
 * Wpis domenowy istnieje dla jednego powodu: przejazd rejestracji w CI generuje
 * adresy LOSOWE, więc lista dosłownych adresów nigdy by go nie przepuściła.
 */
export function czyWpisDomenowy(wpis: string): boolean {
	return wpis.startsWith("@");
}

/** Wpisy domenowe z bieżącej listy — do wglądu strażnika i diagnostyki. */
export function wpisyDomenowe(): readonly string[] {
	return adresyDozwolone().filter(czyWpisDomenowy);
}

/**
 * Czy działamy na WDROŻENIU OSIĄGALNYM Z INTERNETU. Jeden nośnik tego pytania.
 *
 * `VERCEL_ENV` ustawia sama platforma: `production` na wdrożeniu produkcyjnym,
 * `preview` na każdym podglądzie. Lokalnie i w CI zmiennej NIE MA WCALE.
 * Pytamy więc o jej OBECNOŚĆ, nie o wartość.
 *
 * DLACZEGO NIE SAMA PRODUKCJA (sprostowanie po pomiarze Leo, 2026-08-15):
 * pierwsza wersja blokowała wpisy domenowe wyłącznie przy `production`, więc
 * na PODGLĄDZIE wpis domenowy działał — a podgląd jest wdrożeniem osiągalnym
 * z internetu. Broniło go wyłącznie `ssoProtection`, czyli USTAWIENIE W KONSOLI:
 * poza kontrolą wersji, bez strażnika, zmienialne jednym kliknięciem przez
 * kogoś, kto nie wie, że opiera się na nim bramka dostępu. To ten sam argument,
 * który postawiłem przeciw wyjątkom per trasa w ochronie wdrożenia — i który
 * obrócił się przeciw mojej własnej bramce.
 *
 * Świadomie NIE pytamy o `NODE_ENV`: ten jest `production` także w każdym
 * zbudowanym podglądzie i w torze nocnym, więc odpowiadałby „tak" tam, gdzie
 * odpowiedź brzmi „nie".
 */
function czyWdrozenieSieciowe(): boolean {
	const env = process.env.VERCEL_ENV;
	return typeof env === "string" && env.length > 0;
}

/**
 * Rozstrzyga, czy adres może wejść. JEDYNE miejsce, które o tym orzeka.
 *
 * Zwraca `false` dla listy pustej — patrz nagłówek. Zwraca `false` także dla
 * adresu pustego/niepodanego: brak adresu nie jest zgodą.
 *
 * WPIS DOMENOWY NIE DZIAŁA NA ŻADNYM WDROŻENIU — ani na produkcji, ani na
 * podglądzie. To jest cała jego bramka. Wpuszczamy tam wyłącznie adresy wskazane
 * z nazwiska, bo `@uczelnia.pl` na liście pilotażu wpuściłby każdego studenta tej
 * uczelni, a nie pięcioro zaproszonych. Poza wdrożeniami (lokalnie i w CI) wpis
 * domenowy jest niezbędny, bo przejazd rejestracji generuje adresy losowe.
 *
 * To jest ŚWIADOMA różnica zachowania per środowisko — jedyna w tym pliku.
 * Zwykle jej unikam, bo rozdwaja regułę; tutaj różnica JEST regułą
 * bezpieczeństwa, nie skutkiem ubocznym, i pilnują jej mutacje w obie strony.
 */
export function czyAdresDozwolony(adres: string | null | undefined): boolean {
	if (!adres) return false;
	const dozwolone = adresyDozwolone();
	if (dozwolone.length === 0) return false;

	const znormalizowany = znormalizuj(adres);
	if (dozwolone.includes(znormalizowany)) return true;

	// Dopasowanie domenowe — nigdy na wdrożeniu (produkcja ani podgląd).
	if (czyWdrozenieSieciowe()) return false;
	const malpa = znormalizowany.lastIndexOf("@");
	if (malpa < 0) return false;
	const domena = znormalizowany.slice(malpa); // razem z „@"
	return dozwolone.some((wpis) => czyWpisDomenowy(wpis) && wpis === domena);
}

/**
 * Komunikat odmowy — GŁOŚNY, nie pusta strona.
 *
 * Mówi wprost, że dostęp jest ograniczony do zaproszonych, i nie sugeruje awarii
 * ani nie zachęca do ponawiania. Nie zdradza, kto jest na liście.
 */
export const KOMUNIKAT_ODMOWY =
	"Dostęp do SkillBridge jest w tej chwili ograniczony do zaproszonych uczestników pilotażu. " +
	"Jeśli masz zaproszenie, użyj adresu, na który je otrzymałeś.";
