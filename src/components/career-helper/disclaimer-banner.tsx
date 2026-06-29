import { Info } from "lucide-react";

/**
 * DisclaimerBanner (kompozyt B0.5, spec §6.5) — stały disclaimer HITL.
 *
 * BRAK PROPSÓW — treść zhardkodowana 1:1 w komponencie (ADR-008 — rozdział wagi oceny / CLAUDE.md §7).
 * To JEDYNE miejsce prawdy tego tekstu. Nie jest generowany przez LLM ani
 * zwracany przez żaden endpoint — żeby treści nie dało się podmienić.
 * Test sprawdza obecność stringa „To NIE są rekomendacje”.
 *
 * role="note" (nie alert — ważne, nie krytyczne; spec §10 ekran 3).
 */
export function DisclaimerBanner() {
	return (
		<div
			role="note"
			className="flex items-start gap-4 rounded-xl border border-l-4 border-l-primary bg-accent px-5 py-4"
		>
			<Info aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
			<div className="flex flex-col gap-1">
				<p className="text-base font-semibold text-foreground">To NIE są rekomendacje</p>
				<p className="text-sm leading-relaxed text-foreground">
					Finalna decyzja jest Twoja po rozmowie z opiekunem. Możesz wracać i zmieniać ścieżkę — to
					nie jest test, który zdajesz raz na zawsze.
				</p>
			</div>
		</div>
	);
}
