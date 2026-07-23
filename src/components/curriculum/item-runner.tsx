"use client";

/**
 * 1E.6a — pętla pytań pozycji curriculum (theory/exercise).
 *
 * Zasady (ADR-014 / R13):
 *  - błędna odpowiedź NIE jest stanem końcowym: nielimitowane próby, feedback
 *    natychmiast (feedback wybranej opcji + wyjaśnienie z trasy `answer`),
 *  - zaliczenie pozycji = WSZYSTKIE pytania odpowiedziane poprawnie (licznik,
 *    nie procent) — liczy to serwer i zwraca `itemCompleted`,
 *  - podpowiedzi odsłaniane krok po kroku PRZEZ SERWER (ADR-018): przycisk woła
 *    `POST …/hint`, głębokość i znacznik czasu stawia serwer; klient renderuje
 *    tylko to, co wróciło. Głębokość NIE jest już stanem komponentu.
 *
 * Klient NIE zna klucza odpowiedzi — ocena jest po stronie serwera.
 */

import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TheoryMarkdown } from "@/components/skillbridge/b3/TheoryMarkdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CurriculumQuestion } from "@/lib/curriculum/item-view";

interface ItemRunnerProps {
	itemId: string;
	moduleId: string;
	questions: CurriculumQuestion[];
	/** Pytania już zaliczone — pętla ich nie powtarza. */
	answeredCorrectQuestionIds: string[];
	/** ADR-018 — podpowiedzi JUŻ przyznane serwerowo, per pytanie (po wejściu/odświeżeniu). */
	hintsByQuestion: Record<string, string[]>;
	/** Liczba dostępnych podpowiedzi do napisu „(n/total)". */
	hintsTotal: number;
	/** Status pozycji przy wejściu (completed → od razu panel „zaliczona"). */
	initialStatus: string;
	/** MIS.1 — flaga confidenceProbe czytana w server component (deploy ≠ release);
	 *  true = przed „Sprawdź" obowiązkowa deklaracja pewności (1–3). */
	confidenceProbeEnabled: boolean;
}

interface AnswerFeedback {
	correct: boolean;
	explanationMd: string | null;
	optionFeedbackMd: string | null;
}

type Draft = { selected?: number; selectedMulti?: number[]; value?: string };

