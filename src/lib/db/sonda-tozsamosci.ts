/**
 * SONDA D2 — jaką ROLĄ aplikacja łączy się z bazą produkcyjną.
 *
 * PO CO TO ISTNIEJE
 * -----------------
 * Stan aktywacji roli `app_runtime` był do 2026-08-24 **twierdzony w trzech
 * dokumentach i mierzony w zerze** (`rls-matrix.md` v0.10, audyt v0.2/v0.3,
 * `ceremonia-app-runtime.md` v0.1) — pozycja B9 planu wpuszczenia uczestnika.
 * Ta sonda jest jedynym uprawnionym nośnikiem tej odpowiedzi; dokumenty mają ją
 * WOŁAĆ, nie powtarzać.
 *
 * DLACZEGO `session_user`, A NIE `BYPASSRLS`
 * -----------------------------------------
 * Ścieżka przez `BYPASSRLS` **nie rozstrzyga** i to jest zmierzone, nie założone:
 * `withTenantContext` wykonuje w każdej transakcji `SET LOCAL ROLE app_student`,
 * a PostgreSQL sprawdza `BYPASSRLS` wobec roli **efektywnej**. Po przełączeniu
 * atrybut roli łączącej przestaje mieć znaczenie, więc świat „łączymy się
 * właścicielem" i świat „łączymy się `app_runtime`" dają **identyczne**
 * zachowanie. Pomiar równie zgodny z obiema hipotezami nie jest pomiarem.
 *
 * `session_user` jest odporne na to maskowanie: `SET LOCAL ROLE` zmienia rolę
 * efektywną (`current_user`) i **nigdy** roli sesji. To czyni je jedyną
 * wielkością, która te dwa światy rozróżnia — ta sama semantyka, która psuła
 * ścieżkę przez `BYPASSRLS`, obrócona na naszą korzyść.
 *
 * CO ODRÓŻNIA — zadeklarowane PRZED pierwszym uruchomieniem:
 *   session_user = 'app_runtime'   → połączenie runtime aktywne
 *   session_user = 'neondb_owner'  → poświadczenie właściciela (fallback)
 *   current_user = 'app_student'   → KONTROLA DODATNIA (patrz niżej)
 *
 * KONTROLA DODATNIA JEST WARUNKIEM INTERPRETACJI, NIE OZDOBĄ — i dlatego stoi
 * w KODZIE, a nie w komentarzu. Gdyby sonda wykonała się poza kontekstem
 * najemcy, `session_user` mierzyłoby połączenie, którego pytanie nie dotyczy —
 * czyli „sondę w złej warstwie", która melduje wynik, bo nic do niej nie
 * dociera. Gdy `current_user` nie jest rolą najemcy, funkcja **odmawia podania
 * werdyktu** zamiast podać go z zastrzeżeniem, które ktoś pominie.
 *
 * DLACZEGO LOG, A NIE TWARDA ASERCJA — FAZA 1 z jawnym progiem
 * ------------------------------------------------------------
 * Docelowo ma tu stać asercja POZYTYWNA (`session_user = 'app_runtime'`),
 * bramkowana produkcją. Nie stawiam jej w tym samym kroku, w którym mierzę,
 * bo **nie znam jeszcze wyniku**: jeśli produkcja łączy się właścicielem, twarda
 * asercja wywróciłaby każdą trasę najemcy w chwili wdrożenia. To byłby incydent
 * spowodowany narzędziem pomiarowym.
 *
 * ⚠ NOŚNIK PROGU FAZY 2 NIE JEST TYM KOMENTARZEM: `docs/2026-08-24-dlug-b9-faza-2.md`.
 * Ten akapit go WOŁA, nie zastępuje. Powód (W13, przegląd Leo #345): próg zapisany
 * wyłącznie prozą w nagłówku „się czyta, a nie się o niego odbija" — faza 2
 * zależałaby od tego, czy ktoś za miesiąc trafi na komentarz. Krok „odczyt logu
 * z produkcji" ma w definicji ukończenia pozycję **„decyzja o fazie 2 zapisana"**.
 *
 *   FAZA 1 (teraz)  — sonda logująca, stała, raz na proces.
 *   FAZA 2 (próg: pierwszy odczyt z produkcji) — jeśli wyjdzie `app_runtime`,
 *           zamiana na twardą asercję pozytywną. Jeśli wyjdzie właściciel,
 *           najpierw naprawa po stronie ops (ALTER ROLE / DATABASE_URL_RUNTIME),
 *           dopiero potem asercja. **W żadnym wariancie sonda nie znika.**
 *
 * ASERCJA MUSI BYĆ POZYTYWNA. Warunek `session_user <> 'neondb_owner'` byłby
 * w CI **prawdziwy trywialnie** (łączymy się superużytkownikiem kontenera), więc
 * strażnik nigdy nie wszedłby w stan, którego pilnuje — ta sama wada, przez
 * którą trzy strażniki panelu wykładowcy przeżyły zieloną suitę.
 *
 * ZERO PARSOWANIA ŁAŃCUCHA POŁĄCZENIA. Tożsamość pochodzi z ZAPYTANIA DO BAZY
 * (`IDENTITY_SQL` z `tools/k3-identity.ts` — ten sam nośnik, który obsługuje
 * `k3-validate`; wołamy go, nie kopiujemy). Wypisywanie idzie przez
 * `sanitizeField`, które maskuje wszystko, co wygląda na DSN. Hasło nie ma
 * którędy wyciec.
 */

