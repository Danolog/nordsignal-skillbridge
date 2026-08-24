/**
 * /faculty/* — POWIERZCHNIA HTML panelu wykładowcy za flagą `facultyPanel`.
 *
 * PO CO TEN PLIK ISTNIEJE
 * -----------------------
 * Do 2026-08-24 reguła „panel za flagą" miała dwóch wołających i oba były po
 * stronie API:
 *
 *   `checkFacultyAuth`            zamyka ODCZYT   (dostęp do panelu i tras)
 *   `POST /api/faculty/login`     zamyka ZAPIS    (tworzenie sesji)
 *
 * Nikt nie zamykał trzeciej powierzchni: STRONY. `/faculty/login` to zwykły
 * server component bez żadnego sprawdzenia flagi, więc przy zgaszonej fladze
 * renderował się normalnie. Zmierzone na produkcji 2026-08-24 11:27:46 CEST:
 *
 *   /faculty/login                 -> 200   (formularz z polem „Hasło dostępu")
 *   /faculty                       -> 307   -> /faculty/login
 *   /nie-istnieje-kontrola-ujemna  -> 404   (kontrola ujemna)
 *
 * Skutek dla człowieka (znalezisko Leo, „zamknięty, ale wygląda na zepsuty"):
 * wykładowca wchodzi na `/faculty`, zostaje PRZEKIEROWANY na formularz, wpisuje
 * hasło — i dostaje 404 z trasy logowania. Panel był zamknięty poprawnie i
 * jednocześnie wyglądał na zepsuty. Gorzej: `/faculty` aktywnie kierowało ludzi
 * w ślepy zaułek, bo `checkFacultyAuth` zwraca `null` ZARÓWNO przy zgaszonej
 * fladze, JAK I przy braku sesji — strona nie umie tych dwóch stanów odróżnić.
 *
 * DLACZEGO LAYOUT, A NIE SPRAWDZENIE W KAŻDEJ STRONIE
 * ---------------------------------------------------
 * Bo reguła ma mieć JEDEN nośnik na tej powierzchni (CLAUDE.md §8 v1.17 pkt 1).
 * Sprawdzenie wpisane osobno do `/faculty/page.tsx` i `/faculty/login/page.tsx`
 * dałoby dwie kopie tej samej reguły w dwóch plikach — dokładnie kształt, który
 * przy #335 nazwał Leo: „koniunkcja rozłożona na dwa pliki nie wygląda jak
 * koniunkcja". Layout obejmuje CAŁY segment `/faculty/*`, więc:
 *   - strona dołożona tu w przyszłości jest zamknięta z automatu, bez pamiętania;
 *   - żeby regułę złamać, trzeba ruszyć TEN plik, a nie zapomnieć o nowym.
 *
 * Reguła nadal ŻYJE w rejestrze `FLAGS.facultyPanel` (`src/lib/flags.ts`) —
 * ten plik ją WOŁA, nie POWTARZA.
 *
 * DLACZEGO 404, A NIE STRONA „PANEL WYŁĄCZONY"
 * --------------------------------------------
 * Trzy powody, w kolejności wagi:
 *   1. BEZPIECZEŃSTWO. Trasa logowania celowo nie potwierdza, że panel istnieje
 *      (komentarz w `api/faculty/login/route.ts`). Strona „panel wyłączony"
 *      potwierdzałaby to wprost i cofała tę własność.
 *   2. SPÓJNOŚĆ Z API. `POST /api/faculty/login` przy zgaszonej fladze oddaje
 *      404. Powierzchnia HTML mówi teraz to samo, co powierzchnia API.
 *   3. WZORZEC DOMU. `/regulamin` i `/prywatnosc` robią dokładnie to samo —
 *      `notFound()` + `force-dynamic`, „off = feature nie istnieje", nie „pusta
 *      strona". Zmierzone: `/regulamin` -> 404 na produkcji, ten sam odczyt.
 *
 * RENDER DYNAMICZNY świadomie (`force-dynamic`), mimo że strony są statyczne:
 * flaga to zmienna środowiskowa, a te na Vercelu przestawia się BEZ wdrożenia.
 * Strona wygenerowana raz przy budowaniu zamroziłaby stan flagi z chwili
 * budowania — czyli serwowałaby formularz po tym, jak ktoś flagę zgasił.
 * Uzasadnienie identyczne jak przy `/prywatnosc` i `/regulamin`.
 *
 * CZEGO TEN PLIK NIE ROBI: nie zastępuje członów ODCZYT i ZAPIS po stronie API.
 * Zamknięcie strony jest wygodą dla człowieka i higieną powierzchni; bramką
 * bezpieczeństwa pozostają tamte dwa człony, bo do API da się wejść bez strony.
 */

import { notFound } from "next/navigation";
import { isFeatureEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
	if (!isFeatureEnabled("facultyPanel")) notFound();
	return <>{children}</>;
}
