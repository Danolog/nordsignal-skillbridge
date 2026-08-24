/**
 * DOSTARCZANIE ODMOWY SERWERA — jedyny nośnik reguły „co z odmowy serwera
 * trafia na ekran".
 *
 * PO CO TEN PLIK ISTNIEJE
 * -----------------------
 * Incydent 2026-08-18…24. Serwer odmawiał wejścia GŁOŚNO — `hooks.before`
 * w `server.ts` rzucał `APIError("FORBIDDEN")` z `KOMUNIKAT_ODMOWY`, czyli
 * zdaniem napisanym po to, żeby człowiek je przeczytał. Formularz logowania
 * wyrzucał tę treść do kosza i podstawiał własny napis „Nieprawidłowy email
 * lub hasło".
 *
 * Skutek nie był kosmetyczny. Przez sześć dni KAŻDE konto (33 na produkcji,
 * łącznie z założycielem) dostawało wiarygodne, samoobwiniające wyjaśnienie.
 * Człowiek, który „pomylił hasło", nie zgłasza incydentu — i nikt go nie
 * zgłosił. CISZĘ WYPRODUKOWAŁ KOMUNIKAT, NIE BRAK TESTU: bramka działała
 * dokładnie tak, jak zaprojektowano, a mimo to nikt nie dowiedział się,
 * dlaczego nie wchodzi.
 *
 * Reguła miała wtedy DWA nośniki, niezgodne ze sobą: `login-form.tsx` połykał
 * komunikat serwera, a `signup-form.tsx` (linia 53) przepuszczał go wprost.
 * Rozjazd wypadł na ścieżce, na której żyją wszystkie konta. Ten plik jest
 * odpowiedzią: reguła mieszka tutaj, formularze ją WOŁAJĄ, żaden jej nie
 * POWTARZA.
 *
 * DLACZEGO PRZEPUST JEST SELEKTYWNY, A NIE HURTOWY
 * ------------------------------------------------
 * Bo hurtowy przepust wypuściłby na ekran słownik biblioteki uwierzytelniającej,
 * a w nim siedzi WYLICZANIE KONT (ang. user enumeration — możliwość sprawdzenia,
 * które adresy są zarejestrowane). Rozstrzyga o tym pomiar, nie przypuszczenie
 * — szczegóły przy `KODY_ZASTEPOWANE` niżej.
 *
 * CZYM ODRÓŻNIAMY „NASZĄ" ODMOWĘ OD KOMUNIKATU BIBLIOTEKI — POMIAR, NIE DOMYSŁ
 * ---------------------------------------------------------------------------
 * Zmierzone 2026-08-24, przez wywołanie NASZEGO prawdziwego `auth.handler`
 * (better-auth 1.6.26 z blokady zależności) i prawdziwego klienta:
 *
 *   nasza odmowa z listy dostępu → {"message":"Dostęp do SkillBridge…",
 *                                   "status":403,"statusText":"FORBIDDEN"}
 *                                   klucze: message, status, statusText
 *   błąd własny biblioteki       → {"message":"Email and password is not
 *                                   enabled","code":"EMAIL_PASSWORD_DISABLED",
 *                                   "status":400,"statusText":"BAD_REQUEST"}
 *                                   klucze: message, code, status, statusText
 *
 * Różnica jest STRUKTURALNA, nie tekstowa: biblioteka tworzy swoje błędy przez
 * `APIError.from(status, KOD)`, co ustawia pole `code`; my rzucamy
 * `new APIError("FORBIDDEN", { message })` — BEZ pola `code`. Dlatego pytamy
 * o obecność `code`, a nie o treść napisu. Napis potrafi się zmienić przy
 * każdej aktualizacji biblioteki; kształt błędu nie.
 *
 * GRANICA TEGO NIEZMIENNIKA — obowiązuje NA NASZYCH TRASACH, nie w całej
 * bibliotece (sprostowanie po przeglądzie Leo, warunek W10, #344). Zmierzone:
 * `sign-in.mjs` i `sign-up.mjs` nie zawierają ANI JEDNEGO `new APIError(` —
 * każdy ich błąd leci przez `APIError.from(...)`, czyli zawsze z `code`.
 *
 * POZA TYMI TRASAMI JEST DZIEWIĘĆ MIEJSC BEZ KODU, NIE TRZY
 * ---------------------------------------------------------
 * Drugie sprostowanie tego samego akapitu (warunek W18, przegląd krytyczny
 * Ethana). Poprzednia wersja mówiła „zostają trzy … wszystkie trzy mają status
 * 500 — i dlatego domyka je warunek niżej". To było zdanie MOCNIEJSZE NIŻ
 * POMIAR: policzone zostały wyłącznie miejsca 5xx, a wniosek postawiony o całym
 * zbiorze. Dokładnie ta klasa błędu, którą ten plik naprawia — i popełniona
 * dwie linie po ostrzeżeniu przed nią.
 *
 * Zmierzone ponownie 2026-08-24 (`grep -rn "new APIError(" … | grep -v /plugins/`
 * → 13 trafień, z czego 4 bez ciała, więc bez treści do przepuszczenia:
 * `authorization.mjs:21,33,37,56`). Z ciałem `{ message }` i BEZ pola `code`
 * zostaje DZIEWIĘĆ, w dwóch grupach o RÓŻNYM mechanizmie ochrony:
 *
 * (A) CZTERY o statusie 5xx — domyka je warunek `status >= 500` niżej:
 *   api/to-auth-endpoints.mjs:20  „Dynamic baseURL could not be resolved…"
 *   api/to-auth-endpoints.mjs:24  treść z BetterAuthError
 *   api/dispatch.mjs:73           „…hook matcher execution. Check the logs…"
 *   oauth2/state.mjs:26           „Unable to create verification"
 * Ostatniego z nich nie wymienił ani przegląd, ani poprzednia wersja tego
 * akapitu — a leży na ścieżce logowania Google, którego UŻYWAMY
 * (`server.ts:59`). Osiągalności nie weryfikowałem wykonaniem, ale to jedyne
 * z tych miejsc, przy którym warunek 5xx nie jest czysto teoretyczny.
 *
 * (B) PIĘĆ o statusie 4xx — tych warunek 5xx NIE DOTYKA:
 *   api/middlewares/authorization.mjs:23  BAD_REQUEST „Missing required parameter: …"
 *   api/middlewares/authorization.mjs:57  BAD_REQUEST „Organization plugin is required…"
 *   api/middlewares/authorization.mjs:59  BAD_REQUEST „Missing required parameter: …"
 *   api/middlewares/authorization.mjs:70  FORBIDDEN   „Not a member of this organization"
 *   api/middlewares/authorization.mjs:73  FORBIDDEN   „Insufficient role for this operation"
 *
 * TE PIĘĆ DOMYKA DZIŚ NIEOSIĄGALNOŚĆ, NIE ŻADEN WARUNEK W TYM PLIKU.
 * Leżą w pośredniku autoryzacji zasobu/organizacji, którego nie wywołujemy:
 * `plugins: [nextCookies()]` to jedyna wtyczka, a w `src/lib/auth` nie ma ani
 * jednego odwołania do `authorization`/`organization`. Gdyby któreś zostało
 * wywołane, jego angielska treść przeszłaby przepustem NA EKRAN — bo jest bez
 * `code` i poniżej 500. Zieleń tego pliku o tym NIE POWIE.
 *
 * PRÓG POWROTU: pierwsze użycie pośrednika autoryzacji albo wtyczki organizacji.
 * Wtedy albo dopisujemy te kody do reguły, albo świadomie przyjmujemy przeciek —
 * ale jako decyzję, nie jako skutek uboczny. Właściciel progu: Ethan.
 *
 * Nie pisz tu „biblioteka zawsze ustawia code" ani „domyka je warunek 5xx":
 * oba zdania są mocniejsze niż pomiar.
 *
 * AWARIA PO STRONIE SERWERA (5xx) NIE IDZIE NA EKRAN
 * --------------------------------------------------
 * Zmierzone 2026-08-24, przez zaczep rzucający dokładnie ten kształt, co
 * `dispatch.mjs:73`:
 *   {"message":"An error occurred during hook matcher execution. Check the
 *    logs for more details.","status":500,"statusText":"INTERNAL_SERVER_ERROR"}
 *   klucze: message, status, statusText   ← BEZ `code`
 * Bez warunku `status >= 500` ta treść przechodziła przepustem DOSŁOWNIE i
 * lądowała na ekranie studenta po angielsku, z odesłaniem do logów.
 *
 * Rozróżnienie warte zapamiętania: ZWYKŁY wyjątek rzucony z zaczepu (nie
 * `APIError`) daje klientowi `{"status":500,"statusText":"Internal Server
 * Error"}` — BEZ pola `message`, więc przepust i tak oddawał tekst zapasowy.
 * Przeciekał wyłącznie `APIError` 5xx Z TREŚCIĄ. To jest dokładnie kształt
 * wszystkich trzech miejsc wyżej.
 *
 * DLACZEGO NIE WYBIERAMY PO STATUSIE — to była pierwsza, kusząca wersja
 * --------------------------------------------------------------------
 * „Status 403 znaczy nasza odmowa" byłoby wadą bezpieczeństwa: `EMAIL_NOT_VERIFIED`
 * to RÓWNIEŻ 403, a jego treść zdradza, że konto o tym adresie ISTNIEJE.
 * Potwierdzone mutacją Leo (niezależną od naszej): po zamianie na wybór po
 * statusie pada asercja `expected 'Email not verified' to be 'Nieprawidłowy
 * email lub hasło'`, czyli wyliczanie kont faktycznie trafia na ekran.
 * Skutek uboczny tej samej mutacji, którego nikt nie zapowiadał: zniknąłby też
 * komunikat o zbyt wielu próbach logowania.
 *
 * KTÓRE KODY ZDRADZAJĄ ISTNIENIE KONTA — to jest własność nośna, nie status
 * ------------------------------------------------------------------------
 * Statusów 403 biblioteka ma dwa: `EMAIL_NOT_VERIFIED` (`sign-in.mjs:313,324`)
 * oraz `SESSION_NOT_FRESH` (`session.mjs:368`). Ten drugi NIE wylicza kont —
 * mówi o wieku sesji — i nie pada na ścieżkach obu formularzy (leży na ścieżce
 * świeżej sesji, m.in. przy usuwaniu konta).
 * Osobno, poza statusem 403, kształt wyliczający konta ma `USER_EMAIL_NOT_FOUND`
 * (`sign-in.mjs:166`, status 401, `code` OBECNY). Leży w uchwycie logowania
 * społecznościowego (`signInSocial` zaczyna się w 107, `signInEmail` w 211),
 * a znaczy „dostawca nie oddał adresu", nie „tego adresu u nas nie ma" —
 * nasze formularze tej gałęzi nie wołają, więc nie ma go na liście niżej.
 * Gdyby kiedyś zaczęły ją wołać, to jest pierwszy kod do dopisania.
 */