import type { Queryable } from "../../../tools/k3-identity";
import { readDbIdentity, sanitizeField } from "../../../tools/k3-identity";

/** Role najemcy ustawiane przez `withTenantContext` przez SET LOCAL ROLE. */
const ROLE_NAJEMCY = new Set(["app_student", "app_faculty"]);

/** Prefiks logu — stały, żeby dało się go wyłuskać z logów wykonania dostawcy. */
export const PREFIKS_SONDY = "[sonda-d2]";

/**
 * Czy pomiar odbył się już w tym procesie.
 *
 * SPROSTOWANIE JAWNE (W11, przegląd Leo #345). Stare brzmienie tego komentarza:
 *
 *   „Raz na proces, nie raz na żądanie — koszt to jedno zapytanie na zimny start."
 *
 * **Było nieprawdziwe.** Zapytanie tożsamości faktycznie szło raz na proces, ale
 * para `SAVEPOINT`/`RELEASE` u wołającego była BEZWARUNKOWA — czyli dwa
 * dodatkowe obiegi do bazy w każdej transakcji najemcy, na zawsze. Zmierzone
 * atrapą zliczającą polecenia (Leo, 2026-08-24 16:23:31 CEST):
 *
 *   PIERWSZE żądanie: 5 poleceń (set_config ×2, SET LOCAL ROLE, SAVEPOINT,
 *                                IDENTITY_SQL, RELEASE)
 *   DRUGIE żądanie:   5 poleceń (set_config ×2, SET LOCAL ROLE, SAVEPOINT, RELEASE)
 *
 * Gorsze od samego kosztu było to, że strażnik „mierzy RAZ na proces" PRZECHODZIŁ
 * — sprawdzał wyłącznie zapytanie tożsamości, więc **obiecywał w nazwie własność,
 * której mierzył połowę**. Ta sama klasa co W1 na #342.
 *
 * Po naprawie: `czyJuzZmierzono()` pozwala wołającemu pominąć CAŁĄ obudowę, więc
 * drugie żądanie w procesie wysyła **trzy** polecenia. Pilnuje tego strażnik
 * `tenant-context-sonda-punkt-zapisu.test.ts` z mutacją przywracającą
 * bezwarunkowość.
 */
let juzZmierzono = false;

/** Tylko na potrzeby testów — pozwala odtworzyć stan „jeszcze nie mierzono". */
export function zresetujSonde(): void {
	juzZmierzono = false;
}

/**
 * Czy pomiar już się odbył w tym procesie.
 *
 * Istnieje po to, żeby WOŁAJĄCY mógł pominąć **całą** obudowę sondy — łącznie
 * z parą punktu zapisu — a nie tylko samo zapytanie tożsamości. Bez tego
 * predykatu `SAVEPOINT`/`RELEASE` szły bezwarunkowo w KAŻDEJ transakcji
 * najemcy, czyli dwa dodatkowe obiegi do bazy na zawsze, długo po tym, jak
 * sonda skończyła mierzyć (zmierzone przez Leo, przegląd #345: drugie żądanie
 * w procesie wysyłało 5 poleceń zamiast 3).
 */
