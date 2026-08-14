/**
 * 1E.7 L6 · POWIERZCHNIA B — JEDYNE miejsce warunku „czy pokazać odznakę placementu".
 *
 * ── DLACZEGO TO JEST OSOBNA FUNKCJA, A NIE WYRAŻENIE W WIDOKU ─────────────────
 * Pole `openedByPlacementEver` odpowiada na pytanie „czy diagnoza KIEDYKOLWIEK otworzyła
 * ten moduł". Wiersz w `curriculum_placements` jest z decyzji Sophii niezmienny i
 * NIGDY nie znika, więc pole zostaje `true` także po zaliczeniu modułu. Odznaka
 * odpowiada na INNE pytanie — „czy TERAZ warto to pokazać" — i §12.9 pkt 2 mówi
 * wprost: znika, gdy moduł zostanie zaliczony, bo wtedy prawdą staje się jego
 * własny stan (`MODULE_STATUS_LABEL.completed`).
 *
 * Nazwa pola sugeruje stan bieżący, a niesie historię. Kolejny autor widoku użyje
 * go wprost jako „pokaż odznakę" i nie dowie się, że brakuje drugiej połowy
 * warunku — a wtedy student zobaczy „niezaliczony" na module, który właśnie zdał
 * egzaminem. To produkt zaprzeczający własnym danym, w jedynym trwałym nośniku
 * zdania „otwarte ≠ zaliczone".
 *
 * Dziś konsument jest JEDEN (`ladder-view.tsx`) i warunek NIE jest zduplikowany —
 * sprawdzone, nie założone. Ta funkcja nie naprawia więc istniejącego rozjazdu,
 * tylko odbiera następnemu autorowi możliwość jego zrobienia: import zamiast
 * przepisania. Precedens kosztu jest świeży — dwie kopie reguły wyboru celu
 * kariery były dziś blokerem zapłonu.
 *
 * `Pick<>` zamiast całego `LadderModule` jest celowy: gdy pole zmieni nazwę
 * (wniosek W6 — nazwa ma mówić o prowenicji, nie o stanie), kompilator wskaże
 * DOKŁADNIE to jedno miejsce w `src/components/**`, a nie każdy widok z osobna.
 */

import type { LadderModule } from "@/lib/curriculum/ladder";

/** Fakt o pochodzeniu (`openedByPlacementEver`) + stan teraz (`status`) — oba wymagane. */
export type PlacementBadgeInput = Pick<LadderModule, "openedByPlacementEver" | "status">;

export function shouldShowPlacementBadge(module: PlacementBadgeInput): boolean {
	return module.openedByPlacementEver === true && module.status !== "completed";
}
