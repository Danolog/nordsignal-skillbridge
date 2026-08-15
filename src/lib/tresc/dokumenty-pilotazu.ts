/**
 * DOKUMENTY PILOTAŻU W INTERFEJSIE — ładowarki treści (fala 2).
 *
 * ── ZERO NOWEJ LOGIKI ────────────────────────────────────────────────────────
 * Cały aparat już istnieje i jest generyczny: `wytnijCzescI(markdown)` bierze
 * markdown (nie ścieżkę), `podzielNaBloki(markdown)` dzieli go na akapity i
 * tabele, `KlauzulaMarkdown` renderuje bloki. Te dokumenty mają CELOWO ten sam
 * kształt co klauzula art. 13 — CZĘŚĆ I dla człowieka, CZĘŚĆ II jako aparat
 * wewnętrzny — więc jedyne, czego brakowało, to wskazanie pliku. Ten moduł nie
 * dokłada ani jednej reguły cięcia; gdyby dokładał, byłby drugim nośnikiem
 * mechanizmu, który już ma swojego strażnika i swoje dowody mutacji.
 *
 * ── DLACZEGO IMPORT Z `legal/klauzula-art13` ─────────────────────────────────
 * Nazwa modułu jest historyczna (powstał przy klauzuli RODO), ale `wytnijCzescI`
 * i `podzielNaBloki` nie wiedzą nic o RODO — operują na kształcie dokumentu.
 * Przeniesienie ich do neutralnego modułu byłoby czystsze i JEST DŁUGIEM: robimy
 * to przy pierwszej zmianie samego mechanizmu cięcia, nie przy dokładaniu
 * trzeciego dokumentu (próg jawny, CLAUDE.md v1.17 — świadomy drugi nośnik
 * wymaga progu, a nie przemilczenia). Dziś przeniesienie ruszyłoby plik pod
 * strażnikiem RODO bez potrzeby.
 *
 * ── ŚLAD FUNKCJI SERWEROWEJ (pułapka produkcyjna) ────────────────────────────
 * Odczyt idzie przez `readFileSync` ze ścieżki składanej w czasie działania,
 * więc statyczna analiza śladu funkcji bezserwerowej Vercela NIE widzi tych
 * plików. Każda trasa, która woła którąkolwiek z tych ładowarek, MUSI mieć wpis
 * w `outputFileTracingIncludes` (`next.config.ts`) — bez niego strona działa
 * lokalnie i wywala się na produkcji błędem „ENOENT". Ten sam mechanizm i ten
 * sam powód co przy `/prywatnosc`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { wytnijCzescI } from "@/lib/legal/klauzula-art13";

/**
 * Nośnik odpowiedzi dla pracodawcy pod martwym odnośnikiem paszportu.
 * Jedyne miejsce, w którym ta ścieżka pada w kodzie produkcyjnym.
 */
export const SCIEZKA_ZASADY_DLA_PRACODAWCY = join(
	process.cwd(),
	"docs",
	"product",
	"zasada-odpowiedzi-dla-pracodawcy.md",
);

/**
 * Nośnik regulaminu pilotażu.
 * Jedyne miejsce, w którym ta ścieżka pada w kodzie produkcyjnym.
 */
export const SCIEZKA_REGULAMINU_PILOTAZU = join(
	process.cwd(),
	"docs",
	"product",
	"regulamin-pilotazu.md",
);

/**
 * CZĘŚĆ I zasady odpowiedzi dla pracodawcy — to, co widzi człowiek, który
 * kliknął martwy odnośnik do paszportu. Wyjątek z `wytnijCzescI` (nierozpoznany
 * kształt dokumentu, aparat wewnętrzny w treści) CELOWO nie jest łapany: lepiej
 * pokazać błąd niż wydrukować pracodawcy notatkę roboczą.
 */
export function wczytajZasadeDlaPracodawcy(): string {
	return wytnijCzescI(readFileSync(SCIEZKA_ZASADY_DLA_PRACODAWCY, "utf8"));
}

/** CZĘŚĆ I regulaminu pilotażu — treść dla uczestnika. Zasada wyjątku jak wyżej. */
export function wczytajRegulaminPilotazu(): string {
	return wytnijCzescI(readFileSync(SCIEZKA_REGULAMINU_PILOTAZU, "utf8"));
}
