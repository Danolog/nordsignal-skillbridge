"use client";

import type { LeafKind } from "@/lib/db/data/anchor-config";

// ── Mikro-komponenty kontekstu grupy (Partia 5, C4) ──────────────────────────
// SharePill i KindChip są CZYSTO prezentacyjne, neutralne, bez glow/gradientu —
// zgodne z „Spokojnym ekspertem" (spec sekcja 0.1). Reużywane w panelu szczegółów
// węzła i w widoku listowym mapy.

/** Etykieta typu kompetencji widoczna studentowi. Tylko narzędzie/koncepcja
 *  (spec 2.6/3.2); pozostałe kind (cert/meta/soft) → brak chipa (nie udajemy etykiety). */
const KIND_LABELS: Partial<Record<LeafKind, string>> = {
	tool: "narzędzie",
	concept: "koncepcja",
};

export function KindChip({ kind }: { kind?: LeafKind | null }) {
	if (!kind) return null;
	const label = KIND_LABELS[kind];
	if (!label) return null;
	return (
		<span className="inline-flex items-center rounded-sm border border-ed-border bg-ed-surface px-1.5 py-0.5 text-[11px] font-medium text-ed-muted">
			{label}
		</span>
	);
}

/** „38% ofert grupy" — UNIA grupy (spec 2.6). Wizualnie inny niż goły „% ofert"
 *  kompetencji, ZAWSZE ze słowem „grupy", żeby dwóch różnych liczb % nie pomylić.
 *  null → nic (G3: nie renderuj „null% ofert"). */
export function SharePill({ unionShare }: { unionShare?: number | null }) {
	if (unionShare == null) return null;
	return (
		<span className="inline-flex items-center whitespace-nowrap rounded-sm border border-ed-border bg-ed-badge-bg px-2 py-0.5 text-xs font-medium text-ed-amber-text">
			{unionShare}% ofert grupy
		</span>
	);
}