export function ItemRunner({
	itemId,
	moduleId,
	questions,
	answeredCorrectQuestionIds,
	hintsByQuestion,
	hintsTotal,
	initialStatus,
	confidenceProbeEnabled,
}: ItemRunnerProps) {
	const solved = new Set(answeredCorrectQuestionIds);
	const pending = questions.filter((q) => !solved.has(q.id));

	const [index, setIndex] = useState(0);
	const [draft, setDraft] = useState<Draft>({});
	const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
	const [submitting, setSubmitting] = useState(false);
	// ADR-018 — odsłonięte podpowiedzi per pytanie (start = przyznane serwerowo).
	// Głębokość liczy serwer; klient trzyma tylko TREŚĆ do wyświetlenia.
	const [revealed, setRevealed] = useState<Record<string, string[]>>(hintsByQuestion);
	const [hintLoading, setHintLoading] = useState(false);
	const [hintError, setHintError] = useState<string | null>(null);
	// MIS.1 — pewność deklarowana PRZED sprawdzeniem; null = jeszcze nie wybrana.
	const [confidence, setConfidence] = useState<1 | 2 | 3 | null>(null);
	const [completed, setCompleted] = useState(
		initialStatus === "completed" || initialStatus === "skipped_by_placement",
	);
	const [moduleCompleted, setModuleCompleted] = useState(false);
	const router = useRouter();

	const question = pending[index] ?? null;
	const answeredCount = questions.length - pending.length + index;

	const isAnswerReady =
		question !== null &&
		((question.type === "single_choice" && draft.selected !== undefined) ||
			(question.type === "multi_choice" && (draft.selectedMulti?.length ?? 0) > 0) ||
			((question.type === "numeric" || question.type === "short_text") &&
				(draft.value ?? "").trim() !== "")) &&
		// MIS.1: bez deklaracji pewności „Sprawdź" nie rusza (obowiązkowa przy fladze).
		(!confidenceProbeEnabled || confidence !== null);

	function updateDraft(next: Draft) {
		setDraft(next);
		// Zmiana zaznaczenia = nowa próba: stary feedback znika (nie myli studenta).
		setFeedback(null);
	}

	async function submitAnswer() {
		if (!question || !isAnswerReady || submitting) return;
		const answer: Record<string, unknown> =
			question.type === "single_choice"
				? { selected: draft.selected }
				: question.type === "multi_choice"
					? { selected: draft.selectedMulti }
					: { value: (draft.value ?? "").trim() };

		setSubmitting(true);
		try {
			const res = await fetch(`/api/curriculum/items/${itemId}/answer`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					questionItemId: question.id,
					answer,
					// ADR-018: głębokość NIE jedzie już z klienta — liczy ją serwer z magazynu.
					...(confidenceProbeEnabled && confidence !== null ? { confidence } : {}),
				}),
			});
			if (res.status === 403) {
				toast.error("Ta pozycja jest zablokowana.");
				router.refresh();
				return;
			}
			if (!res.ok) throw new Error("answer_failed");
			const data = (await res.json()) as AnswerFeedback & {
				itemCompleted: boolean;
				moduleCompleted: boolean;
			};
			setFeedback({
				correct: data.correct,
				explanationMd: data.explanationMd,
				optionFeedbackMd: data.optionFeedbackMd,
			});
			if (data.itemCompleted) {
				setCompleted(true);
				setModuleCompleted(data.moduleCompleted);
				router.refresh();
			}
		} catch {
			toast.error("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
		} finally {
			setSubmitting(false);
		}
	}

	function nextQuestion() {
		setFeedback(null);
		setDraft({});
		setHintError(null);
		setConfidence(null);
		setIndex((i) => i + 1);
	}

	// ADR-018 — odsłonięcie kolejnej podpowiedzi: serwer inkrementuje głębokość
	// i zwraca treść do przyznanego poziomu. 429 → osobny komunikat po polsku
	// (nie cicha cisza); klient nie liczy głębokości sam.
	async function revealHint(questionId: string) {
		if (hintLoading) return;
		setHintLoading(true);
		setHintError(null);
		try {
			const res = await fetch(`/api/curriculum/items/${itemId}/hint`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ questionItemId: questionId }),
			});
			if (res.status === 429) {
				setHintError("Za dużo podpowiedzi naraz — poczekaj chwilę i spróbuj ponownie.");
				return;
			}
			if (res.status === 403) {
				toast.error("Ta pozycja jest zablokowana.");
				router.refresh();
				return;
			}
			if (!res.ok) throw new Error("hint_failed");
			const data = (await res.json()) as { depth: number; hints: string[]; hasMore: boolean };
			setRevealed((prev) => ({ ...prev, [questionId]: data.hints }));
		} catch {
			setHintError("Nie udało się wczytać podpowiedzi. Spróbuj ponownie.");
		} finally {
			setHintLoading(false);
		}
	}

	if (questions.length === 0) return null;

	if (completed) {
		return (
			<section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
				<h2 className="flex items-center gap-2 text-base font-semibold text-emerald-900">
					<CheckCircle2 aria-hidden className="size-5" />
					Pozycja zaliczona
				</h2>
				<p className="mt-1 text-sm text-emerald-900">
					{moduleCompleted
						? "Ukończyłeś(-aś) też cały moduł — kolejny moduł drabiny jest już otwarty."
						: "Kolejna pozycja modułu jest już otwarta."}
				</p>
				<Link
					href={`/curriculum/${moduleId}`}
					className="mt-3 inline-block text-sm font-medium text-emerald-800 underline underline-offset-2"
				>
					Wróć do modułu
				</Link>
			</section>
		);
	}

	if (!question) {
		// Wszystkie pytania z tej sesji odpowiedziane, a pozycja wciąż nie zaliczona
		// (np. część pytań zaliczona wcześniej, reszta wymaga odświeżenia).
		return (
			<section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
				Brak pytań do rozwiązania w tej pozycji.
			</section>
		);
	}

	// ADR-018 — do klienta docierają WYŁĄCZNIE podpowiedzi już odsłonięte serwerowo
	// (z propsa `hintsByQuestion` + dopisane przez `revealHint`); nieodsłonięte
	// nie ma prawa być w payloadzie strony. Głębokość liczy serwer, nie ten komponent.
	const visibleHints = revealed[question.id] ?? [];
	const revealedCount = visibleHints.length;

	return (
		<section className="rounded-xl border border-border bg-card p-5">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold text-foreground">Sprawdź się</h2>
				<span className="text-xs text-muted-foreground">
					Pytanie {answeredCount + 1} z {questions.length}
				</span>
			</div>

			<p className="mt-3 text-sm font-medium text-foreground">{question.stem}</p>

			{question.type === "single_choice" && question.options && (
				<div className="mt-4 flex flex-col gap-2">
					{question.options.map((option, i) => (
						<label
							key={option}
							className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
								draft.selected === i
									? "border-emerald-400 bg-emerald-50"
									: "border-border bg-background hover:border-emerald-200"
							}`}
						>
							<input
								type="radio"
								name={`q-${question.id}`}
								className="mt-0.5"
								checked={draft.selected === i}
								onChange={() => updateDraft({ selected: i })}
							/>
							<span className="text-foreground">{option}</span>
						</label>
					))}
				</div>
			)}

			{question.type === "multi_choice" && question.options && (
				<div className="mt-4 flex flex-col gap-2">
					{question.options.map((option, i) => {
						const checked = draft.selectedMulti?.includes(i) ?? false;
						return (
							<label
								key={option}
								className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
									checked
										? "border-emerald-400 bg-emerald-50"
										: "border-border bg-background hover:border-emerald-200"
								}`}
							>
								<input
									type="checkbox"
									className="mt-0.5"
									checked={checked}
									onChange={() => {
										const current = draft.selectedMulti ?? [];
										updateDraft({
											selectedMulti: checked
												? current.filter((v) => v !== i)
												: [...current, i].sort((a, b) => a - b),
										});
									}}
								/>
								<span className="text-foreground">{option}</span>
							</label>
						);
					})}
				</div>
			)}

			{(question.type === "numeric" || question.type === "short_text") && (
				<Input
					className="mt-4"
					aria-label="Twoja odpowiedź"
					value={draft.value ?? ""}
					onChange={(e) => updateDraft({ value: e.target.value })}
				/>
			)}

			{hintsTotal > 0 && (
				// aria-live: podpowiedź pojawia się asynchronicznie (po odpowiedzi serwera),
				// więc czytnik ekranu ma ją ogłosić — inaczej pojawiłaby się bez zapowiedzi.
				<div className="mt-4" aria-live="polite">
					{/* W-8b (Ryan) — informacja o zapisie odsłonięć: obecna od pierwszego
					    renderu przycisku. Treść: Sophia (PO); do czasu jej wersji — z §4.2 sign-offu. */}
					<p className="mb-2 text-xs text-muted-foreground">
						Odsłonięcie podpowiedzi zapisujemy — służy do doboru powtórek, nie do oceny. Wykładowca
						tego nie widzi.
					</p>
					{visibleHints.map((hint) => (
						<div
							key={hint}
							className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
						>
							<TheoryMarkdown source={hint} />
						</div>
					))}
					{revealedCount < hintsTotal && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={hintLoading}
							onClick={() => revealHint(question.id)}
						>
							<Lightbulb aria-hidden className="size-4" />
							{hintLoading ? "Wczytuję…" : `Pokaż podpowiedź (${revealedCount + 1}/${hintsTotal})`}
						</Button>
					)}
					{hintError && <p className="mt-1 text-xs text-rose-700">{hintError}</p>}
				</div>
			)}

			{confidenceProbeEnabled && (
				// MIS.1 — sonda pewności PRZED sprawdzeniem (3 przyciski zamiast
				// suwaka: mniejsze tarcie na mobile, jednoznaczne progi do analiz).
				// Wybór można zmienić do momentu „Sprawdź"; przy kolejnej próbie
				// tego samego pytania deklaracja zostaje — student może ją poprawić.
				<fieldset className="mt-4">
					<legend className="text-sm font-medium text-foreground">
						Jak pewny(-a) jesteś tej odpowiedzi?
					</legend>
					<div className="mt-2 flex flex-wrap gap-2">
						{(
							[
								[1, "Zgaduję"],
								[2, "Chyba wiem"],
								[3, "Jestem pewny(-a)"],
							] as const
						).map(([value, label]) => (
							<button
								key={value}
								type="button"
								aria-pressed={confidence === value}
								onClick={() => setConfidence(value)}
								className={`rounded-lg border px-3 py-1.5 text-sm transition ${
									confidence === value
										? "border-emerald-400 bg-emerald-50 font-medium text-emerald-900"
										: "border-border bg-background text-foreground hover:border-emerald-200"
								}`}
							>
								{label}
							</button>
						))}
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						Szczera odpowiedź pomaga Ci skalibrować, co już umiesz — nie wpływa na wynik.
					</p>
				</fieldset>
			)}

			{feedback && (
				// <output> = natywny „status" (a11y): czytnik ekranu ogłasza feedback
				// bez przenoszenia fokusu — student od razu wie, czy trafił.
				<output
					className={`mt-4 block rounded-lg border p-3 text-sm ${
						feedback.correct
							? "border-emerald-200 bg-emerald-50 text-emerald-900"
							: "border-rose-200 bg-rose-50 text-rose-900"
					}`}
				>
					<p className="flex items-center gap-2 font-medium">
						{feedback.correct ? (
							<>
								<CheckCircle2 aria-hidden className="size-4" /> Dobrze
							</>
						) : (
							<>
								<XCircle aria-hidden className="size-4" /> Jeszcze nie — spróbuj ponownie
							</>
						)}
					</p>
					{feedback.optionFeedbackMd && <TheoryMarkdown source={feedback.optionFeedbackMd} />}
					{feedback.correct && feedback.explanationMd && (
						<TheoryMarkdown source={feedback.explanationMd} />
					)}
				</output>
			)}

			<div className="mt-4 flex items-center gap-2">
				{feedback?.correct ? (
					<Button type="button" onClick={nextQuestion}>
						Dalej
					</Button>
				) : (
					<Button type="button" onClick={submitAnswer} disabled={!isAnswerReady || submitting}>
						{submitting ? "Sprawdzam…" : "Sprawdź"}
					</Button>
				)}
				<span className="text-xs text-muted-foreground">
					Błędna odpowiedź nic nie psuje — próbuj do skutku.
				</span>
			</div>
		</section>
	);
}
