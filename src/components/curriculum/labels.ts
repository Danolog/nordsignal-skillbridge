/**
 * 1E.6a — polskie etykiety statusów i typów pozycji drabiny curriculum.
 * Jedno miejsce nazewnictwa (drabina, widok modułu, widok pozycji, testy).
 */

import type { LadderItem, ModuleStatus } from "@/lib/curriculum/ladder";

export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
	locked: "Zablokowany",
	available: "Dostępny",
	in_progress: "W trakcie",
	completed: "Zaliczony",
	// Moduł bez treści — drabina mówi prawdę, nie udaje „dostępny" (ADR-014 D3).
	coming_soon: "Treść w drodze",
};

/**
 * 1E.7 L6 · POWIERZCHNIA B — odznaka modułu otwartego diagnozą (§8, cytat 1:1).
 *
 * Stała, nie funkcja: tekst nie zależy od żadnego parametru (Mila §4.2). To jedyny
 * TRWAŁY nośnik zdania „otwarte ≠ zaliczone" — powierzchnia A (krok 4 kreatora)
 * znika po jednym przejściu i student może jej nie zobaczyć ani razu (§12.7 pkt 6).
 */
export const PLACEMENT_BADGE_LABEL = "Otwarty na podstawie diagnozy · niezaliczony";

/**
 * Nagłówek `/curriculum` — dwa brzmienia, wybór po fladze (dług D7, §12.9 pkt 1).
 *
 * Stare zdanie („bez skrótów") KŁAMIE, gdy mechanizm skrótu istnieje w produkcie:
 * student zobaczyłby je i tuż pod nim odznakę „Otwarty na podstawie diagnozy" na
 * module, którego nie zaliczył — sprzeczność w dwóch sąsiadujących liniach, do
 * obalenia jednym spojrzeniem.
 *
 * Bramkujemy po FLADZE, nie po tym, czy TEN student ma coś odblokowane: zdanie
 * o braku skrótów jest fałszywe, odkąd skrót jest możliwy, a nie dopiero odkąd
 * komuś zadziałał (Mila §4.5). Teksty tutaj, nie w JSX, bo są mikrocopy Sophii
 * i podlegają cytatowi 1:1 tak samo jak zdania narracji (§12.3).
 */
export const CURRICULUM_INTRO =
	"Moduły od podstaw do projektu. Kolejny moduł otwiera się dopiero po zaliczeniu poprzedniego — bez skrótów.";

export const CURRICULUM_INTRO_WITH_PLACEMENT =
	"Moduły od podstaw do projektu. Kolejny moduł otwiera się po zaliczeniu poprzedniego — albo od razu, jeśli diagnoza pokazała, że znasz wcześniejszy materiał. Otwarty moduł to nie zaliczony moduł.";

export const ITEM_STATUS_LABEL: Record<LadderItem["status"], string> = {
	locked: "Zablokowana",
	available: "Dostępna",
	in_progress: "W trakcie",
	completed: "Zaliczona",
	skipped_by_placement: "Pominięta (diagnoza)",
};

/** kind pozycji — lista miękka w bazie, więc fallback na surową wartość. */
export function itemKindLabel(kind: string): string {
	switch (kind) {
		case "theory":
			return "Teoria";
		case "exercise":
			return "Ćwiczenie";
		case "lab":
			return "Lab";
		case "project":
			return "Projekt";
		case "review":
			return "Powtórka";
		default:
			return kind;
	}
}

/** Klasy odznaki statusu — spójne dla modułów i pozycji. */
export function statusBadgeClass(status: string): string {
	switch (status) {
		case "completed":
		case "skipped_by_placement":
			return "border-emerald-200 bg-emerald-50 text-emerald-800";
		case "in_progress":
			return "border-amber-200 bg-amber-50 text-amber-800";
		case "locked":
			return "border-border bg-muted text-muted-foreground";
		case "coming_soon":
			return "border-border bg-muted text-muted-foreground";
		default:
			return "border-sky-200 bg-sky-50 text-sky-800";
	}
}
