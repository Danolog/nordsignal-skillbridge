"use client";

/**
 * RatingScale — segmentowy wybór 1 z 4 poziomów (B4 samoocena kompetencji).
 *
 * Pod spodem role="radiogroup" / role="radio" — pełna semantyka ARIA.
 * Etykiety: skala słowna PRD 1:1 ("nie znam/uczę się/znam/dobrze znam") — zestaw
 * `default`. Od Partii 5 (C3) etykiety zależą od RODZAJU kompetencji (prop `kind`):
 * narzędzie się OBSŁUGUJE, koncepcję się ROZUMIE/STOSUJE (market-catalog.ts §C3).
 * `tool`/`concept` to wariant per typ; `default` (brak prop) = dawne etykiety PRD.
 * WAŻNE: Nie wolno używać golden'owych etykiet "Podstawy/Średnio/Dobrze/Biegle"
 *        (spec §5.2, §8.1 — PRD wygrywa nad golden). Czasowniki C3 są zgodne z PRD.
 *
 * A11y: nawigacja strzałkami (←/→), wybór Spacją/Enterem.
 * Tokeny tranzycji: --transition-fast 150ms (spec §5.5.1).
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §5.2 + partia5 §3
 */

import { useRef } from "react";
import type { LeafKind } from "@/lib/db/data/anchor-config";
import { ratingOptionsForKind } from "@/lib/onboarding/market-catalog";

// Skala słowna PRD §4.3 KA1 / DP linia 182 — zatwierdzona, nie zmieniać.
// To zestaw `default` (== ratingOptionsForKind(null)); zachowany jako stała dla
// zgodności wstecz i testów. Wariant per rodzaj idzie przez prop `kind`.
export const RATING_OPTIONS = [
	{
		value: 1 as const,
		label: "nie znam",
		description: "Nie miałem jeszcze styczności / nie potrafię.",
	},
	{
		value: 2 as const,
		label: "uczę się",
		description: "Zaczynam, potrzebuję wsparcia.",
	},
	{
		value: 3 as const,
		label: "znam",
		description: "Robię typowe zadania samodzielnie.",
	},
	{
		value: 4 as const,
		label: "dobrze znam",
		description: "Radzę sobie też w trudniejszych sytuacjach.",
	},
] as const;

export type RatingValue = 1 | 2 | 3 | 4;

interface RatingScaleProps {
	value: RatingValue | null;
	name: string; // nazwa grupy radio (a11y)
	ariaLabel: string; // "Poziom kompetencji: {name}"
	disabled?: boolean;
	/** Rodzaj kompetencji (C3) — dobiera czasowniki skali. Brak → zestaw `default` (PRD). */
	kind?: LeafKind | null;
	onChange: (value: RatingValue) => void;
}

export function RatingScale({
	value,
	name: _name, // używany przez rodzica do budowania ariaLabel ("Poziom kompetencji: {name}")
	ariaLabel,
	disabled = false,
	kind,
	onChange,
}: RatingScaleProps) {
	const groupRef = useRef<HTMLDivElement>(null);
	// Etykiety per rodzaj (C3): tool/concept → własny czasownik; brak → PRD (RATING_OPTIONS).
	const options: readonly { value: RatingValue; label: string; description: string }[] = kind
		? ratingOptionsForKind(kind)
		: RATING_OPTIONS;

	// Nawigacja strzałkami (←/→) wewnątrz radiogroup — wzorzec ARIA APG
	function handleKeyDown(e: React.KeyboardEvent, current: RatingValue) {
		if (disabled) return;
		let next: RatingValue | null = null;
		if (e.key === "ArrowRight" || e.key === "ArrowDown") {
			next = (current < 4 ? current + 1 : 1) as RatingValue;
		} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
			next = (current > 1 ? current - 1 : 4) as RatingValue;
		}
		if (next !== null) {
			e.preventDefault();
			onChange(next);
			// Przenosimy fokus na wybrany element
			const el = groupRef.current?.querySelector<HTMLElement>(`[data-value="${next}"]`);
			el?.focus();
		}
	}

	return (
		<div ref={groupRef} role="radiogroup" aria-label={ariaLabel} className="flex gap-1 sm:gap-2">
			{options.map((opt) => {
				const isSelected = value === opt.value;
				const inputId = `rating-${_name}-${opt.value}`;
				return (
					// Natywny input[type=radio] ukryty wizualnie, label widoczna jako segment.
					// Wzorzec "radio button group as segmented control" — pełna semantyka ARIA,
					// klawiatura i screenreader bez dodatkowych role atrybutów.
					<label
						key={opt.value}
						htmlFor={inputId}
						data-value={opt.value}
						title={opt.description}
						className={[
							"flex flex-1 flex-col items-center justify-center rounded-md border px-2 py-2 text-center",
							"text-xs font-medium leading-tight",
							"cursor-pointer select-none",
							// Tranzycja stanu (--transition-fast 150ms per spec §5.5.1)
							"transition-all duration-150 ease-out",
							// Fokus widoczny przez focus-within (fokus na ukrytym input)
							"has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ed-amber has-[:focus-visible]:ring-offset-1",
							// Stany
							isSelected
								? "border-ed-amber bg-ed-amber text-ed-ink shadow-sm"
								: "border-border bg-background text-muted-foreground hover:border-ed-amber hover:bg-ed-badge-bg hover:text-ed-amber-text",
							disabled ? "cursor-not-allowed opacity-50" : "",
						]
							.filter(Boolean)
							.join(" ")}
					>
						{/* Natywny input — dostępny dla AT, ukryty wizualnie (sr-only) */}
						<input
							id={inputId}
							type="radio"
							name={_name}
							value={opt.value}
							checked={isSelected}
							disabled={disabled}
							onChange={() => onChange(opt.value)}
							onKeyDown={(e) => handleKeyDown(e, opt.value)}
							className="sr-only"
							aria-label={`${opt.label} — ${opt.description}`}
						/>
						<span className="block pointer-events-none">{opt.label}</span>
					</label>
				);
			})}
		</div>
	);
}
