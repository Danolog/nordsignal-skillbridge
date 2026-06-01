"use client";

/**
 * StepSelfAssessment — krok 4/5 onboardingu (B4 samoocena kompetencji).
 *
 * Architektura stanów zgodna ze spec §3.4:
 *   S1 loading → S2 error_load → S3 empty_start → S4 in_progress → S5 threshold_met
 *   S6 error_save_row (per wiersz, reszta działa) → S7 error_submit → S8 done
 *
 * Autosave per pozycja (PATCH debounce 400 ms), próg ≥ requiredCount z backendu.
 * R1: Callout wyraźnie komunikuje prywatność samooceny (niewidoczna wykładowcy).
 * Brak afordancji "pokaż wykładowcy" — R1=NIE (Darek 2026-05-27).
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §3
 * Golden: skills/design/golden-samoocena.md (wzorzec stanów i autosave)
 */

import { AlertCircle, Info, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	CompetencyRatingRow,
	type SaveStatus,
} from "@/components/skillbridge/b4/CompetencyRatingRow";
import type { RatingValue } from "@/components/skillbridge/b4/RatingScale";
import { Button } from "@/components/ui/button";

// Typy danych z GET /api/self-assessment
interface AssessmentCompetency {
	competencyId: string;
	name: string;
	level: RatingValue | null;
}

interface AssessmentData {
	assessmentId: string;
	status: "draft" | "submitted";
	requiredCount: number;
	competencies: AssessmentCompetency[];
}

// Stan lokalny per wiersz: level + saveStatus
interface RowState {
	level: RatingValue | null;
	saveStatus: SaveStatus;
}

type RowStateMap = Record<string, RowState>;

interface StepSelfAssessmentProps {
	onAdvance: () => void; // callback po pomyślnym advance (krok → 5)
	onSkip: () => void; // "Oceń później"
}

