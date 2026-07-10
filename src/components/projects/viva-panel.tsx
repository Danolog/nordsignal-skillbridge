"use client";

import { Clock, Loader2, RotateCcw, ShieldCheck, ShieldQuestion, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * B7/1.16b (ADR-013 D4) — obrona ustna pracy w widoku projektu.
 *
 * Konsumuje trasy 1.16a:
 *  - GET  /api/submissions/[id]/viva              → rehydracja stanu,
 *  - POST /api/submissions/[id]/viva/start        → start/wznowienie/restart,
 *  - POST /api/submissions/[id]/viva/[sid]/answer → odpowiedź (sędzia blokująco).
 *
 * Zasady odwzorowane ze silnika (nie do wymyślenia w UI):
 *  - pytanie po pytaniu, ZERO feedbacku w trakcie — werdykty dopiero w wyniku,
 *  - kolejność egzekwuje serwer (position = liczba zapisanych odpowiedzi),
 *  - TTL 60 min od startu, sesja wznawialna w oknie (refresh nie karze),
 *  - expired z 0 odpowiedzi → student sam restartuje na TYCH SAMYCH pytaniach,
 *  - {crisis:true} → statyczny komunikat wsparcia, odpowiedź NIEZAPISANA
 *    (zostaje w polu — student może wrócić),
 *  - stany końcowe: passed (kredencjał), failed/inconclusive (człowiek),
 *    superseded (decyzja recenzenta / nowa wersja pracy).
 *
 * Renderowany TYLKO gdy server component przekaże flagę `vivaDefense`
 * (rejestr flag nie wycieka do bundla klienta). Brak sesji (state null,
 * np. zgłoszenie sprzed zapalenia flagi) = panel nie istnieje w drzewie.
 */

type VivaQuestionPayload = { position: number; question: string; filePath?: string };
type VivaResultPayload = { totalPoints: number; maxPoints: number; passThreshold: number };

export type VivaPanelState = {
	state: string | null;
	sessionId: string | null;
	position: number;
	totalQuestions: number;
	question: VivaQuestionPayload | null;
	expiresAt: string | null;
	result: VivaResultPayload | null;
	restartable: boolean;
};

/** Kontrakt POST /answer — następne pytanie albo rozstrzygnięcie. */
type VivaAnswerResponse = {
	crisis?: boolean;
	state?: string;
	position?: number;
	question?: VivaQuestionPayload;
	result?: VivaResultPayload;
	restartable?: boolean;
	error?: string;
};

const VIVA_ANSWER_MAX_LEN = 2000;

const VIVA_CRISIS_MESSAGE =
	"Twoje samopoczucie jest ważniejsze niż każda obrona. Jeśli to dla Ciebie trudny moment, " +
	"skontaktuj się z osobą, która Cię wesprze, albo zadzwoń pod 116 123 " +
	"(Telefon Zaufania dla dorosłych w kryzysie). Odpowiedź nie została zapisana — możesz " +
	"wrócić do obrony, kiedy będziesz gotowy.";

/** m:ss z milisekund; ujemne = 0:00 (serwer i tak rozstrzyga leniwie). */
function formatRemaining(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function VivaPanel({ submissionId }: { submissionId: string }) {
	const router = useRouter();
	const [viva, setViva] = useState<VivaPanelState | null>(null);
	const [rehydrated, setRehydrated] = useState(false);
	const [busy, setBusy] = useState(false);
	const [answer, setAnswer] = useState("");
	const [crisis, setCrisis] = useState(false);
	// Tick licznika czasu — przeliczany co sekundę, gdy sesja biegnie.
	const [now, setNow] = useState(() => Date.now());
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const refetch = useCallback(async () => {
		try {
			const res = await fetch(`/api/submissions/${submissionId}/viva`);
			if (!res.ok) return; // 404 = flaga off / brak zgłoszenia — panel znika.
			setViva((await res.json()) as VivaPanelState);
		} catch {
			/* offline — zostaje poprzedni stan */
		}
	}, [submissionId]);

	// Rehydracja stanu obrony (sesja żyje w viva_sessions, nie w kliencie).
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`/api/submissions/${submissionId}/viva`);
				if (!res.ok || cancelled) return;
				const data = (await res.json()) as VivaPanelState;
				if (!cancelled) setViva(data);
			} catch {
				/* offline / błąd — panel się nie renderuje */
			} finally {
				if (!cancelled) setRehydrated(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [submissionId]);

	// Licznik czasu tylko przy biegnącej sesji; przy zerze pytamy serwer —
	// leniwe expiry rozstrzyga (expired → restart / inconclusive → człowiek).
	const running = viva?.state === "in_progress" && viva.expiresAt !== null;
	const expiresAtMs = running && viva?.expiresAt ? new Date(viva.expiresAt).getTime() : null;
	useEffect(() => {
		if (!running) return;
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [running]);
	const remainingMs = expiresAtMs !== null ? expiresAtMs - now : null;
	useEffect(() => {
		if (remainingMs !== null && remainingMs <= 0) void refetch();
	}, [remainingMs, refetch]);

	// Start / wznowienie / restart po expired — jedna trasa, serwer rozstrzyga.
	const handleStart = useCallback(async () => {
		if (busy) return;
		setBusy(true);
		try {
			const res = await fetch(`/api/submissions/${submissionId}/viva/start`, { method: "POST" });
			if (res.status === 429) {
				toast.error("Za dużo prób — odczekaj chwilę i spróbuj ponownie.");
				return;
			}
			const data = (await res.json().catch(() => null)) as
				| (Partial<VivaPanelState> & { error?: string })
				| null;
			if (res.status === 409) {
				// Stan uciekł (decyzja człowieka / expiry w trakcie) — pokaż prawdę z GET.
				if (data?.error) toast.error(data.error);
				await refetch();
				return;
			}
			if (!res.ok || !data) throw new Error("viva_start_failed");
			setViva(data as VivaPanelState);
			setCrisis(false);
		} catch {
			toast.error("Nie udało się rozpocząć obrony. Spróbuj ponownie.");
		} finally {
			setBusy(false);
			inputRef.current?.focus();
		}
	}, [busy, submissionId, refetch]);

	const handleAnswer = useCallback(async () => {
		const content = answer.trim();
		if (content.length === 0 || busy) return;
		if (!viva || viva.state !== "in_progress" || !viva.sessionId) return;
		setBusy(true);
		setCrisis(false);
		try {
			const res = await fetch(`/api/submissions/${submissionId}/viva/${viva.sessionId}/answer`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ answer: content }),
			});
			if (res.status === 429) {
				toast.error("Za dużo odpowiedzi w krótkim czasie — odczekaj chwilę.");
				return;
			}
			const data = (await res.json().catch(() => null)) as VivaAnswerResponse | null;
			if (res.status === 409) {
				// Sesja uciekła (TTL w trakcie / stan końcowy) — prawda z serwera.
				if (data?.error) toast.error(data.error);
				await refetch();
				return;
			}
			if (!res.ok || !data) throw new Error("viva_answer_failed");

			// Kryzys: odpowiedź NIEZAPISANA (zostaje w polu), sesja bez zmian.
			if (data.crisis) {
				setCrisis(true);
				return;
			}

			if (data.state === "in_progress" && data.question) {
				// Przyjęto + następne pytanie (zero feedbacku w trakcie — ADR-013 D2.2).
				setAnswer("");
				setViva((prev) =>
					prev
						? {
								...prev,
								state: "in_progress",
								position: data.position ?? prev.position,
								question: data.question ?? null,
							}
						: prev,
				);
				inputRef.current?.focus();
				return;
			}

			// Rozstrzygnięcie: passed / failed / inconclusive.
			setAnswer("");
			setViva((prev) =>
				prev
					? {
							...prev,
							state: data.state ?? prev.state,
							position: data.position ?? prev.position,
							question: null,
							result: data.result ?? null,
						}
					: prev,
			);
			if (data.state === "passed") {
				// Status zgłoszenia zmienił się na 'verified' — odśwież server
				// components (status, callout refleksji B5) bez przeładowania.
				router.refresh();
			}
		} catch {
			toast.error("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
		} finally {
			setBusy(false);
		}
	}, [answer, busy, viva, submissionId, refetch, router]);

	// Brak sesji = obrona nie dotyczy tego zgłoszenia — panel nie istnieje.
	if (!rehydrated || viva === null || viva.state === null) return null;

	return (
		<div className="proj-detail-section viva-panel">
			<h2 className="proj-detail-section-title viva-panel-title">
				<ShieldQuestion size={20} />
				Obrona ustna pracy
			</h2>

			{viva.state === "pending" && (
				<div className="viva-banner">
					<p className="viva-banner-lead">
						Twoja praca została oceniona pozytywnie. Zanim otrzymasz kredencjał, obroń ją w krótkiej
						rozmowie — kredencjał „Zweryfikowany projekt" przyznajemy{" "}
						<strong>po zdanej obronie</strong>.
					</p>
					<ul className="viva-rules">
						<li>{viva.totalQuestions} pytania o konkretne decyzje w Twojej pracy.</li>
						<li>60 minut od startu — możesz przerwać i wrócić w tym oknie.</li>
						<li>Bez podpowiedzi w trakcie: wynik zobaczysz po ostatniej odpowiedzi.</li>
					</ul>
					<button type="button" onClick={handleStart} disabled={busy} className="viva-primary-btn">
						{busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldQuestion size={16} />}
						Rozpocznij obronę
					</button>
				</div>
			)}

			{viva.state === "in_progress" && (
				<div className="viva-question-block">
					<div className="viva-progress-row">
						<span className="viva-progress-label">
							Pytanie {Math.min(viva.position + 1, viva.totalQuestions)} z {viva.totalQuestions}
						</span>
						{remainingMs !== null && (
							<span
								role="timer"
								className={`viva-timer${remainingMs < 5 * 60_000 ? " viva-timer-low" : ""}`}
								aria-label="Pozostały czas obrony"
							>
								<Clock size={14} />
								{formatRemaining(remainingMs)}
							</span>
						)}
					</div>

					{viva.question ? (
						<>
							<p className="viva-question-text">{viva.question.question}</p>
							{viva.question.filePath && (
								<p className="viva-question-file">Dotyczy: {viva.question.filePath}</p>
							)}
							{crisis && (
								<div role="alert" className="viva-crisis">
									{VIVA_CRISIS_MESSAGE}
								</div>
							)}
							<textarea
								ref={inputRef}
								value={answer}
								onChange={(e) => setAnswer(e.target.value)}
								maxLength={VIVA_ANSWER_MAX_LEN}
								rows={5}
								disabled={busy}
								placeholder="Odpowiedz własnymi słowami — liczy się Twoje rozumowanie, nie forma."
								aria-label="Odpowiedź na pytanie obrony"
								className="viva-input"
							/>
							<div className="viva-answer-row">
								<span className="viva-answer-counter">
									{answer.length}/{VIVA_ANSWER_MAX_LEN}
								</span>
								<button
									type="button"
									onClick={handleAnswer}
									disabled={busy || answer.trim().length === 0}
									aria-label="Wyślij odpowiedź obrony"
									className="viva-primary-btn"
								>
									{busy ? <Loader2 size={16} className="animate-spin" /> : null}
									{busy ? "Zapisuję odpowiedź…" : "Wyślij odpowiedź"}
								</button>
							</div>
						</>
					) : (
						// Wznowiona sesja może chwilowo nie mieć pytania w stanie klienta.
						<button type="button" onClick={() => void refetch()} className="viva-secondary-btn">
							<RotateCcw size={14} /> Odśwież pytanie
						</button>
					)}
				</div>
			)}

			{viva.state === "passed" && (
				<output className="viva-outcome viva-outcome-passed">
					<ShieldCheck size={18} />
					<span>
						<strong>Obrona zdana</strong>
						{viva.result ? ` — ${viva.result.totalPoints}/${viva.result.maxPoints} pkt` : ""}.
						Kredencjał „Zweryfikowany projekt" został przyznany — zobaczysz go w paszporcie.
					</span>
				</output>
			)}

			{viva.state === "failed" && (
				<output className="viva-outcome viva-outcome-failed">
					<Users size={18} />
					<span>
						<strong>Obrona niezaliczona</strong>
						{viva.result
							? ` — ${viva.result.totalPoints}/${viva.result.maxPoints} pkt (próg: ${viva.result.passThreshold})`
							: ""}
						. Zgłoszenie trafiło do recenzji człowieka — ostateczną decyzję podejmie recenzent.
					</span>
				</output>
			)}

			{viva.state === "inconclusive" && (
				<output className="viva-outcome viva-outcome-mid">
					<Users size={18} />
					<span>
						Obrony nie udało się rozstrzygnąć automatycznie. Zgłoszenie czeka na recenzję człowieka
						— nic więcej nie musisz robić.
					</span>
				</output>
			)}

			{viva.state === "expired" && (
				<div className="viva-banner">
					<p className="viva-banner-lead">
						Czas obrony minął, zanim padła pierwsza odpowiedź.
						{viva.restartable ? " Możesz zacząć ponownie — pytania pozostają te same." : ""}
					</p>
					{viva.restartable && (
						<button
							type="button"
							onClick={handleStart}
							disabled={busy}
							className="viva-primary-btn"
						>
							{busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
							Rozpocznij ponownie
						</button>
					)}
				</div>
			)}

			{viva.state === "superseded" && (
				<output className="viva-outcome viva-outcome-mid">
					Ta obrona jest już nieaktualna — zgłoszenie rozstrzygnął recenzent albo oddana została
					nowa wersja pracy.
				</output>
			)}
		</div>
	);
}