/**
 * Kody, przy których NIE pokazujemy komunikatu serwera, tylko tekst zapasowy.
 * Każda pozycja ma powód; lista jest krótka celowo — patrz akapit pod nią.
 */
export const KODY_ZASTEPOWANE: ReadonlySet<string> = new Set([
	// Zmierzone w źródle biblioteki (`dist/api/routes/sign-in.mjs`, wiersze
	// 291/297/303/310, better-auth 1.6.26): CZTERY różne przyczyny odmowy —
	// konto nie istnieje / brak konta hasłowego / brak hasła / złe hasło —
	// zwracają TEN SAM kod i ten sam napis „Invalid email or password".
	// Biblioteka dodatkowo liczy skrót hasła przy nieistniejącym koncie, żeby
	// wyrównać czas odpowiedzi. Czyli sama treść NIE wylicza kont.
	// Zastępujemy ją mimo to z dwóch powodów: jest po angielsku na polskim
	// ekranie, a tekst zapasowy niesie DOKŁADNIE to samo znaczenie.
	"INVALID_EMAIL_OR_PASSWORD",

	// TO JEST POWÓD, DLA KTÓREGO PRZEPUST MUSI BYĆ SELEKTYWNY.
	// „Email not verified" pada WYŁĄCZNIE dla adresu, który ma konto — czyli
	// odróżnia „konto nie istnieje" od „konto istnieje". To jest wyliczanie
	// kont i na ekran nie trafia.
	// Dziś nieosiągalne (w `server.ts` nie ustawiamy `requireEmailVerification`),
	// ale wpisane świadomie: zapalenie tamtej opcji jest jedną linijką, a wtedy
	// bez tego wpisu przeciek pojawiłby się sam, po cichu.
	"EMAIL_NOT_VERIFIED",
]);

