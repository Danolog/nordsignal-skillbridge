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
 * DLACZEGO NIE WYBIERAMY PO STATUSIE — to była pierwsza, błędna wersja
 * -------------------------------------------------------------------
 * Kuszące jest „status 403 znaczy nasza odmowa". Byłaby to wada bezpieczeństwa:
 * `EMAIL_NOT_VERIFIED` biblioteki to RÓWNIEŻ 403, a jego treść („Email not
 * verified") zdradza, że konto o tym adresie ISTNIEJE. Wybór po statusie
 * wypuściłby ją na ekran. Wybór po `code` — nie.
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
 * ŚWIADOMIE NIE MA TU `USER_ALREADY_EXISTS`.
 *
 * Ten kod pada przy rejestracji na zajęty adres i odróżnia „adres wolny" od
 * „adres zajęty" — czyli TEŻ wylicza konta. Zostawiam go widocznym, bo:
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
