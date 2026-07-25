"use client";

/**
 * 1E.4 · R6 — maszyna stanów sesji powtórek rozłożonych w czasie (FSRS).
 *
 * Kolejka = CZYSTY ODCZYT (plan §2): brak ekranu potwierdzenia — wchodzimy prosto
 * w pierwsze pytanie (odwrotnie niż egzamin 1E.3, gdzie /start jest efektem
 * ubocznym po kliknięciu). GET /api/review/queue na montażu, potem iteracja
 * LOKALNA (bez zmiany URL — jak ExamRunner: osobne URL kusiłyby „wstecz"), a
 * ocena leci per pytanie do POST /api/review/answer.
 *
 * Ocena FORMUJĄCA (§7): werdykt jawnie automatyczny, nic nie wychodzi jako
 * kredencjał. Copy błędu jest NEUTRALNE, nie karzące — a jego treść pochodzi
 * WPROST z API (feedback.message / feedback.explanation), nie duplikujemy stringów
 * kontraktu na kliencie (jedno źródło prawdy = trasa answer).
 *
 * Świadome decyzje spec Mili (R6) wdrożone:
 *  - werdykt w <output aria-live="polite"> (NIE role="alert" — to nie błąd, tylko
 *    informacja formująca); role="alert" rezerwujemy dla REALNYCH błędów sieci/500,
 *  - fokus programowy: na <h2 tabIndex=-1> po zmianie pytania, na „Dalej" po werdykcie,
 *  - grupa opcji jako <fieldset><legend>{stem}</legend> + radia w <label>,
 *  - pasek postępu role="progressbar" z aria-valuenow/min/max,
 *  - kontrast tylko przez text-foreground / text-muted-foreground i Button default
 *    (bez amber/emerald/rose — zero ryzyka color-contrast w axe),
 *  - BEZ sondy pewności (confidence poza zakresem MVP, MIS.1), BEZ streaków/agregatów.
 *
 * Mapowanie kodów answer (kontrakt R4):
 *  - 409 ConceptNotScheduled → koncept „już nie czeka": auto-przejście do następnego
 *    (transientowa nota nad kolejnym pytaniem), bez błędu,
 *  - 429 DZIENNY cap → reframe na „Koniec sesji" (NIE błąd — student zrobił swoje),
 *  - 429 BURST → „Zwolnij" z retry (wybór zostaje),
 *  - sieć / 500 → „Spróbuj ponownie" (wybór zostaje).
 *
 * ── ROZBIEŻNOŚĆ 429 burst vs dzienny (zgłoszona do Quinn/Ethana) ─────────────
 * Trasa answer (R4) zwraca dla OBU limiterów (reviewAnswer=burst, reviewDaily=cap
 * dobowy) IDENTYCZNE body `{error:"Too many requests"}` przez wspólny
 * rateLimitResponse — jedyny sygnał różnicujący to nagłówek `Retry-After`
 * (okno burst = „1 m" → ≤ 60 s; okno dobowe = „1 d" → duże). Rozróżniamy więc po
 * progu Retry-After. To HEURYSTYKA, nie twardy kontrakt: świadomie NIE zmieniam
 * trasy answer (G9 — nie rozszerzam API poza jeden autoryzowany string copy).
 * Rekomendacja follow-up dla backendu (owner: Max/Ethan): jawny dyskryminator w
 * body 429 (np. `scope: "daily"|"burst"`), wtedy klient zdejmie próg. Dług śpi
 * przy fladze OFF (zero ruchu = zero misklasyfikacji dziś).
 */

import { CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Pytanie powtórki bez klucza — kształt buildReviewQuestionPayload (R4). */
interface ReviewQuestion {
	questionItemId: string;
	type: "single_choice";
	stem: string;
	options: string[];
}

/** Pozycja kolejki „na dziś" — tylko pola potrzebne klientowi (conceptId + pytanie). */
interface QueueEntry {
	conceptId: string;
	question: ReviewQuestion;
}

/** Odpowiedź GET /api/review/queue. */
interface QueueResponse {
	queue: QueueEntry[];
	cap: number;
}

/** Werdykt formujący z POST /api/review/answer — treść WPROST z API (nie duplikujemy). */
interface AnswerFeedback {
	message: string;
	explanation: string | null;
}

interface AnswerOk {
	isCorrect: boolean;
	nextDue: string;
	feedback: AnswerFeedback;
}

type Phase = "loading" | "load-error" | "empty" | "question" | "verdict" | "done";

// Błąd oceny per operacja (osobne flagi — jak ExamRunner 9.1): „network" (sieć/500,
// retry) vs „burst" (429 burst, zwolnij i retry). Dzienny 429 NIE jest błędem —
// przechodzi w fazę „done".
type AnswerError = "network" | "burst" | null;

// Próg Retry-After (sekundy) odróżniający dzienny cap od burstu. Okno burst trasy =
// „1 m" → Retry-After ≤ 60 s; dobowe = „1 d" → wielokrotnie większe. 90 s daje zapas
// nad oknem burst bez ryzyka złapania go jako „dzienny". Patrz nota w nagłówku.
const DAILY_429_THRESHOLD_S = 90;

const DASHBOARD_HREF = "/dashboard";

export function ReviewRunner() {
	const [phase, setPhase] = useState<Phase>("loading");
	const [queue, setQueue] = useState<QueueEntry[]>([]);
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<number | undefined>(undefined);
	const [verdict, setVerdict] = useState<{ isCorrect: boolean; feedback: AnswerFeedback } | null>(
		null,
	);
	const [answering, setAnswering] = useState(false);
	const [answerError, setAnswerError] = useState<AnswerError>(null);
	// Transientowa nota „koncept już nie czeka" (po 409) — pokazana nad KOLEJNYM
	// pytaniem, znika po pierwszej interakcji (wzorzec showResume ExamRunner).
	const [skippedNote, setSkippedNote] = useState(false);

	// Fokus programowy: <h2> po zmianie pytania, „Dalej" po werdykcie.
	const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
	const nextButtonRef = useRef<HTMLButtonElement | null>(null);
	const [questionTick, setQuestionTick] = useState(0);
	const [verdictTick, setVerdictTick] = useState(0);

	// Kolejka na montażu (czysty odczyt, bez ekranu potwierdzenia). Ref-guard chroni
	// przed podwójnym wywołaniem w React StrictMode (dev) — jedno GET na wejście.
	// loadQueue jest odtwarzane co render i celowo NIE wchodzi w deps (efekt montażowy,
	// strzeżony loadedRef) — inaczej kolejka przeładowywałaby się przy każdej zmianie stanu.
	const loadedRef = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: efekt montażowy (jeden raz, strzeżony loadedRef); patrz nota wyżej.
	useEffect(() => {
		if (loadedRef.current) return;
		loadedRef.current = true;
		void loadQueue();
	}, []);

	useEffect(() => {
		if (questionTick === 0) return;
		questionHeadingRef.current?.focus();
	}, [questionTick]);

	useEffect(() => {
		if (verdictTick === 0) return;
		nextButtonRef.current?.focus();
	}, [verdictTick]);

	async function loadQueue() {
		setPhase("loading");
		try {
			const res = await fetch("/api/review/queue");
			if (!res.ok) {
				setPhase("load-error");
				return;
			}
			const data = (await res.json()) as QueueResponse;
			if (!data.queue || data.queue.length === 0) {
				setPhase("empty");
				return;
			}
			setQueue(data.queue);
			setIndex(0);
			setSelected(undefined);
			setVerdict(null);
			setAnswerError(null);
			setSkippedNote(false);
			setPhase("question");
			setQuestionTick((t) => t + 1);
		} catch {
			setPhase("load-error");
		}
	}

	/** Przejście do kolejnego pytania albo domknięcie sesji (gdy to było ostatnie). */
	function goToNext(withSkipNote: boolean) {
		const nextIndex = index + 1;
		if (nextIndex >= queue.length) {
			setPhase("done");
			return;
		}
		setIndex(nextIndex);
		setSelected(undefined);
		setVerdict(null);
		setAnswerError(null);
		setSkippedNote(withSkipNote);
		setPhase("question");
		setQuestionTick((t) => t + 1);
	}

	async function submit() {
		const entry = queue[index];
		if (!entry || selected === undefined || answering) return;
		setAnswering(true);
		setAnswerError(null);
		try {
			const res = await fetch("/api/review/answer", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					conceptId: entry.conceptId,
					questionItemId: entry.question.questionItemId,
					answerIndex: selected,
				}),
			});

			// 409: koncept wypadł z harmonogramu między wczytaniem kolejki a oceną
			// (np. równoległa ocena) — nie błąd, „już nie czeka": idziemy dalej.
			if (res.status === 409) {
				goToNext(true);
				return;
			}

			// 429: dzienny cap → koniec sesji (student zrobił swoje); burst → zwolnij.
			// Rozróżnienie po Retry-After (patrz nota w nagłówku).
			if (res.status === 429) {
				const retryAfter = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
				if (Number.isFinite(retryAfter) && retryAfter > DAILY_429_THRESHOLD_S) {
					setPhase("done");
					return;
				}
				setAnswerError("burst");
				return;
			}

			if (!res.ok) {
				setAnswerError("network");
				return;
			}

			const data = (await res.json()) as AnswerOk;
			setVerdict({ isCorrect: data.isCorrect, feedback: data.feedback });
			setSkippedNote(false);
			setPhase("verdict");
			setVerdictTick((t) => t + 1);
		} catch {
			setAnswerError("network");
		} finally {
			setAnswering(false);
		}
	}

	// Zmiana wyboru czyści transientową notę i ewentualny błąd (nie mylimy sygnałów).
	function pick(i: number) {
		setSelected(i);
		setSkippedNote(false);
		setAnswerError(null);
	}

	// ── Nagłówek formujący (plan §2): to ćwiczenie, nie egzamin ──
	const framing = (
		<header className="flex flex-col gap-1">
			<h1 className="text-2xl font-semibold text-foreground">Powtórki na dziś</h1>
			<p className="text-sm text-muted-foreground">
				To ćwiczenie utrwalające — nie egzamin. Nie wpływa na Twój dyplom ani Paszport.
			</p>
		</header>
	);

	if (phase === "loading") {
		return (
			<div className="flex flex-col gap-5">
				{framing}
				<p className="text-sm text-muted-foreground" aria-live="polite">
					Wczytuję powtórki…
				</p>
			</div>
		);
	}

	if (phase === "load-error") {
		return (
			<div className="flex flex-col gap-5">
				{framing}
				{/* REALNY błąd → role="alert". Kontrast tekstu przez text-foreground/muted. */}
				<section role="alert" className="rounded-xl border border-border bg-card p-5">
					<h2 className="text-base font-semibold text-foreground">
						Nie udało się wczytać powtórek
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Coś się nie połączyło. Spróbuj ponownie — nic nie przepadło.
					</p>
					<div className="mt-4 flex items-center gap-2">
						<Button type="button" onClick={() => void loadQueue()}>
							Spróbuj ponownie
						</Button>
						<Button asChild variant="ghost">
							<Link href={DASHBOARD_HREF}>Wróć do pulpitu</Link>
						</Button>
					</div>
				</section>
			</div>
		);
	}

	if (phase === "empty") {
		return (
			<div className="flex flex-col gap-5">
				{framing}
				<section className="rounded-xl border border-border bg-card p-5">
					<h2 className="text-base font-semibold text-foreground">Nic do powtórzenia</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Wróć jutro — przypomnimy Ci, co warto odświeżyć.
					</p>
					<Button asChild className="mt-4">
						<Link href={DASHBOARD_HREF}>Wróć do pulpitu</Link>
					</Button>
				</section>
			</div>
		);
	}

	if (phase === "done") {
		return (
			<div className="flex flex-col gap-5">
				{framing}
				<section
					aria-labelledby="review-done-heading"
					className="rounded-xl border border-border bg-card p-5"
				>
					<h2
						id="review-done-heading"
						className="flex items-center gap-2 text-base font-semibold text-foreground"
					>
						<CheckCircle2 aria-hidden className="size-5" />
						Koniec sesji
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						To wszystkie powtórki na teraz. Wróć jutro po kolejne — utrwalanie działa najlepiej
						małymi porcjami każdego dnia.
					</p>
					<Button asChild className="mt-4">
						<Link href={DASHBOARD_HREF}>Wróć do pulpitu</Link>
					</Button>
				</section>
			</div>
		);
	}

	// ── Fazy question / verdict: wspólny nagłówek + pasek postępu tego samego pytania ──
	const entry = queue[index];
	if (!entry) return null; // stan przejściowy — nic do pokazania
	const total = queue.length;
	const position = index + 1;
	const question = entry.question;

	return (
		<div className="flex flex-col gap-5">
			{framing}

			<section className="rounded-xl border border-border bg-card p-5">
				{skippedNote && (
					<output className="mb-4 block rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
						Poprzedni koncept już nie czekał na powtórkę — przechodzimy dalej.
					</output>
				)}

				<h2
					ref={questionHeadingRef}
					tabIndex={-1}
					className="text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Powtórka {position} z {total}
				</h2>

				<div
					className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
					aria-valuenow={position}
					aria-valuemin={1}
					aria-valuemax={total}
					aria-label={`Powtórka ${position} z ${total}`}
				>
					<div
						className="h-full rounded-full bg-primary"
						style={{ width: `${total > 0 ? (position / total) * 100 : 0}%` }}
					/>
				</div>

				{phase === "question" && (
					<>
						{/* Grupa opcji: fieldset + legend niosący treść pytania (spec Mili a11y). */}
						<fieldset className="mt-4 border-0 p-0">
							<legend className="text-sm font-medium text-foreground">{question.stem}</legend>
							<div className="mt-4 flex flex-col gap-2">
								{question.options.map((option, i) => (
									<label
										key={option}
										className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
											selected === i
												? "border-primary bg-muted"
												: "border-border bg-background hover:border-primary/40"
										}`}
									>
										<input
											type="radio"
											name={`review-q-${question.questionItemId}`}
											className="mt-0.5"
											checked={selected === i}
											onChange={() => pick(i)}
											disabled={answering}
										/>
										<span className="text-foreground">{option}</span>
									</label>
								))}
							</div>
						</fieldset>

						{answerError === "network" && (
							<p role="alert" className="mt-3 text-sm text-muted-foreground">
								Nie udało się zapisać odpowiedzi. Twój wybór został — spróbuj ponownie.
							</p>
						)}
						{answerError === "burst" && (
							<p role="alert" className="mt-3 text-sm text-muted-foreground">
								Za szybko — chwila przerwy i spróbuj ponownie. Twój wybór został.
							</p>
						)}

						<div className="mt-4">
							<Button
								type="button"
								onClick={() => void submit()}
								disabled={selected === undefined || answering}
							>
								{answering ? "Sprawdzam…" : "Sprawdź"}
							</Button>
						</div>
					</>
				)}

				{phase === "verdict" && verdict && (
					<>
						<p className="mt-4 text-sm font-medium text-foreground">{question.stem}</p>

						{/* Werdykt formujący: <output aria-live="polite"> (NIE role="alert").
						    Treść WPROST z API — nie duplikujemy stringów kontraktu. Kontrast
						    przez text-foreground/muted (bez emerald/rose → axe czysty). */}
						<output
							aria-live="polite"
							className="mt-4 block rounded-lg border border-border bg-muted p-4"
						>
							<span className="flex items-center gap-2 text-sm font-medium text-foreground">
								{verdict.isCorrect ? (
									<CheckCircle2 aria-hidden className="size-4" />
								) : (
									<RefreshCw aria-hidden className="size-4" />
								)}
								{verdict.feedback.message}
							</span>
							{verdict.feedback.explanation && (
								<span className="mt-2 block text-sm text-muted-foreground">
									{verdict.feedback.explanation}
								</span>
							)}
						</output>

						<div className="mt-4">
							<Button ref={nextButtonRef} type="button" onClick={() => goToNext(false)}>
								{position >= total ? "Zakończ sesję" : "Dalej"}
							</Button>
						</div>
					</>
				)}
			</section>
		</div>
	);
}
