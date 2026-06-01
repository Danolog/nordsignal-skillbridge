"use client";

/**
 * CompetencyRatingRow — jeden wiersz kompetencji z RatingScale i statusem autosave.
 *
 * Kompozyt: etykieta + RatingScale + status zapisu (○/spinner/●/⚠).
 * Wydzielony, bo wiersz ma własny stan autosave (stan S6 spec §3.4) — bez tego
 * logika autosave rozlałaby się po ekranie (golden §2.2 uzasadnienie).
 *
 * A11y:
 * - aria-live="polite" na statusie zapisu (ogłasza "zapisano" / "błąd zapisu")
 * - aria-invalid na wierszu w stanie error
 * - aria-busy w stanie saving
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §5.2
 * Golden: skills/design/golden-samoocena.md §6.2
 */

import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { RatingScale, type RatingValue } from "./RatingScale";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CompetencyRatingRowProps {
	competencyId: string;
	name: string;
	value: RatingValue | null;
	saveStatus: SaveStatus;
	disabled?: boolean;
	onChange: (competencyId: string, value: RatingValue) => void;
	onRetry: (competencyId: string) => void;
}

export function CompetencyRatingRow({
	competencyId,
	name,
	value,
	saveStatus,
	disabled = false,
	onChange,
	onRetry,
}: CompetencyRatingRowProps) {
	const isError = saveStatus === "error";
	const isSaving = saveStatus === "saving";
	const isSaved = saveStatus === "saved" && value !== null;

	return (
		<div
			className={[
				"rounded-lg border bg-card p-4",
				// aria-invalid dla screenreaderów (a11y, spec §5.2)
				isError ? "border-orange-300 bg-orange-50/50" : "border-border",
				// Tranzycja stanu (--transition-fast 150ms per spec §5.5.1)
				"transition-colors duration-150",
			]
				.filter(Boolean)
				.join(" ")}
			aria-invalid={isError ? "true" : undefined}
			aria-busy={isSaving ? "true" : undefined}
		>
			<div className="flex items-start justify-between gap-3 mb-3">
				<span className="text-sm font-medium text-foreground leading-tight">{name}</span>
				{/* Status zapisu (○/spinner/●/⚠) — ogłaszany przez aria-live */}
				<div aria-live="polite" aria-atomic="true" className="flex items-center shrink-0">
					{isSaving && (
						<Loader2
							className="h-4 w-4 text-muted-foreground animate-spin"
							aria-label="Zapisywanie…"
						/>
					)}
					{isSaved && <CheckCircle className="h-4 w-4 text-emerald-500" aria-label="Zapisano" />}
					{isError && <AlertCircle className="h-4 w-4 text-orange-500" aria-label="Błąd zapisu" />}
					{saveStatus === "idle" && value === null && (
						// Puste koło (○) — wizualny indicator stanu "nieocenione".
						// role="img" + aria-label — spójne z a11y Biome (span nie wspiera aria-label)
						<span
							role="img"
							aria-label="Nieocenione"
							className="h-4 w-4 rounded-full border-2 border-muted-foreground/30"
						/>
					)}
				</div>
			</div>

			<RatingScale
				value={value}
				name={competencyId}
				ariaLabel={`Poziom kompetencji: ${name}`}
				disabled={disabled}
				onChange={(v) => onChange(competencyId, v)}
			/>

			{/* Błąd autosave — przycisk "Ponów" widoczny tylko w stanie error */}
			{isError && (
				<div className="mt-2 flex items-center gap-2">
					<span className="text-xs text-orange-600">Nie zapisano oceny: «{name}».</span>
					<button
						type="button"
						onClick={() => onRetry(competencyId)}
						className="text-xs font-medium text-orange-700 underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 rounded"
					>
						Ponów
					</button>
				</div>
			)}
		</div>
	);
}
