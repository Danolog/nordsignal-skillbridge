"use client";

/**
 * 1E.3 · P5 — Ekrany 2–4: maszyna stanów egzaminu modułowego.
 *
 * Jeden komponent obsługuje S1→R1–R6→W1–W3 (wzorzec 1:1 z ItemRunner: stan
 * lokalny, brak zmiany URL między pytaniami — serwer i tak nie pozwala się
 * cofnąć, osobne URL kusiłyby „wstecz" → 409). Buduję PRZECIW kontraktowi
 * `src/lib/exam/contract.ts` (backend P4.5 na osobnej gałęzi, integracja po
 * merge). Klient NIE zna klucza — werdykt dopiero z `complete`.
 *
 * Świadome decyzje spec Mili wdrożone:
 *  - `/start` DOPIERO po kliknięciu (rozdz. 4) — brak efektu ubocznego na wejściu,
 *  - zaznaczona opcja = sky, nie emerald (5.1) — brak fałszywego sygnału „dobrze",
 *  - jawny klik „Zakończ egzamin i zobacz wynik" (R5, 5.4) — nie auto-complete,
 *  - osobne flagi błędu per operacja (9.1) — R3 nie nadpisuje S3,
 *  - obsługa 423 correctives_required z `/start` (Sophia D2) — Ekran 5, bez retry,
 *  - ikony wyniku niosące WAGĘ zdarzenia: W1 emerald, W2 muted, W3 sky (6.1–6.3).
 */

import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CorrectivesPanel } from "@/components/curriculum/exam/correctives-panel";
import { Button } from "@/components/ui/button";
import {
	type CorrectivesPackage,
	distanceToPass,
	pytaniaPoZabraklo,
} from "@/lib/assessment/correctives";
import type { ExamResultJson } from "@/lib/assessment/exam";
import {
	type ExamAnswerOk,
	type ExamCompleteOk,
	type ExamQuestion,
	type ExamStartOk,
	isCorrectivesRequired,
} from "@/lib/exam/contract";

interface ExamRunnerProps {
	moduleId: string;
	moduleTitle: string;
}

type Phase = "confirm" | "running" | "closing" | "result";
// `correctives_unavailable`: 423 S-C (twarda blokada), ale paczka correctives
// niedostępna (stan zdegradowany) — komunikat BEZ retry, NIE mylony z „network".
type StartError = "not_configured" | "network" | "conflict" | "correctives_unavailable" | null;
type AnswerError = "network" | "conflict" | null;

const BACK_PREFIX = "/curriculum";

