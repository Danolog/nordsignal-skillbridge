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
 * Rozstrzyga, czy adres może wejść. JEDYNE miejsce, które o tym orzeka.
 *
 * Zwraca `false` dla listy pustej — patrz nagłówek. Zwraca `false` także dla
 * adresu pustego/niepodanego: brak adresu nie jest zgodą.
 */
export function czyAdresDozwolony(adres: string | null | undefined): boolean {
	if (!adres) return false;
	const dozwolone = adresyDozwolone();
	if (dozwolone.length === 0) return false;
	return dozwolone.includes(znormalizuj(adres));
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
