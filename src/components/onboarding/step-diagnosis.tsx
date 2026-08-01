"use client";

/**
 * StepDiagnosis (A5/1.12) — pod-widok kroku 3 kreatora: test adaptacyjny zamiast
 * samooceny (spec v0.2, Opcja A — decyzja Darka 2026-07-08).
 *
 * Zasady (spec §2.2/§2.4):
 *  - pytanie po pytaniu, ZERO feedbacku w trakcie (odpowiedź „przyjęto + następne"),
 *  - kolejność egzekwuje serwer (staircase) — klient tylko renderuje `question`,
 *  - wynik dopiero po complete: poziomy per kompetencja (1–4),
 *  - kompetencje bez pokrycia w banku (`uncovered`) → jawna mini-samoocena
 *    (te same 3 poziomy co klasyczny krok) — bez udawania pomiaru,
 *  - desynchronizacja/wygaśnięcie sesji (409) → „Wznów test" (start wznawia
 *    zamrożony plan; zmiana zaznaczeń unieważnia sesję po stronie wizarda).
 *
 * UI minimalne/funkcjonalne — Jack restyluje wg makiet Mili.
 */

import { AlertCircle, ChevronRight, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AssessmentResult } from "@/lib/assessment/types";
import type { PlacementScreenContract } from "@/lib/curriculum/placement-screen";
import { type PossessionLevel, possessionLabelsForKind } from "@/lib/onboarding/market-catalog";

/** Pytanie w kształcie odpowiedzi tras /api/assessment (QuestionPayload serwera). */
export interface DiagnosisQuestion {
	itemId: string;
	competencyName: string;
	type: "single_choice" | "multi_choice" | "numeric" | "short_text";
	stem: string;
	options: string[] | null;
	position: number;
	total: number;
}

/** Wynik przekazywany wizardowi po domknięciu (pomiar + samooceny uncovered). */
export interface DiagnosisOutcome {
	result: AssessmentResult;
	uncoveredLevels: Record<string, PossessionLevel>;
	/**
	 * 1E.7 L6: kontrakt sekcji „Po diagnozie" dla kroku 4 (§12.8). Klucz `placement`
	 * jest w odpowiedzi WYŁĄCZNIE wtedy, gdy sekcja ma się renderować — przy zgaszonej
	 * fladze, celu spoza pilotażu, pustej drabinie albo awarii hooka trasa go nie
	 * wysyła (brak klucza, nie `null` w ciele). Dlatego `undefined` przechodzi tędy
	 * nietknięte aż do komponentu, który traktuje je jednoznacznie jako „nie renderuj".
	 *
	 * ⚠ TO JEDYNY NOŚNIK POWODU DZIURY. Powody nie są utrwalane (minimalizacja, L3),
	 * więc po odświeżeniu strony wyjaśnienia nie ma i nie będzie (§12.7 pkt 6) —
	 * świadoma decyzja Sophii, nie defekt do naprawienia przeliczaniem na odczycie.
	 */
	placement?: PlacementScreenContract | null;
}

interface StepDiagnosisProps {
	sessionId: string;
	total: number;
	/** Pierwsze pytanie ze startu (null = wszystko odpowiedziane — od razu complete). */
	initialQuestion: DiagnosisQuestion | null;
	/** Kompetencje bez pokrycia w banku — po teście przechodzą przez mini-samoocenę. */
	uncoveredNames: string[];
	/** Po complete (+ mini-samoocenie): wizard zapisuje onboarding (POST z sessionId). */
	onFinished: (outcome: DiagnosisOutcome) => void;
	/** Ponowny start (wznowienie sesji po 409/desync) — wizard woła /start. */
	onRestart: () => void;
	/** Rezygnacja z testu → powrót do zaznaczeń (sesja zostaje in_progress na serwerze). */
	onBack: () => void;
}

type AnswerDraft = { selected?: number; selectedMulti?: number[]; value?: string };

