"use client";

/**
 * ReflectionQuestion — jedno pytanie refleksji B5.
 *
 * Etykieta: brzmienie R2 zablokowane przez Darka (sekcja 6.3 specu) —
 * zhardkodowane per questionKey, NIE prop tekstowy. Jedno źródło brzmienia,
 * audytowalne jak DisclaimerBanner w B0.
 *
 * A11y:
 * - label z htmlFor powiązane z textarea
 * - aria-required na textarea (pola opcjonalne = false, ale etykieta obecna)
 * - aria-invalid gdy parent chce sygnalizować błąd zapisu
 * - aria-describedby → licznik zdań
 * - licznik zdań: aria-live="polite" gdy > 3 zdania
 *
 * Walidacja miękka (spec §4.4): licznik informuje, NIE blokuje zapisu.
 * Heurystyka zdań: normalizacja wielokropka + sekwencji ./!? (spec §4.4 pkt 1–2).
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §5.3
 */

import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";

export type QuestionKey = "surprised" | "frustrated" | "learned";

/** R2 — brzmienie zablokowane; nie podlega zmianie bez sign-offu Darka. */
const QUESTION_LABELS: Record<QuestionKey, string> = {
	surprised: "Co cię w tym projekcie zaskoczyło?",
	frustrated: "Co cię w nim wkurzyło albo zniechęciło?",
	learned: "Czego dowiedziałeś się o sobie?",
};

/**
 * Heurystyczna liczba zdań (spec §4.4 pkt 1–3).
 * Normalizuje wielokropki, sekwencje i zlicza końce zdań.
 * Wydzielona jako czysta funkcja (jeden konsument dziś — reużywalna jutro).
 */
export function countSentences(text: string): number {
	if (!text.trim()) return 0;
	const normalized = text
		// sekwencje 2+ kropek (w tym „...") → jedna kropka
		.replace(/\.{2,}/g, ".")
		// U+2026 HORIZONTAL ELLIPSIS → kropka
		.replace(/…/g, ".")
		// sekwencje !?/!!/??/!? → jeden znak końca zdania
		.replace(/[!?]{2,}/g, "?")
		// „?!" / „!?" → jeden znak
		.replace(/[!?][!?]+/g, "?");
	const matches = normalized.match(/[.!?]/g);
	return matches ? matches.length : 0;
}

interface ReflectionQuestionProps {
	questionKey: QuestionKey;
	value: string;
	onChange: (v: string) => void;
	disabled?: boolean;
	/** aria-invalid — ustawia parent gdy cały formularz ma błąd zapisu */
	invalid?: boolean;
}

export function ReflectionQuestion({
	questionKey,
	value,
	onChange,
	disabled = false,
	invalid = false,
}: ReflectionQuestionProps) {
	const textareaId = useId();
	const counterId = useId();
	const label = QUESTION_LABELS[questionKey];
	const sentences = countSentences(value);
	const overLimit = sentences > 3;

	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={textareaId} className="text-sm font-medium text-foreground">
				{label}
			</label>

			<Textarea
				id={textareaId}
				rows={3}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				aria-required={false}
				aria-invalid={invalid ? "true" : undefined}
				aria-describedby={counterId}
				placeholder="Wpisz odpowiedź (opcjonalne)…"
				className={[
					"resize-none",
					"transition-colors duration-150",
					invalid ? "border-destructive" : "",
				]
					.filter(Boolean)
					.join(" ")}
			/>

			{/* Licznik zdań — aria-live="polite" przy przekroczeniu 3 zdań (spec §5.3) */}
			<p
				id={counterId}
				aria-live={overLimit ? "polite" : "off"}
				aria-atomic="true"
				className={["text-xs", overLimit ? "text-amber-600" : "text-muted-foreground"].join(" ")}
			>
				{overLimit
					? `Zdań: ${sentences} (zalecane ≤ 3) — to trochę dużo, refleksja działa najlepiej krótko.`
					: `Zdań: ${sentences} (zalecane ≤ 3)`}
			</p>
		</div>
	);
}
