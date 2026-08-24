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

/** Raz na proces, nie raz na żądanie — koszt to jedno zapytanie na zimny start. */
let juzZmierzono = false;

/** Tylko na potrzeby testów — pozwala odtworzyć stan „jeszcze nie mierzono". */
export function zresetujSonde(): void {
	juzZmierzono = false;
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

/** Zamienia wynik na jedną linię logu — bez DSN, bez hasła. */
export function sformatujWynik(w: WynikSondy): string {
	if (w.rodzaj === "niewazna") {
		return `${PREFIKS_SONDY} POMIAR NIEWAŻNY — ${w.powod}. Werdyktu NIE podaję.`;
	}
	const ocena =
		w.sessionUser === "app_runtime"
			? "połączenie runtime AKTYWNE"
			: `połączenie NIE jest rolą runtime (session_user=${w.sessionUser})`;
	return (
		`${PREFIKS_SONDY} session_user=${w.sessionUser} current_user=${w.currentUser} ` +
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
