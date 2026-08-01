/**
 * 1E.7 L6 — „czy ten napis nadaje się na tytuł do pokazania człowiekowi".
 *
 * JEDNA reguła, JEDNO miejsce. Powstało jako naprawa K1 (przegląd Leo): serwer
 * i klient miały dwie różne definicje tego samego pojęcia —
 *   serwer: `typeof title === "string"`            (pusty łańcuch PRZECHODZIŁ)
 *   klient: `typeof v === "string" && v.trim()`    (pusty łańcuch WYPADAŁ)
 * Kolumna `curriculum_modules.title` jest `NOT NULL`, ale `NOT NULL` nie zabrania
 * pustego łańcucha — więc rozjazd był osiągalny danymi z ingestu, nie tylko w teorii.
 *
 * ⚠ TO JUŻ TRZECI RAZ W TEJ SAMEJ FUNKCJI, GDY JEDNA REGUŁA ŻYŁA W DWÓCH KOPIACH:
 * (1) precedencja celu kariery — bloker D0; (2) „pozycja zaliczona" — dług D4;
 * (3) definicja tytułu — ten plik. Za każdym razem obie kopie zachowywały się
 * identycznie w chwili pisania i rozjeżdżały później, bezobjawowo. Dlatego reguła
 * mieszka w module BEZ ZALEŻNOŚCI (zero importów), żeby mogła być wołana i przez
 * warstwę serwera (sięga do bazy), i przez model widoku (jedzie do przeglądarki).
 * Import wartości z `placement-screen.ts` wciągnąłby `@/lib/db` do paczki klienta —
 * dlatego wspólna reguła NIE MOŻE tam mieszkać.
 */

/**
 * Czy wartość jest tytułem, który wolno pokazać studentowi.
 *
 * Pusty łańcuch i sam biały znak to BRAK tytułu, nie tytuł — moduł bez tytułu ma
 * wypaść z komunikatu, a nie pojawić się na ekranie jako pusty odstęp albo slug
 * (§12.7 pkt 4: żadnych wewnętrznych kodów na ekranie).
 *
 * Świadomie przyjmuje `unknown`: po stronie klienta ta sama funkcja waliduje
 * kształt, który przyszedł siecią, gdzie typ nie jest dowodem.
 */
export function jestTytulemDoPokazania(value: unknown): value is string {
	return typeof value === "string" && value.trim() !== "";
}