/**
 * ŚWIADOMIE NIE MA TU `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`.
 *
 * NAZWA KODU JEST TU ISTOTNA, NIE OZDOBNA (sprostowanie po przeglądzie Leo,
 * warunek W9, #344). Biblioteka ma DWA różne kody o tym znaczeniu:
 *   BASE_ERROR_CODES.USER_ALREADY_EXISTS                  („User already exists.")
 *   BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL
 * Nasza trasa rejestracji rzuca WYŁĄCZNIE ten drugi:
 *   sign-up.mjs:208  APIError.from("UNPROCESSABLE_ENTITY",
 *                    BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL)
 * Pierwotnie stała tu nazwa `USER_ALREADY_EXISTS` — zapis bez skutku dzisiaj
 * (oba kody i tak przechodzą), ale w dniu decyzji o zamknięciu tej ścieżki wpis
 * na liście PO PROSTU BY NIE TRAFIŁ. To nie była literówka do poprawienia
 * z pamięci: to dwa różne napisy w tym samym słowniku.
 *
 * Ten kod odróżnia „adres wolny" od „adres zajęty" — czyli TEŻ wylicza konta.
 * Zostawiam go widocznym, bo:
 *  (a) `signup-form.tsx` pokazuje go dzisiaj i zawsze pokazywał — usunięcie
 *      byłoby zmianą zachowania produktu, nie naprawą incydentu;
 *  (b) bez tej informacji człowiek nie wie, że ma już konto, i nie umie się
 *      dostać do aplikacji;
 *  (c) to rozstrzygnięcie należy do Ryana (bezpieczeństwo) i Sophii (produkt),
 *      nie do warstwy widoku.
 * PRÓG: przy pierwszym otwarciu rejestracji poza pilotaż — wtedy adresy
 * przestają być listą pięciu zaproszonych i cena wyliczania kont rośnie.
 */