export function StepSelfAssessment({ onAdvance, onSkip }: StepSelfAssessmentProps) {
	const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
	const [data, setData] = useState<AssessmentData | null>(null);
	const [rowStates, setRowStates] = useState<RowStateMap>({});
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	// debounce timers per competencyId
	const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
	// retry timers (2s, 5s) per competencyId
	const retryTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

	// ─── Wczytanie danych ───────────────────────────────────────────────────
	const loadAssessment = useCallback(async () => {
		setLoadState("loading");
		try {
			const res = await fetch("/api/self-assessment");
			if (!res.ok) throw new Error("load_failed");
			const json = (await res.json()) as AssessmentData;
			setData(json);
			// Inicjalizacja stanu wierszy z danych (wczytanie draftu)
			const initial: RowStateMap = {};
			for (const c of json.competencies) {
				initial[c.competencyId] = {
					level: c.level,
					saveStatus: c.level !== null ? "saved" : "idle",
				};
			}
			setRowStates(initial);
			setLoadState("ready");
		} catch {
			setLoadState("error");
		}
	}, []);

	useEffect(() => {
		loadAssessment();
	}, [loadAssessment]);

	// ─── Autosave per wiersz ────────────────────────────────────────────────
	const saveRow = useCallback(
		async (competencyId: string, level: RatingValue, attempt = 1) => {
			try {
				const res = await fetch(`/api/self-assessment/ratings/${competencyId}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ level }),
				});
				if (!res.ok) throw new Error("save_failed");
				setRowStates((prev) => ({
					...prev,
					[competencyId]: { level, saveStatus: "saved" },
				}));
			} catch {
				if (attempt < 3) {
					// Ciche retry: próba 2 po 2s, próba 3 po 5s (spec S6)
					const delay = attempt === 1 ? 2000 : 5000;
					retryTimers.current[competencyId] = setTimeout(() => {
						saveRow(competencyId, level, attempt + 1);
					}, delay);
				} else {
					// Po 3 próbach: stan error, Toast warning
					setRowStates((prev) => ({
						...prev,
						[competencyId]: { level, saveStatus: "error" },
					}));
					const name =
						data?.competencies.find((c) => c.competencyId === competencyId)?.name ?? competencyId;
					toast.warning(`Nie zapisano oceny: «${name}». Ponów.`);
				}
			}
		},
		[data],
	);

	const handleChange = useCallback(
		(competencyId: string, value: RatingValue) => {
			// Natychmiast aktualizuj UI (optimistic)
			setRowStates((prev) => ({
				...prev,
				[competencyId]: { level: value, saveStatus: "saving" },
			}));

			// Debounce 400 ms (spec §3.5)
			clearTimeout(debounceTimers.current[competencyId]);
			debounceTimers.current[competencyId] = setTimeout(() => {
				saveRow(competencyId, value);
			}, 400);
		},
		[saveRow],
	);

	const handleRetry = useCallback(
		(competencyId: string) => {
			const level = rowStates[competencyId]?.level;
			if (level === null || level === undefined) return;
			setRowStates((prev) => ({
				...prev,
				[competencyId]: { level, saveStatus: "saving" },
			}));
			saveRow(competencyId, level);
		},
		[rowStates, saveRow],
	);

	// ─── Advance (krok 4 → 5) ───────────────────────────────────────────────
	const handleAdvance = async () => {
		setSubmitError(null);
		setSubmitting(true);
		try {
			const res = await fetch("/api/onboarding/advance", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fromStep: 4, toStep: 5 }),
			});
			if (res.status === 422) {
				const json = (await res.json()) as { missing?: number };
				const missing = json.missing ?? 0;
				setSubmitError(`Oceń jeszcze ${missing} kompetencji.`);
				setSubmitting(false);
				return;
			}
			if (!res.ok) throw new Error("advance_failed");
			onAdvance();
		} catch {
			setSubmitError(
				"Nie udało się przejść dalej. Twoje odpowiedzi są zapisane — spróbuj ponownie.",
			);
			setSubmitting(false);
		}
	};

	// ─── Obliczenia stanu ────────────────────────────────────────────────────
	const competencyList = data?.competencies ?? [];
	const requiredCount = data?.requiredCount ?? 5;
	const total = competencyList.length;

	const ratedCount = competencyList.filter(
		(c) => (rowStates[c.competencyId]?.level ?? null) !== null,
	).length;

	const hasErrorRow = Object.values(rowStates).some((r) => r.saveStatus === "error");
	const thresholdMet = ratedCount >= requiredCount;
	const canAdvance = thresholdMet && !hasErrorRow && !submitting;

	const remaining = Math.max(0, requiredCount - ratedCount);

	// ─── Render stanów ────────────────────────────────────────────────────────

	// S1 — ładowanie
	if (loadState === "loading") {
		return (
			<div className="space-y-4">
				{/* Skeleton: placeholder Callout + 6 wierszy */}
				<div className="h-16 rounded-lg bg-muted animate-pulse" />
				<div className="h-6 w-48 rounded bg-muted animate-pulse" />
				{Array.from({ length: 6 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: szkielet ładowania, kolejność stała
					<div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
				))}
			</div>
		);
	}

	// S2 — błąd ładowania
	if (loadState === "error") {
		return (
			<div className="rounded-lg border border-border bg-card p-6 text-center space-y-4">
				<AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Nie udało się wczytać kompetencji.</p>
				<Button variant="outline" onClick={loadAssessment}>
					Spróbuj ponownie
				</Button>
			</div>
		);
	}

	// S3/S4/S5 — widok roboczy
	return (
		<div className="space-y-4">
			{/* Callout R1 + HITL — statyczny (nie z LLM), niedismisowalny (spec §3.2) */}
			<div
				className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
				role="note"
				aria-label="Informacja o prywatności samooceny"
			>
				<Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" aria-hidden="true" />
				<p className="text-sm text-blue-800">
					<strong>To Twoja własna deklaracja, nie ocena.</strong> Jest prywatna — widzisz ją tylko
					Ty, wykładowca jej nie widzi. Możesz wracać i zmieniać oceny.
				</p>
			</div>

			{/* ProgressCounter — "Ocenione: X z N" */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						Ocenione: <strong className="text-foreground">{ratedCount}</strong> z {total}
					</span>
					{ratedCount === 0 && (
						<span className="text-xs text-muted-foreground">
							Zacznij od dowolnej — kolejność nie ma znaczenia.
						</span>
					)}
				</div>
				{/* Pasek postępu */}
				<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
					<div
						className="h-full rounded-full bg-indigo-500 transition-all duration-300"
						style={{ width: total > 0 ? `${(ratedCount / total) * 100}%` : "0%" }}
						role="progressbar"
						aria-valuenow={ratedCount}
						aria-valuemin={0}
						aria-valuemax={total}
						aria-label={`Ocenione ${ratedCount} z ${total} kompetencji`}
					/>
				</div>
			</div>

			{/* Lista kompetencji */}
			<div className="space-y-3">
				{competencyList.map((c) => {
					const rs = rowStates[c.competencyId] ?? { level: null, saveStatus: "idle" as SaveStatus };
					return (
						<CompetencyRatingRow
							key={c.competencyId}
							competencyId={c.competencyId}
							name={c.name}
							value={rs.level}
							saveStatus={rs.saveStatus}
							disabled={submitting}
							onChange={handleChange}
							onRetry={handleRetry}
						/>
					);
				})}
			</div>

			{/* Błąd submitu — InlineAlert (S7) */}
			{submitError && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"
					aria-live="polite"
				>
					<AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
					<span className="text-sm text-destructive">{submitError}</span>
				</div>
			)}

			{/* Stopka akcji (sticky) */}
			<div className="sticky bottom-0 bg-background/95 backdrop-blur pt-3 pb-1 -mx-1 px-1 border-t border-border mt-4">
				{/* Tekst pomocniczy */}
				<p className="text-xs text-muted-foreground text-center mb-3">
					{thresholdMet
						? "Możesz przejść dalej — albo oceń więcej."
						: remaining > 0
							? `Oceń jeszcze ${remaining}, żeby przejść dalej.`
							: ""}
				</p>
				<div className="flex items-center justify-between gap-3">
					<Button variant="ghost" onClick={onSkip} disabled={submitting} className="gap-2">
						Oceń później
					</Button>
					<Button onClick={handleAdvance} disabled={!canAdvance} className="gap-2">
						{submitting ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Przechodzę…
							</>
						) : (
							"Idź dalej"
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
