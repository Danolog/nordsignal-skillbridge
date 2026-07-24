"use client";

import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * C11/1.14 — panel czatu tutora sokratycznego w widoku projektu.
 *
 * Konsumuje endpoint 1.13 (`/api/projects/[id]/tutor`): GET = rehydracja
 * historii (rozmowa żyje w tutor_turns, nie w stanie klienta), POST = tura
 * BLOKUJĄCA (sędzia ocenia całość zanim student zobaczy — stąd spinner,
 * nie streaming). Renderowany TYLKO gdy server component przekaże flagę
 * `socraticTutor` (rejestr flag nie wycieka do bundla klienta).
 *
 * Kontrakty backendu odwzorowane w stanach:
 *  - {crisis:true}  → statyczny komunikat wsparcia (model NIE był wołany,
 *    tura NIE jest utrwalona — zdejmujemy optymistyczny dymek studenta),
 *  - 409            → limit rozmowy dla projektu wyczerpany (pole znika),
 *  - 429            → rate-limit (wiadomość wraca do pola, toast),
 *  - 5xx            → błąd przejściowy (wiadomość wraca do pola, toast).
 */

export type TutorTurn = { role: "ai" | "user"; content: string };

const TUTOR_CRISIS_MESSAGE =
	"Twoje samopoczucie jest ważniejsze niż każdy projekt. Jeśli to dla Ciebie trudny moment, " +
	"skontaktuj się z osobą, która Cię wesprze, albo zadzwoń pod 116 123 " +
	"(Telefon Zaufania dla dorosłych w kryzysie). Ten komunikat jest stały — AI go nie generuje.";