// UWAGA (rozjazd kontraktu Mili 9.1): spec nazywa prop „moduleSlugForBack", ale
// trasy modułu/pozycji są UUID-routowane (guard isUuid → notFound na slug).
// Nawigacja „Wróć do modułu"/retry używa więc moduleId (UUID), nie sluga —
// slug jest potrzebny WYŁĄCZNIE w trasie-resolverze atomów. Zgłoszone w raporcie.
export function ExamRunner({ moduleId, moduleTitle }: ExamRunnerProps) {
	const router = useRouter();
	const backHref = `${BACK_PREFIX}/${moduleId}`;
	const retryHref = `${BACK_PREFIX}/${moduleId}/exam`;

	const [phase, setPhase] = useState<Phase>("confirm");
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [total, setTotal] = useState(0);
	const [question, setQuestion] = useState<ExamQuestion | null>(null);
	const [selected, setSelected] = useState<number | undefined>(undefined);
	const [showResume, setShowResume] = useState(false);
	const [result, setResult] = useState<ExamResultJson | null>(null);
	// 423 z /start (S-C) — Ekran 5 z twardą blokadą retry (Sophia D2).
	const [gatePkg, setGatePkg] = useState<CorrectivesPackage | null>(null);

	// Osobne flagi per operacja (Mila 9.1) — R3 nie nadpisuje S3 itd.
	const [starting, setStarting] = useState(false);
	const [answering, setAnswering] = useState(false);
	const [completing, setCompleting] = useState(false);
	const [startError, setStartError] = useState<StartError>(null);
	const [answerError, setAnswerError] = useState<AnswerError>(null);
	const [completeError, setCompleteError] = useState(false);

	// D-a11y-1 (wzorzec ItemRunner): po wejściu nowego pytania fokus na jego <h2>.
	const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
	const [questionTick, setQuestionTick] = useState(0);
	useEffect(() => {
		if (questionTick === 0) return;
		questionHeadingRef.current?.focus();
	}, [questionTick]);

	function applyStartOk(data: ExamStartOk) {
		if (!data.question) {
			// Świeży start bez pytania = bank pusty/niespójny — traktuj jak błąd startu.
			setStartError("network");
			return;
		}
		setSessionId(data.sessionId);
		setTotal(data.total);
		setQuestion(data.question);
		setSelected(undefined);
		setShowResume(data.resumed);
		setPhase("running");
		setQuestionTick((t) => t + 1);
	}

	async function start() {
		if (starting) return;
		setStarting(true);
		setStartError(null);
		setGatePkg(null);
		try {
			const res = await fetch("/api/exam/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ moduleId }),
			});
			if (res.status === 423) {
				// S-C: correctives obowiązkowe — Ekran 5 z paczki, bez retry (D2).
				const body: unknown = await res.json();
				if (isCorrectivesRequired(body)) {
					setGatePkg(body.correctivesPackage);
					return;
				}
				// 423 to WYŁĄCZNIE correctives_required (jedyne źródło 423 na /start), ale
				// bez ważnej paczki (stan zdegradowany: brak correctivesPackage w result_json).
				// To NADAL twarda blokada — NIE „network" z retry (ponowienie da ten sam 423).
				setStartError("correctives_unavailable");
				return;
			}
			if (res.status === 422) {
				setStartError("not_configured");
				return;
			}
			if (res.status === 409) {
				setStartError("conflict");
				return;
			}
			if (!res.ok) {
				setStartError("network");
				return;
			}
			applyStartOk((await res.json()) as ExamStartOk);
		} catch {
			setStartError("network");
		} finally {
			setStarting(false);
		}
	}

	async function submit() {
		if (!question || sessionId === null || selected === undefined || answering) return;
		setAnswering(true);
		setAnswerError(null);
		try {
			const res = await fetch(`/api/exam/${sessionId}/answer`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ slotRef: question.slotRef, answer: { selected } }),
			});
			if (res.status === 409) {
				setAnswerError("conflict");
				return;
			}
			if (!res.ok) {
				setAnswerError("network");
				return;
			}
			const data = (await res.json()) as ExamAnswerOk;
			setShowResume(false); // baner „wracasz" znika po pierwszej interakcji (Mila 5.1).
			if (data.done || !data.question) {
				setQuestion(null);
				setPhase("closing"); // R5 — jawne domknięcie, nie auto-complete.
				return;
			}
			setQuestion(data.question);
			setSelected(undefined);
			setQuestionTick((t) => t + 1);
		} catch {
			setAnswerError("network");
		} finally {
			setAnswering(false);
		}
	}

	async function complete() {
		if (sessionId === null || completing) return;
		setCompleting(true);
		setCompleteError(false);
		try {
			const res = await fetch(`/api/exam/${sessionId}/complete`, { method: "POST" });
			if (!res.ok) {
				setCompleteError(true);
				return;
			}
			const data = (await res.json()) as ExamCompleteOk;
			setResult(data.result);
			setPhase("result");
		} catch {
			setCompleteError(true);
		} finally {
			setCompleting(false);
		}
	}

	// ── Ekran 5 z /start (S-C, 423): twarda blokada — brak retry, tylko powrót. ──
	if (gatePkg) {
		return <CorrectivesPanel pkg={gatePkg} backHref={backHref} />;
	}

	// ── Ekran 2: przed startem (S1) + błędy startu S2/S3/S4 ──
	if (phase === "confirm") {
		return (
			<div className="flex flex-col gap-5">
				<Link
					href={backHref}
					className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft aria-hidden className="size-4" />
					Wróć do modułu
				</Link>

				<header>
					<h1 className="text-2xl font-semibold text-foreground">Egzamin: {moduleTitle}</h1>
				</header>

				{/* Karta neutralna (bg-muted) — NIE amber: to informacja, nie ostrzeżenie o błędzie. */}
				<section
					aria-labelledby="exam-confirm-heading"
					className="rounded-xl border border-border bg-muted p-5"
				>
					<h2 id="exam-confirm-heading" className="text-base font-semibold text-foreground">
						Zarezerwuj ~25 minut
					</h2>
					<ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
						<li>15 pytań, jedno po drugim — bez cofania się do poprzednich.</li>
						<li>
							Możesz wyjść w trakcie — wracasz dokładnie tam, gdzie skończyłeś(-aś), z tymi samymi
							pytaniami.
						</li>
						<li>
							Masz maksymalnie 2 podejścia. Po 2. nieudanym dostaniesz konkretną listę tematów do
							powtórki.
						</li>
					</ul>
				</section>

				{startError === "not_configured" && (
					<StartErrorNoRetry backHref={backHref}>
						Ten moduł nie ma jeszcze gotowego egzaminu. Wróć do modułu — dogonimy Cię, gdy będzie
						gotowy.
					</StartErrorNoRetry>
				)}
				{startError === "correctives_unavailable" && (
					<StartErrorNoRetry backHref={backHref}>
						Nie możemy teraz rozpocząć tej próby — brakuje danych potrzebnych do jej przygotowania.
						Skontaktuj się z prowadzącym lub wsparciem, żeby to odblokować.
					</StartErrorNoRetry>
				)}
				{startError === "conflict" && (
					<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
						<p className="text-rose-900">
							Ten egzamin już trwa w innej karcie — dokończ go tam albo odśwież tę stronę.
						</p>
						<Button
							type="button"
							variant="outline"
							className="mt-3"
							onClick={() => router.refresh()}
						>
							Odśwież
						</Button>
					</div>
				)}
				{startError === "network" && (
					<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
						<p className="text-rose-900">Nie udało się rozpocząć egzaminu. Spróbuj ponownie.</p>
						<div className="mt-3 flex items-center gap-2">
							<Button type="button" onClick={start} disabled={starting}>
								{starting ? "Rozpoczynam…" : "Spróbuj ponownie"}
							</Button>
							<Button asChild variant="ghost">
								<Link href={backHref}>Wróć do modułu</Link>
							</Button>
						</div>
					</div>
				)}

				{startError === null && (
					<div>
						<Button type="button" size="lg" onClick={start} disabled={starting}>
							{starting ? "Rozpoczynam…" : "Rozpocznij egzamin"}
						</Button>
					</div>
				)}
			</div>
		);
	}

	// ── Ekran 4: wynik (W1/W2/W3) ──
	if (phase === "result" && result) {
		return (
			<ExamResultView
				result={result}
				moduleTitle={moduleTitle}
				backHref={backHref}
				retryHref={retryHref}
			/>
		);
	}

	// ── Ekran 3: domykanie (R5) + błąd domknięcia (R6) ──
	if (phase === "closing") {
		return (
			<section className="rounded-xl border border-border bg-card p-5">
				<h2 className="text-base font-semibold text-foreground">To były wszystkie pytania</h2>
				<p className="mt-1 text-sm text-muted-foreground">Nie ma powrotu do poprzednich.</p>
				{completeError && (
					<p role="alert" className="mt-3 text-sm text-rose-700">
						Nie udało się zapisać wyniku. Twoje odpowiedzi są bezpieczne — zapisywały się na
						bieżąco. Spróbuj ponownie.
					</p>
				)}
				<Button type="button" className="mt-4" onClick={complete} disabled={completing}>
					{completing ? "Kończę…" : "Zakończ egzamin i zobacz wynik"}
				</Button>
			</section>
		);
	}

	// ── Ekran 3: pytanie bieżące (R1/R2) + błędy R3/R4 ──
	if (phase === "running" && question) {
		const isLast = question.position === total - 1;
		return (
			<section className="rounded-xl border border-border bg-card p-5">
				{showResume && (
					<output className="mb-4 block rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
						Wracasz do egzaminu — kontynuujesz od pytania, na którym skończyłeś(-aś).
					</output>
				)}

				<div className="flex items-center justify-between gap-3">
					<h2
						ref={questionHeadingRef}
						tabIndex={-1}
						className="text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						Pytanie {question.position + 1} z {total}
					</h2>
				</div>
				<div
					className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
					aria-valuenow={question.position + 1}
					aria-valuemin={1}
					aria-valuemax={total}
					aria-label={`Pytanie ${question.position + 1} z ${total}`}
				>
					<div
						className="h-full rounded-full bg-sky-500"
						style={{ width: `${total > 0 ? ((question.position + 1) / total) * 100 : 0}%` }}
					/>
				</div>

				<p className="mt-4 text-sm font-medium text-foreground">{question.stem}</p>

				<div className="mt-4 flex flex-col gap-2">
					{question.options.map((option, i) => (
						<label
							key={option}
							className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
								selected === i
									? "border-sky-400 bg-sky-50"
									: "border-border bg-background hover:border-sky-200"
							}`}
						>
							<input
								type="radio"
								name={`exam-q-${question.slotRef}`}
								className="mt-0.5"
								checked={selected === i}
								onChange={() => setSelected(i)}
							/>
							<span className="text-foreground">{option}</span>
						</label>
					))}
				</div>

				<p className="mt-4 text-sm text-muted-foreground">
					Odpowiedzi nie oceniamy pytanie po pytaniu — wynik zobaczysz na końcu.
				</p>

				{answerError === "network" && (
					<p role="alert" className="mt-3 text-sm text-rose-700">
						Nie udało się zapisać odpowiedzi. Twój wybór został — spróbuj ponownie.
					</p>
				)}
				{answerError === "conflict" && (
					<div
						role="alert"
						className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm"
					>
						<p className="text-rose-900">
							Coś się rozjechało z kolejnością pytań (np. otwarta druga karta). Odśwież stronę —
							wrócisz dokładnie tam, gdzie byłeś(-aś).
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-2"
							onClick={() => router.refresh()}
						>
							Odśwież
						</Button>
					</div>
				)}

				<div className="mt-4">
					<Button type="button" onClick={submit} disabled={selected === undefined || answering}>
						{answering ? "Zapisuję…" : isLast ? "Zakończ egzamin" : "Dalej"}
					</Button>
				</div>
			</section>
		);
	}

	// Stan przejściowy (np. running bez pytania) — nic do pokazania.
	return null;
}

/** Błąd startu bez retry (S2) — ponowienie da identyczny 422, więc tylko powrót. */
function StartErrorNoRetry({
	backHref,
	children,
}: {
	backHref: string;
	children: React.ReactNode;
}) {
	return (
		<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
			<p className="text-rose-900">{children}</p>
			<Button asChild variant="outline" className="mt-3">
				<Link href={backHref}>Wróć do modułu</Link>
			</Button>
		</div>
	);
}

/** Ekran 4 — wynik: W1 zdany / W2 oblany z retry / W3 oblany cap-2 (correctives). */
function ExamResultView({
	result,
	moduleTitle,
	backHref,
	retryHref,
}: {
	result: ExamResultJson;
	moduleTitle: string;
	backHref: string;
	retryHref: string;
}) {
	// W1 — zdany (emerald: sukces ostateczny).
	if (result.passed) {
		return (
			<section
				aria-labelledby="exam-result-heading"
				className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
			>
				<h2
					id="exam-result-heading"
					className="flex items-center gap-2 text-base font-semibold text-emerald-900"
				>
					<CheckCircle2 aria-hidden className="size-5" />
					Zdałeś(-aś) egzamin modułu „{moduleTitle}"
				</h2>
				<p className="mt-1 text-sm text-emerald-900">
					Błędnych odpowiedzi: {result.errorCount} z {result.questionCount} (próg:{" "}
					{result.maxErrors}
					). Kolejny moduł jest już otwarty.
				</p>
				<Button asChild className="mt-4">
					<Link href="/curriculum">Wróć do ścieżki nauki</Link>
				</Button>
			</section>
		);
	}

	// W3 — oblany po wyczerpaniu cap 2: correctives OBOWIĄZKOWE (Ekran 5), bez retry.
	// CorrectivesPanel niesie już nagłówek „Czas na uzupełnienie materiału" + message
	// (Mila 6.3 = wejście w Ekran 5) — bez duplikatu wrappera.
	if (result.correctives && result.correctivesPackage) {
		return <CorrectivesPanel pkg={result.correctivesPackage} backHref={backHref} />;
	}

	// W2 — oblany, jest jeszcze podejście (XCircle muted, NIE rose: to nie ostatnia szansa).
	// Sophia D5.10.2: N = errorCount − maxErrors, człon „do zaliczenia" obowiązkowy
	// (spójne z buildCorrectivesMessage W3). Całe zdanie jako jeden string (jeden węzeł).
	// pytaniaPoZabraklo już zawiera liczbę (np. „1 pytania") — jak backendowy
	// buildCorrectivesMessage; NIE prependuj liczby drugi raz.
	const missing = distanceToPass(result.errorCount, result.maxErrors);
	const w2Copy = `Zabrakło Ci ${pytaniaPoZabraklo(missing)} do zaliczenia. Masz jeszcze jedno podejście — z innym zestawem pytań na ten sam temat.`;
	return (
		<section
			aria-labelledby="exam-result-heading"
			className="rounded-xl border border-border bg-card p-5"
		>
			<h2
				id="exam-result-heading"
				className="flex items-center gap-2 text-base font-semibold text-foreground"
			>
				<XCircle aria-hidden className="size-5 text-muted-foreground" />
				Nie tym razem
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">{w2Copy}</p>
			<div className="mt-4 flex items-center gap-2">
				<Button asChild>
					<Link href={retryHref}>Spróbuj ponownie</Link>
				</Button>
				<Button asChild variant="ghost">
					<Link href={backHref}>Wróć do modułu</Link>
				</Button>
			</div>
		</section>
	);
}