/** Kształt błędu, jaki klient biblioteki oddaje formularzowi. */
interface OdmowaSerwera {
	status?: unknown;
	code?: unknown;
	message?: unknown;
}

/**
 * Co pokazać człowiekowi po odmowie z warstwy uwierzytelniania.
 *
 * WYMÓG `status` TO NIE OZDOBNIK. Ta sama funkcja obsługuje odgałęzienie
 * `catch`, do którego trafiają też zwykłe wyjątki (zerwana sieć → `TypeError`
 * z treścią „fetch failed"). Wyjątek nie ma pola `status`; odpowiedź serwera
 * ma je zawsze (zmierzone wyżej: 403 i 400). Bez tego warunku na ekranie
 * studenta wylądowałby wewnętrzny angielski komunikat środowiska uruchomieniowego.
 *
 * @param blad     obiekt błędu z klienta albo cokolwiek złapane w `catch`
 * @param zapasowy tekst pokazywany, gdy serwer nic sensownego nie powiedział
 */
export function komunikatOdmowy(blad: unknown, zapasowy: string): string {
	if (!blad || typeof blad !== "object") return zapasowy;

	const odmowa = blad as OdmowaSerwera;

	// Nie odpowiedź serwera (np. zerwane połączenie) — nie ma czego przepuszczać.
	if (typeof odmowa.status !== "number") return zapasowy;

	// AWARIA SERWERA NIGDY NIE IDZIE NA EKRAN (warunek W8 przeglądu Leo, #344).
	// Powód i pomiar w nagłówku, sekcja „Awaria po stronie serwera". Krótko:
	// treść błędu 500 to opis wnętrza systemu, z którym człowiek nie może zrobić
	// nic — a druga polityka w tym samym pliku już dziś odmawia pokazywania
	// takich napisów. Bez tego warunku w jednym pliku stałyby dwie polityki
	// o przeciwnym znaku.
	if (odmowa.status >= 500) return zapasowy;

	// Słownik biblioteki, którego świadomie nie pokazujemy.
	if (typeof odmowa.code === "string" && KODY_ZASTEPOWANE.has(odmowa.code)) {
		return zapasowy;
	}

	const tresc = typeof odmowa.message === "string" ? odmowa.message.trim() : "";
	return tresc.length > 0 ? tresc : zapasowy;
}

/**
 * DRUGA POLITYKA — bramki hasłowe panelu uczelni i kolejki recenzji.
 *
 * Te dwa formularze NIE chodzą przez bibliotekę uwierzytelniającą, tylko przez
 * własne trasy (`/api/faculty/login`, `/api/operator/login`), a ich serwer
 * odpowiada wewnętrznymi napisami po angielsku: „Not found" (panel za zgaszoną
 * flagą), „Server misconfigured" (słabe hasło na produkcji, kolizja kampusów,
 * brak wiersza najemcy), „Forbidden" (niezgodne źródło żądania). Tych treści
 * NIE pokazujemy — nic nie mówią człowiekowi i opisują wnętrze systemu.
 *
 * ALE ta sama wada co w incydencie siedziała tutaj i nadal by siedziała:
 * OBA formularze pokazywały „Nieprawidłowe hasło" na KAŻDĄ odpowiedź inną niż
 * sukces. Zgaszona flaga (404) i błąd konfiguracji (500) czytały się dla
 * człowieka jako „pomyliłeś hasło" — dokładnie ten mechanizm ciszy, który
 * kosztował sześć dni. Dlatego rozdzielamy: winą użytkownika jest WYŁĄCZNIE 401.
 *
 * Podanie numeru statusu niczego nie zdradza — widać go w narzędziach
 * przeglądarki bez logowania. Daje za to zgłaszalny ślad.
 */
export function komunikatBramkiHaslowej(status: number): string {
	if (status === 401) return "Nieprawidłowe hasło";
	if (status === 429) return "Za dużo prób logowania. Odczekaj chwilę i spróbuj ponownie.";
	return (
		`Logowanie jest w tej chwili niedostępne (kod ${status}). ` +
		"To nie jest problem z Twoim hasłem — zgłoś to, jeśli się powtarza."
	);
}