export function TutorPanel({ projectId }: { projectId: string }) {
	const [messages, setMessages] = useState<TutorTurn[]>([]);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [rehydrated, setRehydrated] = useState(false);
	const [turnsUsed, setTurnsUsed] = useState(0);
	const [maxTurns, setMaxTurns] = useState<number | null>(null);
	const [limitReached, setLimitReached] = useState(false);
	const [crisis, setCrisis] = useState(false);

	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Rehydracja historii z bazy (GET). Błąd = pusty start, panel dalej działa.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`/api/projects/${projectId}/tutor`);
				if (!res.ok) return;
				const data = (await res.json()) as {
					turns: TutorTurn[];
					turnsUsed: number;
					maxTurns: number;
				};
				if (cancelled) return;
				setMessages(data.turns.map((t) => ({ role: t.role, content: t.content })));
				setTurnsUsed(data.turnsUsed);
				setMaxTurns(data.maxTurns);
				if (data.turnsUsed >= data.maxTurns) setLimitReached(true);
			} catch {
				/* offline / błąd — start z pustą rozmową */
			} finally {
				if (!cancelled) setRehydrated(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [projectId]);

	// Auto-scroll na dół przy nowej wiadomości (guard „blisko dołu" jak w Pomocniku:
	// nie ściągamy studenta, który przewinął w górę czytać historię).
	const messageCount = messages.length;
	useEffect(() => {
		const el = scrollRef.current;
		if (!el || messageCount === 0) return;
		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
		if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
	}, [messageCount]);

	// A11y (WCAG 2.4.3): po zakończeniu tury (sending: true→false) fokus wraca do
	// pola, by student pisał dalej z klawiatury bez sięgania po mysz. Fokus MUSI
	// odpalić się PO commit — textarea jest disabled dopóki sending=true, a
	// focus() na disabled to no-op (fokus uciekał wtedy do <body>). Efekt biegnie
	// po przerenderowaniu, więc pole jest już aktywne. Nie odpala na mount ani gdy
	// pole zniknęło (limit) — wtedy inputRef jest pusty.
	const wasSending = useRef(false);
	useEffect(() => {
		if (wasSending.current && !sending && !limitReached && !crisis) {
			inputRef.current?.focus();
		}
		wasSending.current = sending;
	}, [sending, limitReached, crisis]);

	const handleSend = useCallback(async () => {
		const message = input.trim();
		if (message.length === 0 || sending || limitReached) return;

		// Optymistyczny dymek studenta; przy crisis/429/5xx zdejmowany (tura nie
		// została utrwalona — rehydracja nie może pokazać czegoś innego niż my).
		setMessages((prev) => [...prev, { role: "user", content: message }]);
		setInput("");
		setSending(true);
		try {
			const res = await fetch(`/api/projects/${projectId}/tutor`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ message }),
			});

			if (res.status === 409) {
				setMessages((prev) => prev.slice(0, -1));
				// B7/1.16b: 409 ma dwa źródła — limit tury (body niesie maxTurns)
				// albo blokada na czas otwartej obrony (ADR-013 D2.2). Blokada jest
				// przejściowa: wiadomość wraca do pola, panel NIE udaje limitu.
				const body = (await res.json().catch(() => null)) as {
					error?: string;
					maxTurns?: number;
				} | null;
				if (body && typeof body.maxTurns === "number") {
					setLimitReached(true);
				} else {
					setInput(message);
					toast.info(
						body?.error ?? "Trwa obrona ustna tego projektu — tutor wróci po jej zakończeniu.",
					);
				}
				return;
			}
			if (res.status === 429) {
				setMessages((prev) => prev.slice(0, -1));
				setInput(message);
				toast.error("Za dużo wiadomości — daj tutorowi chwilę i spróbuj ponownie.");
				return;
			}
			if (!res.ok) throw new Error("tutor_failed");

			const data = (await res.json()) as {
				crisis?: boolean;
				reply?: string;
				turnsUsed?: number;
				maxTurns?: number;
			};
			if (data.crisis) {
				setMessages((prev) => prev.slice(0, -1));
				setCrisis(true);
				return;
			}
			if (typeof data.reply === "string") {
				setMessages((prev) => [...prev, { role: "ai", content: data.reply as string }]);
				if (typeof data.turnsUsed === "number") setTurnsUsed(data.turnsUsed);
				if (typeof data.maxTurns === "number") setMaxTurns(data.maxTurns);
				if (
					typeof data.turnsUsed === "number" &&
					typeof data.maxTurns === "number" &&
					data.turnsUsed >= data.maxTurns
				) {
					setLimitReached(true);
				}
			}
		} catch {
			setMessages((prev) => prev.slice(0, -1));
			setInput(message);
			toast.error("Tutor chwilowo niedostępny. Spróbuj ponownie za chwilę.");
		} finally {
			setSending(false);
			// Fokus wraca do pola po commit (useEffect na `sending` wyżej) — focus()
			// tutaj trafiał w disabled textarea (sending jeszcze true) i uciekał do <body>.
		}
	}, [input, sending, limitReached, projectId]);

	return (
		<div className="proj-detail-section tutor-panel">
			<h2 className="proj-detail-section-title tutor-panel-title">
				<MessageCircleQuestion size={20} />
				Tutor projektu
			</h2>
			<p className="tutor-panel-subtitle">
				Naprowadza pytaniami i wskazówkami — nie podaje gotowych rozwiązań. Twoja praca pozostaje
				Twoim dowodem kompetencji.
				{maxTurns !== null && (
					<span className="tutor-panel-counter">
						{" "}
						({turnsUsed}/{maxTurns} odpowiedzi)
					</span>
				)}
			</p>

			<div
				ref={scrollRef}
				role="log"
				aria-live="polite"
				aria-relevant="additions"
				aria-busy={sending}
				className="tutor-messages"
			>
				{!rehydrated && (
					<p className="tutor-empty">
						<Loader2 size={14} className="animate-spin" /> Wczytuję rozmowę…
					</p>
				)}
				{rehydrated && messages.length === 0 && (
					<p className="tutor-empty">
						Utknąłeś? Opisz, co już próbowałeś i w którym miejscu się zacięło.
					</p>
				)}
				{messages.map((m, i) => (
					<div key={`${m.role}-${i}`} className={`tutor-msg tutor-msg-${m.role}`}>
						<span className="tutor-msg-author">{m.role === "ai" ? "Tutor" : "Ty"}</span>
						<p className="tutor-msg-content">{m.content}</p>
					</div>
				))}
				{sending && (
					<div className="tutor-msg tutor-msg-ai">
						<span className="tutor-msg-author">Tutor</span>
						<p className="tutor-msg-content tutor-msg-typing">
							<Loader2 size={14} className="animate-spin" /> Tutor myśli…
						</p>
					</div>
				)}
			</div>

			{crisis && (
				<div role="alert" className="tutor-crisis">
					{TUTOR_CRISIS_MESSAGE}
				</div>
			)}

			{limitReached ? (
				<output className="tutor-limit">
					Limit rozmowy z tutorem dla tego projektu został wyczerpany
					{maxTurns !== null ? ` (${maxTurns} odpowiedzi)` : ""}. Dalej pracujesz samodzielnie —
					brief i rubryka zostają do wglądu wyżej.
				</output>
			) : (
				<div className="tutor-input-row">
					<textarea
						ref={inputRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						maxLength={4000}
						rows={2}
						disabled={sending}
						placeholder={sending ? "Tutor odpowiada…" : "Napisz, nad czym utknąłeś…"}
						aria-label="Wiadomość do tutora"
						className="tutor-input"
					/>
					<button
						type="button"
						onClick={handleSend}
						disabled={sending || input.trim().length === 0}
						aria-label="Wyślij wiadomość do tutora"
						className="tutor-send-btn"
					>
						{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
						Wyślij
					</button>
				</div>
			)}
		</div>
	);
}
