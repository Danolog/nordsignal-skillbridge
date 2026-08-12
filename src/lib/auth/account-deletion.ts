// ============================================================================
// E1b (RODO art. 17) — USUNIĘCIE KONTA: bramka flagi + zaczepy before/after.
//
// D-U1 (projekt Ethana E1b §4): NIE piszemy własnej trasy `DELETE /api/account`.
// Biblioteka uwierzytelniająca ma gotową ścieżkę `/delete-user`, zamkniętą
// przełącznikiem konfiguracyjnym, i robi cztery rzeczy, które musielibyśmy
// odtworzyć (świeżość sesji, weryfikacja hasła, unieważnienie sesji, kolejność
// kasowania sesje → konta logowania → wiersz `user`). Każda odtworzona byłaby
// DRUGIM NOŚNIKIEM tej samej reguły (CLAUDE.md v1.17). Naszą częścią są
// wyłącznie: bramka flagi, ślad audytowy i to, czego biblioteka nie wie —
// czyli nic o `students` i 30 tabelach poniżej (robi to kaskada bazy).
//
// ── DLACZEGO BRAMKA FLAGI ŻYJE TUTAJ, A NIE TYLKO W OPCJACH BIBLIOTEKI ──────
//
// Opcje biblioteki budujemy RAZ, przy starcie modułu. Zmienna środowiskowa na
// Vercelu przestawia się BEZ wdrożenia (to samo rozumowanie, które umieściło
// sprzężenie flag w `isFeatureEnabled`, a nie w skrypcie wdrożeniowym —
// `src/lib/flags.ts`). Wartość odczytana przy starcie instancji zostaje z nią
// na cały jej cykl życia: zgaszenie flagi po incydencie NIE zamknęłoby ścieżki
// na już rozgrzanych instancjach.
//
// Dlatego bramek jest dwie i obie WOŁAJĄ ten sam nośnik (`isFeatureEnabled`),
// żadna go nie powtarza:
//   • w opcjach (`enabled`) — odczyt przy starcie, kierunek AWARII ZAMKNIĘTEJ
//     (przy starcie z flagą zgaszoną trasa nie istnieje w ogóle),
//   • TUTAJ, w `beforeDelete` — odczyt PRZY KAŻDYM ŻĄDANIU, i to jest bramka
//     rozstrzygająca. Zgaszenie flagi zamyka ścieżkę natychmiast, bez wdrożenia.
//
// Strażnik: `rodo-e1b-usuniecie-konta-petla.integration.test.ts` sprawdza obie —
// w szczególności zgaszenie flagi PO załadowaniu modułu (co ćwiczy wyłącznie
// bramkę per żądanie; mutacja usuwająca ją stąd czerwieni ten test).
//
// ── CZEGO TU ŚWIADOMIE NIE MA ───────────────────────────────────────────────
//
// Potwierdzenia POCZTĄ (`sendDeleteAccountVerification`) — D-U2. Dwa powody,
// oba twarde: (1) nie mamy żadnej biblioteki pocztowej w manifeście, więc tryb
// pocztowy wymagałby nowego przetwarzającego, umowy powierzenia i wpisu w RoPA;
// (2) ten tryb zapisuje do tabeli `verification` wiersz o wartości równej
// identyfikatorowi WŁAŚNIE USUWANEGO konta, a `verification` NIE kaskaduje —
// czyli naprawa zostawiałaby po sobie dokładnie to, co miała usunąć (E1b §3.5).
// ============================================================================

import { APIError } from "better-auth/api";
import { recordAudit } from "@/lib/audit";
import { isFeatureEnabled } from "@/lib/flags";

/** Nazwa flagi — jedno miejsce, z którego czytają obie bramki i strażnik. */
export const FLAGA_USUWANIA_KONTA = "accountDeletion" as const;

/**
 * Zdarzenie audytowe usunięcia konta — wzorzec A7 (ADR A-1, kierunek (a+)).
 *
 * `actorType: "student"` ⇒ `REGULA_AKTORA` NIE POZWALA podać `actorId`,
 * `ipAddress` ani `userAgent`; próba dopisania ich tutaj jest błędem
 * KOMPILACJI, nie ustaleniem przeglądu. Jedynym wiązaniem z osobą jest
 * `targetId`, który w chwili zapisu JUŻ JEST SIEROTĄ — wiersz `user` nie
 * istnieje, bo zaczep `afterDelete` biegnie po skasowaniu konta.
 */
export const AKCJA_USUNIECIA_KONTA = "account.deletion.completed";

/** Kształt użytkownika, jaki podaje biblioteka do zaczepów (potrzebne `id`). */
type UzytkownikZaczepu = { id: string };

/**
 * Zaczep PRZED usunięciem — bramka flagi (rozstrzygająca, per żądanie).
 *
 * Rzucony `APIError` przerywa żądanie ZANIM biblioteka skasuje cokolwiek:
 * w handlerze `beforeDelete` jest awaitowany przed `internalAdapter.deleteUser`.
 * Zwracamy „nie znaleziono", nie „brak uprawnień" — przy zgaszonej fladze trasa
 * ma NIE ISTNIEĆ (konwencja domu: „off = trasa 404”), a nie ujawniać, że jest
 * i czeka na zapalenie.
 */
export async function beforeDeleteAccount(_user: UzytkownikZaczepu): Promise<void> {
	if (!isFeatureEnabled(FLAGA_USUWANIA_KONTA)) {
		throw APIError.fromStatus("NOT_FOUND");
	}
}

/**
 * Zaczep PO usunięciu — jedyny ślad, jaki zostaje po koncie.
 *
 * Zapis jest best-effort (`recordAudit` połyka błąd) i to jest ŚWIADOME:
 * konto już nie istnieje, więc przerwanie żądania niczego by nie cofnęło —
 * dałoby wyłącznie komunikat błędu po skutecznym usunięciu, czyli stan
 * rozjechany i mylący (to samo rozumowanie, co wariant (B) odrzucony w D-U7).
 *
 * ⚠ GRANICA, KTÓRĄ ZAPISUJĘ ZAMIAST PRZEMILCZEĆ: przy awarii zapisu ten ślad
 * NIE POWSTANIE. Nie czyni to rejestru żądań usunięcia dziurawym, bo rejestrem
 * rozstrzygającym NIE JEST ta tabela — jest nim audit log firmy poza bazą
 * produktu (D-U5 pkt 2: odtworzenie bazy z kopii cofnęłoby także `audit_log`,
 * więc tabela produktu nie może być jedynym rejestrem żądań).
 */
export async function afterDeleteAccount(user: UzytkownikZaczepu): Promise<void> {
	await recordAudit({
		actorType: "student",
		action: AKCJA_USUNIECIA_KONTA,
		targetType: "user",
		targetId: user.id,
	});
}
