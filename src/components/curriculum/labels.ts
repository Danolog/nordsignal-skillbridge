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