export function czyJuzZmierzono(): boolean {
	return juzZmierzono;
}

export type WynikSondy =
	| { rodzaj: "niewazna"; powod: string; currentUser: string }
	| { rodzaj: "werdykt"; sessionUser: string; currentUser: string; database: string };

/**
 * Wykonuje pomiar i zwraca werdykt ALBO odmowę werdyktu.
 *
 * Czysta funkcja nad minimalnym kontraktem `Queryable` — nie wie nic o Drizzle
 * ani o transakcjach, więc test sprawdza ją atrapą, bez bazy.
 */
export async function zmierzTozsamosc(klient: Queryable): Promise<WynikSondy> {
	const id = await readDbIdentity(klient);
	const currentUser = sanitizeField(id.currentUser);

	// KONTROLA DODATNIA JAKO WARUNEK TWARDY — nie komentarz, nie ostrzeżenie.
	// Bez roli najemcy sonda mierzy nie to połączenie, o które pytamy.
	if (!ROLE_NAJEMCY.has(currentUser)) {
		return {
			rodzaj: "niewazna",
			powod:
				`rola efektywna to "${currentUser}", nie rola najemcy — sonda wykonała się ` +
				"poza kontekstem najemcy, więc session_user NIE opisuje połączenia z pytania B9",
			currentUser,
		};
	}

	return {
		rodzaj: "werdykt",
		sessionUser: sanitizeField(id.sessionUser),
		currentUser,
		database: sanitizeField(id.database),
	};
}

/**
 * Środowisko, w którym padł pomiar — `VERCEL_ENV` ustawia sama platforma
 * (`production` / `preview`); poza wdrożeniem zmiennej NIE MA WCALE.
 *
 * PO CO TO W LINII LOGU: bez tego pola sonda w CI wypisuje przy każdym
 * przebiegu integracji „połączenie NIE jest rolą runtime" — bo integracje łączą
 * się jako `test`, a nie `app_runtime`. Kto trafi na taką linię wyszukiwaniem,
 * ma gotowy **fałszywy werdykt B9**. To bliźniak wady, przed którą broni
 * kontrola dodatnia: pomiar poprawny, ale opisujący nie ten świat, o który
 * pytamy. Werdykt B9 wolno czytać WYŁĄCZNIE z linii `env=production`.
 */
function srodowisko(): string {
	const env = process.env.VERCEL_ENV;
	return typeof env === "string" && env.length > 0 ? env : "poza-wdrozeniem";
}

/** Zamienia wynik na jedną linię logu — bez DSN, bez hasła. */
export function sformatujWynik(w: WynikSondy): string {
	const gdzie = `env=${srodowisko()}`;
	if (w.rodzaj === "niewazna") {
		return `${PREFIKS_SONDY} ${gdzie} POMIAR NIEWAŻNY — ${w.powod}. Werdyktu NIE podaję.`;
	}
	const ocena =
		w.sessionUser === "app_runtime"
			? "połączenie runtime AKTYWNE"
			: `połączenie NIE jest rolą runtime (session_user=${w.sessionUser})`;
	return (
		`${PREFIKS_SONDY} ${gdzie} session_user=${w.sessionUser} current_user=${w.currentUser} ` +
		`database=${w.database} — ${ocena}`
	);
}

/**
 * Pomiar raz na proces. Nigdy nie przerywa żądania: awaria sondy nie może
 * wywrócić trasy studenta — narzędzie pomiarowe nie ma prawa być incydentem.
 */
export async function zmierzTozsamoscRaz(klient: Queryable): Promise<void> {
	if (juzZmierzono) return;
	juzZmierzono = true;
	try {
		console.warn(sformatujWynik(await zmierzTozsamosc(klient)));
	} catch (e) {
		console.warn(`${PREFIKS_SONDY} pomiar nieudany: ${e instanceof Error ? e.message : "?"}`);
	}
}