export function StepDiagnosis({
	sessionId,
	total,
	initialQuestion,
	uncoveredNames,
	onFinished,
	onRestart,
	onBack,
}: StepDiagnosisProps) {
	const [question, setQuestion] = useState<DiagnosisQuestion | null>(initialQuestion);
	const [draft, setDraft] = useState<AnswerDraft>({});
	const [submitting, setSubmitting] = useState(false);
	const [desynced, setDesynced] = useState(false);
	// Faza mini-samooceny uncovered (po complete). null = jeszcze w teście.
	const [result, setResult] = useState<AssessmentResult | null>(null);
	// 1E.7 L6 — kontrakt sekcji „Po diagnozie" z tej samej odpowiedzi co wynik.
	// Trzymany obok `result`, bo obie drogi domknięcia (z mini-samooceną i bez)
	// muszą oddać go wizardowi — inaczej sekcja znika u połowy studentów.
	const [placement, setPlacement] = useState<PlacementScreenContract | null>(null);
	const [uncoveredLevels, setUncoveredLevels] = useState<Record<string, PossessionLevel>>({});

	const answeredCount = question ? question.position : total;

	const isAnswerReady =
		question !== null &&
		((question.type === "single_choice" && draft.selected !== undefined) ||
			(question.type === "multi_choice" && (draft.selectedMulti?.length ?? 0) > 0) ||
			((question.type === "numeric" || question.type === "short_text") &&
				(draft.value ?? "").trim() !== ""));

	async function completeSession() {
		const res = await fetch(`/api/assessment/${sessionId}/complete`, { method: "POST" });
		if (!res.ok) {
			setDesynced(true);
			return;
		}
		// Brak klucza `placement` = sekcja nie istnieje (§12.6 warianty 1–4) — nie
		// odróżniamy tu przyczyny, bo rozstrzygnął ją serwer (§12.8 pkt 1).
		const data = (await res.json()) as {
			result: AssessmentResult;
			placement?: PlacementScreenContract;
		};
		setResult(data.result);
		setPlacement(data.placement ?? null);
		if (uncoveredNames.length === 0) {
			onFinished({ result: data.result, uncoveredLevels: {}, placement: data.placement ?? null });
		}
	}

	async function submitAnswer() {
		if (!question || !isAnswerReady) return;
		const answer: Record<string, unknown> =
			question.type === "single_choice"
				? { selected: draft.selected }
				: question.type === "multi_choice"
					? { selected: draft.selectedMulti }
					: { value: (draft.value ?? "").trim() };

		setSubmitting(true);
		try {
			const res = await fetch(`/api/assessment/${sessionId}/answer`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ questionItemId: question.itemId, answer }),
			});
			if (res.status === 409) {
				// Sesja wygasła / kolejność się rozjechała — wznowienie odtwarza plan.
				setDesynced(true);
				return;
			}
			if (!res.ok) throw new Error("answer_failed");
			const data = (await res.json()) as { done: boolean; question: DiagnosisQuestion | null };
			setDraft({});
			if (data.done) {
				setQuestion(null);
				await completeSession();
			} else {
				setQuestion(data.question);
			}
		} catch {
			toast.error("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
		} finally {
			setSubmitting(false);
		}
	}

	// ── Desync/wygaśnięcie: uczciwy komunikat + wznowienie ──────────────────
	if (desynced) {
		return (
			<div className="rounded-lg border border-ed-amber bg-ed-badge-bg p-6 text-center space-y-4">
				<AlertCircle className="mx-auto h-8 w-8 text-ed-amber-text" />
				<p className="text-sm text-ed-amber-text">
					Test stracił synchronizację z serwerem (np. wygasła sesja albo odpowiedź dotarła
					podwójnie). Wznowienie wraca do właściwego pytania — dotychczasowe odpowiedzi zostają.
				</p>
				<Button onClick={onRestart} className="ob-btn-accent">
					Wznów test
				</Button>
			</div>
		);
	}

	// ── Faza 2: mini-samoocena kompetencji bez pokrycia w banku ─────────────
	if (result && uncoveredNames.length > 0) {
		const labels = possessionLabelsForKind(null);
		return (
			<div className="space-y-5">
				<div className="rounded-lg border border-border bg-card p-4">
					<p className="text-sm text-foreground">
						Test zmierzył {Object.keys(result.competencies).length}{" "}
						{Object.keys(result.competencies).length === 1 ? "kompetencję" : "kompetencji"}. Dla
						poniższych nie mamy jeszcze pytań w banku — <strong>oceń je samodzielnie</strong>{" "}
						(uczciwie oznaczamy je jako samoocenę, nie pomiar).
					</p>
				</div>
				<ul className="space-y-2">
					{uncoveredNames.map((name) => (
						<li key={name} className="rounded-lg border border-border bg-card p-3">
							<span className="mb-2 block text-sm font-medium text-foreground">{name}</span>
							<div className="flex flex-wrap gap-1.5">
								<button
									type="button"
									aria-pressed={uncoveredLevels[name] === undefined}
									onClick={() =>
										setUncoveredLevels((prev) => {
											const next = { ...prev };
											delete next[name];
											return next;
										})
									}
									className={levelBtnClass(uncoveredLevels[name] === undefined)}
								>
									Brak
								</button>
								{labels.map((opt) => (
									<button
										key={opt.level}
										type="button"
										aria-pressed={uncoveredLevels[name] === opt.level}
										title={opt.title}
										onClick={() => setUncoveredLevels((prev) => ({ ...prev, [name]: opt.level }))}
										className={levelBtnClass(uncoveredLevels[name] === opt.level)}
									>
										{opt.label}
									</button>
								))}
							</div>
						</li>
					))}
				</ul>
				<div className="flex justify-end">
					<Button
						onClick={() => onFinished({ result, uncoveredLevels, placement })}
						className="ob-btn-accent gap-2"
					>
						<ClipboardCheck className="h-4 w-4" />
						Zapisz i zobacz wnioski
					</Button>
				</div>
			</div>
		);
	}

	// ── Complete w toku (wszystko odpowiedziane, brak uncovered) ────────────
	if (!question) {
		return (
			<div className="rounded-lg border border-border bg-card p-6 text-center space-y-3" aria-busy>
				<ClipboardCheck className="mx-auto h-8 w-8 text-ed-amber-text animate-pulse" />
				<p className="text-sm text-muted-foreground">Liczymy Twój wynik…</p>
				{/* Wznowiona sesja może wrócić bez pytania (wszystko odpowiedziane) —
				    complete odpala się przyciskiem, nie efektem (idempotentne po 409). */}
				<Button onClick={completeSession} variant="outline">
					Pokaż wynik
				</Button>
			</div>
		);
	}

	// ── Faza 1: pytanie ──────────────────────────────────────────────────────
	return (
		<div className="space-y-5">
			<div className="rounded-lg border border-border bg-card p-4">
				<div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
					<span>
						Pytanie {answeredCount + 1} z {total}
					</span>
					<span className="font-medium">{question.competencyName}</span>
				</div>
				<div className="h-1.5 w-full rounded-full bg-muted">
					<div
						className="ob-progress-fill h-full rounded-full transition-all duration-300"
						style={{ width: `${(answeredCount / total) * 100}%` }}
					/>
				</div>
			</div>

			<fieldset className="m-0 space-y-4 border-0 p-0">
				<legend className="text-base font-medium text-foreground">{question.stem}</legend>

				{question.type === "single_choice" && question.options && (
					<ul className="space-y-2">
						{question.options.map((opt, idx) => (
							<li key={opt}>
								<button
									type="button"
									aria-pressed={draft.selected === idx}
									onClick={() => setDraft({ selected: idx })}
									className={optionBtnClass(draft.selected === idx)}
								>
									{opt}
								</button>
							</li>
						))}
					</ul>
				)}

				{question.type === "multi_choice" && question.options && (
					<>
						<p className="text-xs text-muted-foreground">Możesz zaznaczyć więcej niż jedną.</p>
						<ul className="space-y-2">
							{question.options.map((opt, idx) => {
								const checked = draft.selectedMulti?.includes(idx) ?? false;
								return (
									<li key={opt}>
										<button
											type="button"
											aria-pressed={checked}
											onClick={() =>
												setDraft((prev) => {
													const current = new Set(prev.selectedMulti ?? []);
													if (current.has(idx)) {
														current.delete(idx);
													} else {
														current.add(idx);
													}
													return { selectedMulti: [...current].sort((a, b) => a - b) };
												})
											}
											className={optionBtnClass(checked)}
										>
											{opt}
										</button>
									</li>
								);
							})}
						</ul>
					</>
				)}

				{(question.type === "numeric" || question.type === "short_text") && (
					<Input
						value={draft.value ?? ""}
						onChange={(e) => setDraft({ value: e.target.value })}
						onKeyDown={(e) => {
							if (e.key === "Enter" && isAnswerReady && !submitting) submitAnswer();
						}}
						placeholder={
							question.type === "numeric" ? "Wpisz liczbę (np. 3,14)" : "Wpisz krótką odpowiedź"
						}
						inputMode={question.type === "numeric" ? "decimal" : "text"}
						aria-label="Twoja odpowiedź"
					/>
				)}
			</fieldset>

			<div className="flex items-center justify-between">
				<Button variant="ghost" onClick={onBack}>
					Wróć do zaznaczeń
				</Button>
				<Button
					onClick={submitAnswer}
					disabled={!isAnswerReady || submitting}
					className="ob-btn-accent gap-2"
				>
					{submitting ? "Zapisywanie…" : "Dalej"}
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

function levelBtnClass(selected: boolean): string {
	return [
		"rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
		selected
			? "border-ed-amber bg-ed-amber text-ed-ink"
			: "border-border bg-background text-muted-foreground hover:border-ed-amber hover:bg-ed-badge-bg",
	].join(" ");
}

function optionBtnClass(selected: boolean): string {
	return [
		"w-full rounded-lg border p-3 text-left text-sm transition-colors",
		selected
			? "border-ed-amber bg-ed-badge-bg text-foreground"
			: "border-border bg-card text-foreground hover:border-ed-amber",
	].join(" ");
}
